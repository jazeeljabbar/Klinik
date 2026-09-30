#!/usr/bin/env python3
"""
test_emulator_integration.py - Dedicated integration test suite using real Google Cloud Firestore SDK
against a genuine local Firestore emulator.

Invariants verified:
1. Strict loopback-only host enforcement before opening sockets or constructing clients.
2. Isolated project 'demo-klinik-review' with AnonymousCredentials (zero production credential leak).
3. Single-document transactional read contract (ref.get(transaction=tx) returns DocumentSnapshot).
4. Real production promotion function (promote_scan_tx) with valid user ownership and 'claimed_for_deletion' assertion.
5. Coordinated concurrent transaction test (threading.Barrier) exercising live OCC conflict resolution
   between cleanup claim and history promotion, proving mutual exclusion.
"""

import os
import unittest
import uuid
import socket
import threading
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock

# Enforce project ID
TEST_PROJECT_ID = "demo-klinik-review"
EMULATOR_HOST = os.environ.get("FIRESTORE_EMULATOR_HOST")

def is_loopback_host(host_str):
    """Enforce strictly loopback addresses (127.0.0.1, localhost, ::1)."""
    if not host_str:
        return False
    host = host_str.split(":")[0].strip().lower()
    return host in ("127.0.0.1", "localhost", "::1")

def is_emulator_reachable(host_str):
    """Check connectivity only if host is confirmed loopback."""
    if not is_loopback_host(host_str):
        return False
    try:
        parts = host_str.split(":")
        host = parts[0].strip()
        port = int(parts[1]) if len(parts) > 1 else 8080
        with socket.create_connection((host, port), timeout=1.0):
            return True
    except Exception:
        return False

EMULATOR_AVAILABLE = is_emulator_reachable(EMULATOR_HOST)


