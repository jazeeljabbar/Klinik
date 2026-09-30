"""
In-memory Firestore mock for isolated local unit and concurrency testing.
Provides deterministic, fast, offline simulation of Firestore transactions,
document references, and queries without external network calls.
Faithfully reflects Google Cloud Firestore SDK contracts:
- tx.get(ref) returns an iterator/generator of DocumentSnapshots
- ref.get(transaction=tx) returns a single DocumentSnapshot
- Transactions buffer mutations until _commit(), detecting OCC conflicts
- _commit() raises google.api_core.exceptions.Aborted on conflict
- _rollback() discards buffered mutations
"""
from datetime import datetime, timezone
from google.api_core.exceptions import Aborted

class InMemoryDocSnapshot:
    def __init__(self, doc_id, data=None):
        self.id = str(doc_id) if doc_id is not None else None
        self._data = dict(data) if data is not None else None

    @property
    def exists(self):
        return self._data is not None

    def to_dict(self):
        return dict(self._data) if self._data is not None else None

    def __bool__(self):
        return True

class InMemoryDocRef:
    def __init__(self, doc_id, store=None, collection=None):
        self.id = str(doc_id)
        self._store = store if store is not None else {}
        self._collection = collection
        self.reference = self
        self.update_calls = []
        self.delete_calls = []

    @property
    def exists(self):
        return self._store.get(self.id) is not None

    def to_dict(self):
        data = self._store.get(self.id)
        return dict(data) if data is not None else None

    def get(self, transaction=None):
        data = self._store.get(self.id)
        if transaction is not None:
            # Record read version for OCC conflict detection
            transaction.read_versions[(id(self._store), self.id)] = (
                self._store,
                self._store.get(f"__ver_{self.id}", 0)
            )
        return InMemoryDocSnapshot(self.id, data)

    def set(self, data):
        self._store[self.id] = dict(data)
        self._store[f"__ver_{self.id}"] = self._store.get(f"__ver_{self.id}", 0) + 1

    def update(self, data):
        self.update_calls.append(data)
        if self.id in self._store and self._store[self.id] is not None:
            self._store[self.id].update(data)
        else:
            self._store[self.id] = dict(data)
        self._store[f"__ver_{self.id}"] = self._store.get(f"__ver_{self.id}", 0) + 1

    def delete(self):
        self.delete_calls.append(True)
        self._store[self.id] = None
        self._store[f"__ver_{self.id}"] = self._store.get(f"__ver_{self.id}", 0) + 1

    def __bool__(self):
        return True

    def __str__(self):
        return self.id

class InMemoryTransaction:
    _max_attempts = 5
    _read_only = False
    _id = b"in_memory_tx"

    def __init__(self, store=None):
        self._max_attempts = 5
        self._read_only = False
        self._id = b"in_memory_tx"
        self.store = store if store is not None else {}
        self.read_versions = {}
        self._writes = []
        self.updates = []
        self.deletes = []
        self.sets = []

    def _begin(self, retry_id=None):
        self._clean_up()

    def _clean_up(self):
        self.read_versions.clear()
        self._writes.clear()

    def _rollback(self):
        self._writes.clear()

    def _commit(self):
        # 1. Optimistic Concurrency Control (OCC) conflict check
        for (store_id, doc_id), (store, read_ver) in self.read_versions.items():
            curr_ver = store.get(f"__ver_{doc_id}", 0)
            if curr_ver != read_ver:
                raise Aborted(
                    f"OCC Conflict on document {doc_id}: read version {read_ver} does not match current version {curr_ver}."
                )

        # 2. Atomically apply buffered mutations
        for item in self._writes:
            op = item[0]
            ref = item[1]
            doc_id = getattr(ref, "id", None) or str(ref)
            target_store = getattr(ref, "_store", self.store)
            if op == 'update':
                fields = item[2]
                if doc_id in target_store and target_store[doc_id] is not None:
                    target_store[doc_id].update(fields)
                else:
                    target_store[doc_id] = dict(fields)
            elif op == 'set':
                fields = item[2]
                target_store[doc_id] = dict(fields)
            elif op == 'delete':
                target_store[doc_id] = None
            target_store[f"__ver_{doc_id}"] = target_store.get(f"__ver_{doc_id}", 0) + 1

        self._writes.clear()

    def get(self, ref):
        """
        In the real Firestore Python SDK, Transaction.get(ref) returns a generator/iterator
        yielding DocumentSnapshots, NOT a single DocumentSnapshot.
        """
        doc_id = getattr(ref, "id", None) or str(ref)
        target_store = getattr(ref, "_store", self.store)
        data = target_store.get(doc_id)
        self.read_versions[(id(target_store), doc_id)] = (
            target_store,
            target_store.get(f"__ver_{doc_id}", 0)
        )
        def _generator():
            yield InMemoryDocSnapshot(doc_id, data)
        return _generator()

    def update(self, ref, fields):
        self.updates.append((ref, fields))
        self._writes.append(('update', ref, dict(fields)))

    def delete(self, ref):
        self.deletes.append(ref)
        self._writes.append(('delete', ref))

    def set(self, ref, fields):
        self.sets.append((ref, fields))
        self._writes.append(('set', ref, dict(fields)))

    def __bool__(self):
        return True

class InMemoryQuery:
    def __init__(self, collection, filters=None, limit_count=None):
        self._collection = collection
        self._filters = list(filters or [])
        self._limit_count = limit_count

    def limit(self, count):
        return InMemoryQuery(self._collection, self._filters, count)

    def where(self, field, op, val):
        new_filters = list(self._filters)
        new_filters.append((field, op, val))
        return InMemoryQuery(self._collection, new_filters, self._limit_count)

    def get(self):
        store = self._collection.get_store()
        matches = []
        for k, v in store.items():
            if k.startswith("__ver_") or v is None:
                continue
            match = True
            for field, op, val in self._filters:
                if op == "==" and v.get(field) != val:
                    match = False
                    break
            if match:
                matches.append(InMemoryDocRef(k, store, collection=self._collection))
                if self._limit_count and len(matches) >= self._limit_count:
                    break
        return matches

    def __bool__(self):
        return True

class InMemoryCollection:
    def __init__(self, name, db):
        self._name = name
        self._db = db

    def get_store(self):
        return self._db.get_store(self._name)

    def document(self, doc_id=None):
        if not doc_id:
            import uuid
            doc_id = uuid.uuid4().hex
        store = self.get_store()
        return InMemoryDocRef(doc_id, store, collection=self)

    def limit(self, count):
        return InMemoryQuery(self, limit_count=count)

    def where(self, field, op, val):
        return InMemoryQuery(self, filters=[(field, op, val)])

    def __bool__(self):
        return True

class InMemoryDB:
    def __init__(self, pending_data=None, history_data=None, user_data=None):
        self.stores = {
            "pending_scans": dict(pending_data or {}),
            "histories": dict(history_data or {}),
            "users": dict(user_data or {})
        }
        self.active_transactions = []

    def get_store(self, name):
        if name not in self.stores:
            self.stores[name] = {}
        return self.stores[name]

    def transaction(self):
        tx = InMemoryTransaction(self.get_store("pending_scans"))
        self.active_transactions.append(tx)
        return tx

    def collection(self, name):
        return InMemoryCollection(name, self)

    def __bool__(self):
        return True
