import unittest
from unittest.mock import MagicMock
from datetime import datetime, timezone, timedelta
from google.auth.credentials import AnonymousCredentials
from google.cloud.firestore_v1.client import Client
from google.cloud.firestore_v1.transaction import Transaction
from google.cloud.firestore_v1.document import DocumentReference
from google.cloud.firestore_v1.base_document import DocumentSnapshot
from google.cloud.firestore_v1 import types
import inspect

from scripts.cleanup_pending_scans import (
    claim_pending_scan_tx,
    record_deletion_failure_tx,
    finalize_deletion_tx
)
from app import transition_pending_scan_status

class TestRealFirestoreSDKContract(unittest.TestCase):
    """
    Verifies interaction with the actual Google Cloud Firestore Python SDK classes
    (Transaction, DocumentReference, DocumentSnapshot, Client) with only the gRPC
    transport API mocked.
    
    Guarantees that:
    1. tx.get(ref) returns a generator, NOT a DocumentSnapshot.
    2. ref.get(transaction=tx) returns a single DocumentSnapshot.
    3. Production transaction callbacks use the correct ref.get(transaction=tx) contract.
    """

    def setUp(self):
        self.client = Client(project="test-proj", credentials=AnonymousCredentials())
        self.mock_api = MagicMock()
        self.client._firestore_api_internal = self.mock_api

    def test_tx_get_returns_generator_while_ref_get_returns_snapshot(self):
        """Document the return-type difference between tx.get(ref) and ref.get(transaction=tx)."""
        doc_ref = self.client.collection("pending_scans").document("scan_test_1")
        tx = Transaction(self.client)
        tx._id = b"tx_bytes_123"

        # 1. tx.get(ref) returns a Generator
        res_tx = tx.get(doc_ref)
        self.assertTrue(inspect.isgenerator(res_tx), "tx.get(ref) must be a generator")
        self.assertFalse(hasattr(res_tx, "exists"), "Generator must not have 'exists' attribute")
        with self.assertRaises(AttributeError):
            _ = res_tx.exists

        # 2. Setup mock response for ref.get(transaction=tx)
        resp = types.BatchGetDocumentsResponse()
        resp.found.name = doc_ref._document_path
        resp.found.fields["status"] = types.Value(string_value="pending")
        self.mock_api.batch_get_documents.return_value = iter([resp])

        # ref.get(transaction=tx) returns a DocumentSnapshot
        res_ref = doc_ref.get(transaction=tx)
        self.assertIsInstance(res_ref, DocumentSnapshot)
        self.assertTrue(res_ref.exists)
        self.assertEqual(res_ref.to_dict(), {"status": "pending"})

    def test_claim_pending_scan_tx_with_real_sdk_objects(self):
        """claim_pending_scan_tx succeeds using real DocumentReference and Transaction."""
        scan_id = "scan_real_sdk"
        doc_ref = self.client.collection("pending_scans").document(scan_id)
        tx = Transaction(self.client)
        tx._id = b"tx_bytes_456"

        old_ts = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
        resp = types.BatchGetDocumentsResponse()
        resp.found.name = doc_ref._document_path
        resp.found.fields["scan_id"] = types.Value(string_value=scan_id)
        resp.found.fields["status"] = types.Value(string_value="pending")
        resp.found.fields["created_at"] = types.Value(string_value=old_ts)
        resp.found.fields["image_path"] = types.Value(string_value=f"anonymous/{scan_id}/original.jpg")
        self.mock_api.batch_get_documents.return_value = iter([resp])

        histories_col = MagicMock()
        histories_col.where.return_value.limit.return_value.get.return_value = []
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)

        ok, reason, data = claim_pending_scan_tx(tx, doc_ref, "claim_real_1", cutoff, histories_col)
        self.assertTrue(ok)
        self.assertEqual(reason, "claimed")
        self.assertEqual(data["scan_id"], scan_id)

        # Real SDK Transaction buffers the write in _write_pbs
        self.assertEqual(len(tx._write_pbs), 1)

    def test_record_deletion_failure_and_finalize_with_real_sdk(self):
        """record_deletion_failure_tx and finalize_deletion_tx succeed with real SDK types."""
        scan_id = "scan_real_fail"
        doc_ref = self.client.collection("pending_scans").document(scan_id)
        
        # 1. Failure recording transaction
        tx1 = Transaction(self.client)
        tx1._id = b"tx_bytes_789"

        resp1 = types.BatchGetDocumentsResponse()
        resp1.found.name = doc_ref._document_path
        resp1.found.fields["scan_id"] = types.Value(string_value=scan_id)
        resp1.found.fields["status"] = types.Value(string_value="deleting")
        resp1.found.fields["claim_id"] = types.Value(string_value="claim_valid")
        self.mock_api.batch_get_documents.return_value = iter([resp1])

        ok, reason = record_deletion_failure_tx(tx1, doc_ref, "claim_valid", "GCS Timeout")
        self.assertTrue(ok)
        self.assertEqual(reason, "updated")
        self.assertEqual(len(tx1._write_pbs), 1)

        # 2. Finalize deletion transaction (distinct transaction instance, preventing ReadAfterWrite)
        tx2 = Transaction(self.client)
        tx2._id = b"tx_bytes_999"

        resp2 = types.BatchGetDocumentsResponse()
        resp2.found.name = doc_ref._document_path
        resp2.found.fields["scan_id"] = types.Value(string_value=scan_id)
        resp2.found.fields["status"] = types.Value(string_value="deleting")
        resp2.found.fields["claim_id"] = types.Value(string_value="claim_valid")
        self.mock_api.batch_get_documents.return_value = iter([resp2])

        fin_ok, fin_reason = finalize_deletion_tx(tx2, doc_ref, "claim_valid")
        self.assertTrue(fin_ok)
        self.assertEqual(fin_reason, "deleted")
        self.assertEqual(len(tx2._write_pbs), 1)

    def test_transition_pending_scan_status_with_real_sdk(self):
        """transition_pending_scan_status succeeds using real Transaction and DocumentReference."""
        scan_id = "scan_real_trans"
        doc_ref = self.client.collection("pending_scans").document(scan_id)
        tx = Transaction(self.client)

        resp = types.BatchGetDocumentsResponse()
        resp.found.name = doc_ref._document_path
        resp.found.fields["scan_id"] = types.Value(string_value=scan_id)
        resp.found.fields["status"] = types.Value(string_value="processing")
        self.mock_api.batch_get_documents.return_value = iter([resp])
        self.mock_api.commit.return_value = types.CommitResponse()

        with unittest.mock.patch('models.db.transaction', return_value=tx), \
             unittest.mock.patch('models.pending_scans_collection.document', return_value=doc_ref):
            ok, reason = transition_pending_scan_status(
                scan_id,
                allowed_current_statuses=('processing',),
                update_payload={'status': 'completed'}
            )
            self.assertTrue(ok)
            self.assertEqual(reason, "updated")
            # Transaction executed via transactional() committed to mock transport API
            self.assertEqual(self.mock_api.commit.call_count, 1)

if __name__ == "__main__":
    unittest.main()