@unittest.skipUnless(
    EMULATOR_AVAILABLE,
    f"Firestore emulator not reachable on loopback FIRESTORE_EMULATOR_HOST='{EMULATOR_HOST}'. "
    "To verify with genuine emulator outside sandbox, run:\n"
    "  Terminal 1: gcloud emulators firestore start --host-port=127.0.0.1:8080\n"
    "  Terminal 2: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 PYTHONPATH=backend "
    "backend/venv/bin/python -m unittest backend/tests/test_emulator_integration.py -v"
)
class TestFirestoreEmulatorIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not is_loopback_host(EMULATOR_HOST):
            raise unittest.SkipTest(f"Refusing to connect to non-loopback host: {EMULATOR_HOST}")
        
        os.environ["FIRESTORE_EMULATOR_HOST"] = EMULATOR_HOST
        os.environ["GCLOUD_PROJECT"] = TEST_PROJECT_ID
        os.environ["GOOGLE_CLOUD_PROJECT"] = TEST_PROJECT_ID

        from google.cloud import firestore
        import google.auth.credentials

        # Enforce anonymous credentials so no production credentials or ambient cloud configs can be used
        cls.db = firestore.Client(
            project=TEST_PROJECT_ID,
            credentials=google.auth.credentials.AnonymousCredentials()
        )

    def setUp(self):
        self.test_id = str(uuid.uuid4())[:8]
        self.user_id = f"user_{self.test_id}"
        self.pending_col = self.db.collection(f"pending_scans_{self.test_id}")
        self.histories_col = self.db.collection(f"histories_{self.test_id}")

    def tearDown(self):
        # Clean up test documents in emulator
        try:
            for doc in self.pending_col.limit(100).stream():
                doc.reference.delete()
            for doc in self.histories_col.limit(100).stream():
                doc.reference.delete()
        except Exception:
            pass

    def test_emulator_single_doc_transactional_read_contract(self):
        """Verify ref.get(transaction=tx) on genuine emulator returns DocumentSnapshot directly."""
        from google.cloud import firestore
        doc_ref = self.pending_col.document("test_contract_doc")
        doc_ref.set({"status": "pending", "count": 1})

        @firestore.transactional
        def txn_op(tx, ref):
            snap = ref.get(transaction=tx)
            self.assertTrue(hasattr(snap, "exists"), "ref.get(transaction=tx) must return DocumentSnapshot")
            self.assertTrue(snap.exists)
            data = snap.to_dict()
            self.assertEqual(data["status"], "pending")
            tx.update(ref, {"count": data["count"] + 1})
            return data["count"]

        tx = self.db.transaction()
        old_val = txn_op(tx, doc_ref)
        self.assertEqual(old_val, 1)

        updated_snap = doc_ref.get()
        self.assertEqual(updated_snap.to_dict()["count"], 2)

    def test_emulator_mutual_exclusion_cleanup_claim_rejects_promoted(self):
        """Cleanup cannot claim a document that is already promoted."""
        from scripts.cleanup_pending_scans import claim_pending_scan_tx
        from google.cloud import firestore

        scan_id = f"scan_prom_{self.test_id}"
        doc_ref = self.pending_col.document(scan_id)
        doc_ref.set({
            "scan_id": scan_id,
            "user_id": self.user_id,
            "image_path": f"users/{self.user_id}/scans/{scan_id}/original.jpg",
            "status": "promoted",
            "created_at": (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
        })

        tx = self.db.transaction()
        claim_fn = firestore.transactional(claim_pending_scan_tx)
        claim_id = str(uuid.uuid4())
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)

        success, reason, _ = claim_fn(tx, doc_ref, claim_id, cutoff, self.histories_col)
        self.assertFalse(success)
        self.assertEqual(reason, "promoted")

    def test_emulator_mutual_exclusion_promotion_rejects_deleting_state(self):
        """Production promote_scan_tx strictly rejects scans with status='deleting'."""
        from routes.history import promote_scan_tx
        from google.cloud import firestore

        scan_id = f"scan_del_{self.test_id}"
        doc_ref = self.pending_col.document(scan_id)
        doc_ref.set({
            "scan_id": scan_id,
            "user_id": self.user_id,
            "image_path": f"users/{self.user_id}/scans/{scan_id}/original.jpg",
            "status": "deleting",
            "claim_id": str(uuid.uuid4()),
            "claimed_at": datetime.now(timezone.utc).isoformat(),
            "created_at": (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat(),
            "predicted_class": "Mild Acne",
            "confidence": 0.89,
            "severity_index": 20.0
        })

        history_ref = self.histories_col.document(f"hist_{scan_id}")
        tx = self.db.transaction()
        promote_fn = firestore.transactional(promote_scan_tx)

        success, reason, _ = promote_fn(tx, doc_ref, history_ref, self.user_id)

        self.assertFalse(success)
        self.assertEqual(reason, "claimed_for_deletion", "Production promotion must return 'claimed_for_deletion'")
        self.assertFalse(history_ref.get().exists, "History document must not be created")

    def test_emulator_coordinated_concurrent_promotion_vs_cleanup(self):
        """
        Coordinated concurrent transaction test against the live emulator:
        Two concurrent threads execute simultaneously against the exact same document:
        - Thread 1: cleanup worker attempts claim_pending_scan_tx
        - Thread 2: user attempts production promote_scan_tx
        
        Using a threading.Barrier to release both transactions concurrently.
        Assert that:
        1. Exactly ONE operation wins (no double commits, no inconsistent state).
        2. If promotion wins, cleanup fails with reason='promoted' and history doc exists.
        3. If cleanup wins, promotion fails with reason='claimed_for_deletion' and history doc does NOT exist.
        4. State is 100% consistent under real emulator OCC concurrency.
        """
        from scripts.cleanup_pending_scans import claim_pending_scan_tx
        from routes.history import promote_scan_tx
        from google.cloud import firestore

        scan_id = f"scan_race_{self.test_id}"
        doc_ref = self.pending_col.document(scan_id)
        image_path = f"users/{self.user_id}/scans/{scan_id}/original.jpg"

        # Scan is in 'completed' state, past 24h retention cutoff: eligible for both!
        doc_ref.set({
            "scan_id": scan_id,
            "user_id": self.user_id,
            "image_path": image_path,
            "status": "completed",
            "created_at": (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat(),
            "predicted_class": "Moderate Acne",
            "confidence": 0.92,
            "severity_index": 45.0
        })

        history_ref = self.histories_col.document(f"hist_{scan_id}")
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        claim_id = str(uuid.uuid4())

        barrier = threading.Barrier(2)
        results = {}

        def run_cleanup_worker():
            try:
                barrier.wait(timeout=5.0)
                tx = self.db.transaction()
                claim_fn = firestore.transactional(claim_pending_scan_tx)
                success, reason, _ = claim_fn(tx, doc_ref, claim_id, cutoff, self.histories_col)
                results["cleanup"] = (success, reason)
            except Exception as e:
                results["cleanup"] = (False, str(e))

        def run_promotion_worker():
            try:
                barrier.wait(timeout=5.0)
                tx = self.db.transaction()
                promote_fn = firestore.transactional(promote_scan_tx)
                success, reason, _ = promote_fn(tx, doc_ref, history_ref, self.user_id)
                results["promotion"] = (success, reason)
            except Exception as e:
                results["promotion"] = (False, str(e))

        t1 = threading.Thread(target=run_cleanup_worker)
        t2 = threading.Thread(target=run_promotion_worker)

        t1.start()
        t2.start()

        t1.join(timeout=10.0)
        t2.join(timeout=10.0)

        self.assertIn("cleanup", results)
        self.assertIn("promotion", results)

        cleanup_ok, cleanup_reason = results["cleanup"]
        promotion_ok, promotion_reason = results["promotion"]

        # Exactly one must succeed
        self.assertTrue(
            cleanup_ok ^ promotion_ok,
            f"Mutual exclusion violation: cleanup_ok={cleanup_ok} ({cleanup_reason}), "
            f"promotion_ok={promotion_ok} ({promotion_reason})"
        )

        final_pending_snap = doc_ref.get()
        self.assertTrue(final_pending_snap.exists)
        final_status = final_pending_snap.to_dict()["status"]
        history_exists = history_ref.get().exists

        if promotion_ok:
            self.assertEqual(final_status, "promoted")
            self.assertEqual(cleanup_reason, "promoted")
            self.assertTrue(history_exists, "History document must exist when promotion wins")
        else:
            self.assertEqual(final_status, "deleting")
            self.assertEqual(promotion_reason, "claimed_for_deletion")
            self.assertFalse(history_exists, "History document must NOT exist when cleanup wins")


if __name__ == "__main__":
    unittest.main()
