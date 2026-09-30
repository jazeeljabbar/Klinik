import unittest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone, timedelta
import io
import json
import jwt

from app import app, authorize_scan_error_cleanup, transition_pending_scan_status
from scripts.cleanup_pending_scans import run_cleanup
from tests.mock_firestore import (
    InMemoryDocSnapshot,
    InMemoryDocRef,
    InMemoryTransaction,
    InMemoryDB
)
from google.cloud.exceptions import NotFound

class TestFailClosedAndLateUpload(unittest.TestCase):

    def setUp(self):
        self.app = app
        self.client = self.app.test_client()
        self.user_id = "user_fail_closed"
        self.token = jwt.encode(
            {"user_id": self.user_id, "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
            self.app.config["SECRET_KEY"],
            algorithm="HS256"
        )
        self.mock_user = MagicMock()
        self.mock_user.exists = True
        self.mock_user.id = self.user_id
        self.mock_user.to_dict.return_value = {
            "consents": {
                "terms_accepted": True,
                "medical_disclaimer_acknowledged": True,
                "image_processing_authorized": True,
                "policy_version": "2026-09-24.1",
                "recorded_at": datetime.now(timezone.utc).isoformat()
            }
        }

    def test_completion_commits_remotely_raises_timeout_verification_fails_fails_closed(self):
        """
        If completion write commits in Firestore remotely but times out locally,
        and subsequent verification reads fail, error cleanup must fail closed:
        the image and tracking record remain intact.
        """
        scan_id = "scan_ambiguous_timeout"
        image_path = f"users/{self.user_id}/scans/{scan_id}/original.jpg"
        db = InMemoryDB(pending_data={
            scan_id: {
                "scan_id": scan_id,
                "user_id": self.user_id,
                "image_path": image_path,
                "status": "processing",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        })

        mock_delete_gcs = MagicMock()

        # Step 1: Simulate the remote commit occurring in Firestore (status becomes 'completed')
        # but the local caller experiences an ambiguous exception (e.g. gRPC DeadlineExceeded / ReadTimeout)
        db.get_store('pending_scans')[scan_id]['status'] = 'completed'

        # Step 2: Attempting verification reads in error handler
        with patch('models.db', db), \
             patch('models.pending_scans_collection', db.collection('pending_scans')), \
             patch('services.storage_service.delete_image_from_gcs', mock_delete_gcs):

            # Error cleanup attempts guarded transition from ('uploading', 'processing') -> 'deleting'
            authorized, reason = authorize_scan_error_cleanup(scan_id, "Ambiguous completion timeout")

            # Error cleanup MUST NOT be authorized because scan is already 'completed' on the server
            self.assertFalse(authorized)
            self.assertEqual(reason, "ineligible_status_completed")

            # Neither GCS image nor Firestore record was deleted
            mock_delete_gcs.assert_not_called()
            persisted = db.get_store('pending_scans')[scan_id]
            self.assertIsNotNone(persisted)
            self.assertEqual(persisted['status'], 'completed')

    def test_subsequent_verification_reads_fail_image_and_record_intact(self):
        """
        When verification reads fail with an exception, guarded error cleanup fails closed,
        leaving both the image and the tracking record intact.
        """
        scan_id = "scan_read_failure"
        image_path = f"anonymous/{scan_id}/original.jpg"
        db = InMemoryDB(pending_data={
            scan_id: {
                "scan_id": scan_id,
                "image_path": image_path,
                "status": "uploading",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        })

        mock_delete_gcs = MagicMock()

        with patch('models.db', db), \
             patch('models.pending_scans_collection', db.collection('pending_scans')), \
             patch.object(InMemoryDocRef, 'get', side_effect=Exception("503 Service Unavailable")), \
             patch('services.storage_service.delete_image_from_gcs', mock_delete_gcs):

            authorized, reason = authorize_scan_error_cleanup(scan_id, "Read failed")
            # Fails closed on read exception
            self.assertFalse(authorized)
            self.assertIn("transaction_error", reason)
            mock_delete_gcs.assert_not_called()

        # Record remains in store
        self.assertIsNotNone(db.get_store('pending_scans').get(scan_id))

    def test_promotion_occurs_before_recovery_reads_image_remains_intact(self):
        """
        If concurrent promotion marks the scan as 'promoted' before error recovery reads,
        guarded error cleanup must reject deletion: image and tracking record remain intact.
        """
        scan_id = "scan_concurrent_promotion"
        image_path = f"users/{self.user_id}/scans/{scan_id}/original.jpg"
        db = InMemoryDB(pending_data={
            scan_id: {
                "scan_id": scan_id,
                "user_id": self.user_id,
                "image_path": image_path,
                "status": "promoted", # Already promoted!
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        })

        mock_delete_gcs = MagicMock()

        with patch('models.db', db), \
             patch('models.pending_scans_collection', db.collection('pending_scans')), \
             patch('services.storage_service.delete_image_from_gcs', mock_delete_gcs):

            authorized, reason = authorize_scan_error_cleanup(scan_id, "Late failure")

            # Must reject transition because status is 'promoted'
            self.assertFalse(authorized)
            self.assertEqual(reason, "ineligible_status_promoted")
            mock_delete_gcs.assert_not_called()

            persisted = db.get_store('pending_scans')[scan_id]
            self.assertEqual(persisted['status'], 'promoted')

    def test_late_upload_race_background_cleanup_does_not_finalize_on_404_within_grace_period(self):
        """
        Race condition:
        1. Upload times out -> marked 'upload_failed = True' within grace period.
        2. Immediate delete returns 404.
        3. Background cleanup runs and also sees 404.
        4. Invariant: Cleanup must NOT finalize (delete) the Firestore tracking document!
        5. Late upload finishes in GCS (blob is now present).
        6. Subsequent cleanup run finds blob, deletes it from GCS, and finalizes Firestore doc.
        """
        scan_id = "scan_late_upload_race"
        image_path = f"anonymous/{scan_id}/original.jpg"
        now = datetime.now(timezone.utc)
        recent_failed_ts = (now - timedelta(minutes=2)).isoformat() # within 2-hour grace period

        db = InMemoryDB(pending_data={
            scan_id: {
                "scan_id": scan_id,
                "image_path": image_path,
                "status": "deleting",
                "needs_cleanup": True,
                "upload_failed": True,
                "upload_failed_at": recent_failed_ts,
                "created_at": recent_failed_ts
            }
        })

        storage_client = MagicMock()
        # 404 on blob.delete() because original upload hasn't finished yet
        blob_mock = storage_client.bucket.return_value.blob.return_value
        blob_mock.delete.side_effect = NotFound("Blob not found")

        # First cleanup run
        stats1 = run_cleanup(db, storage_client, "test-bucket", retention_hours=24, dry_run=False)

        # Invariant: GCS was missing (404), but because it is an ambiguous upload within grace period,
        # the Firestore tracking document MUST NOT be deleted!
        self.assertEqual(stats1["gcs_already_missing"], 1)
        self.assertEqual(stats1["firestore_deleted"], 0)
        self.assertIsNotNone(db.get_store('pending_scans').get(scan_id), "Tracking record must remain intact")
        self.assertEqual(db.get_store('pending_scans')[scan_id]["status"], "deleting")
        self.assertTrue(db.get_store('pending_scans')[scan_id]["needs_cleanup"])

        # Advance worker lease so next cleanup run can claim the scan
        db.get_store('pending_scans')[scan_id]['claimed_at'] = (now - timedelta(seconds=350)).isoformat()

        # Now simulate late upload finishing: blob arrives in GCS!
        blob_mock.delete.side_effect = None
        blob_mock.delete.return_value = True

        # Next cleanup run executes
        stats2 = run_cleanup(db, storage_client, "test-bucket", retention_hours=24, dry_run=False)

        # The late-arrived blob was detected and deleted from GCS, and now the Firestore tracking record is finalized!
        self.assertEqual(stats2["gcs_deleted"], 1)
        self.assertEqual(stats2["firestore_deleted"], 1)
        self.assertIsNone(db.get_store('pending_scans').get(scan_id), "Tracking doc finalized after GCS blob deleted")

    def test_unresolved_upload_retains_durable_recovery_record_regardless_of_age_on_404(self):
        """
        Invariant: Without an enforced termination bound, 2 hours cannot guarantee upload termination.
        An unresolved upload (upload_failed=True) must retain its durable recovery record in Firestore
        on 404 regardless of elapsed time. It is NOT deleted on 404.
        """
        scan_id = "scan_old_unresolved_upload"
        image_path = f"anonymous/{scan_id}/original.jpg"
        old_failed_ts = (datetime.now(timezone.utc) - timedelta(hours=5)).isoformat() # > 2 hours

        db = InMemoryDB(pending_data={
            scan_id: {
                "scan_id": scan_id,
                "image_path": image_path,
                "status": "deleting",
                "needs_cleanup": True,
                "upload_failed": True,
                "upload_failed_at": old_failed_ts,
                "created_at": old_failed_ts
            }
        })

        storage_client = MagicMock()
        blob_mock = storage_client.bucket.return_value.blob.return_value
        blob_mock.delete.side_effect = NotFound("Blob not found")

        stats = run_cleanup(db, storage_client, "test-bucket", retention_hours=24, dry_run=False)

        # Invariant: Record must NOT be deleted on 404, even after hours/days!
        self.assertEqual(stats["gcs_already_missing"], 1)
        self.assertEqual(stats["firestore_deleted"], 0)
        self.assertIsNotNone(db.get_store('pending_scans').get(scan_id), "Durable recovery record must be preserved")
        self.assertEqual(db.get_store('pending_scans')[scan_id]["status"], "deleting")
        self.assertIn("Ambiguous upload", db.get_store('pending_scans')[scan_id]["last_deletion_error"])

    def test_crashed_uploading_state_retains_durable_recovery_record_on_404(self):
        """
        Invariant: If a worker or client process crashed before writing upload_failed=True,
        leaving the record in status='uploading' past retention cutoff:
        Cleanup claims it into 'deleting'. When GCS returns 404, cleanup preserves the durable
        recovery record instead of deleting the tracking doc.
        """
        scan_id = "scan_crashed_in_uploading"
        image_path = f"anonymous/{scan_id}/original.jpg"
        past_retention_ts = (datetime.now(timezone.utc) - timedelta(hours=25)).isoformat()

        db = InMemoryDB(pending_data={
            scan_id: {
                "scan_id": scan_id,
                "image_path": image_path,
                "status": "uploading",
                "created_at": past_retention_ts
            }
        })

        storage_client = MagicMock()
        blob_mock = storage_client.bucket.return_value.blob.return_value
        blob_mock.delete.side_effect = NotFound("Blob not found")

        stats = run_cleanup(db, storage_client, "test-bucket", retention_hours=24, dry_run=False)

        # Claimed and identified as unresolved upload; retained on 404
        self.assertEqual(stats["gcs_already_missing"], 1)
        self.assertEqual(stats["firestore_deleted"], 0)
        doc = db.get_store('pending_scans').get(scan_id)
        self.assertIsNotNone(doc)
        self.assertEqual(doc["status"], "deleting")
        self.assertIn("Ambiguous upload", doc["last_deletion_error"])

    def test_crashed_uploading_retains_durable_marker_across_multiple_cleanup_runs_and_worker_takeovers_until_blob_cleaned(self):
        """
        Regression test covering the complete lifecycle of a crashed 'uploading' record:
        1. A crashed 'uploading' record exists without upload_failed or unresolved_upload initially.
        2. First cleanup run receives 404 from GCS:
           - Invariant: Atomically sets 'unresolved_upload: True' and retains tracking doc with status='deleting'.
        3. Lease expires (>300s) and a second worker takes over, also receiving 404:
           - Invariant: Preserves 'unresolved_upload: True' and does NOT finalize on repeated 404!
        4. Further cleanup (third attempt) still preserves the recovery record; promotion remains blocked.
        5. The blob subsequently appears in GCS:
           - Blob is discovered and deleted by cleanup worker.
           - Finalization follows the documented upload-resolution conditions: doc is deleted from Firestore.
        """
        from routes.history import promote_scan_tx

        scan_id = "scan_crashed_multi_worker_lifecycle"
        image_path = f"users/{self.user_id}/scans/{scan_id}/original.jpg"
        created_ts = (datetime.now(timezone.utc) - timedelta(hours=25)).isoformat()

        # Step 1: Initial state - crashed in 'uploading', NO upload_failed, NO unresolved_upload
        db = InMemoryDB(pending_data={
            scan_id: {
                "scan_id": scan_id,
                "user_id": self.user_id,
                "image_path": image_path,
                "status": "uploading",
                "created_at": created_ts
            }
        })

        storage_client = MagicMock()
        blob_mock = storage_client.bucket.return_value.blob.return_value
        blob_mock.delete.side_effect = NotFound("Blob not yet landed in GCS")

        # Step 2: First cleanup run receives 404
        stats1 = run_cleanup(db, storage_client, "test-bucket", retention_hours=24, dry_run=False)
        self.assertEqual(stats1["gcs_already_missing"], 1)
        self.assertEqual(stats1["firestore_deleted"], 0)

        doc1 = db.get_store('pending_scans').get(scan_id)
        self.assertIsNotNone(doc1)
        self.assertEqual(doc1["status"], "deleting")
        self.assertTrue(doc1.get("unresolved_upload"), "Durable marker unresolved_upload must be written atomically on claim")
        self.assertTrue(doc1.get("needs_cleanup"))
        claim_id_1 = doc1.get("claim_id")
        self.assertIsNotNone(claim_id_1)

        # Step 3: Lease expires (>300s) and a second worker runs, also receiving 404
        doc1["claimed_at"] = (datetime.now(timezone.utc) - timedelta(seconds=350)).isoformat()

        stats2 = run_cleanup(db, storage_client, "test-bucket", retention_hours=24, dry_run=False)
        self.assertEqual(stats2["gcs_already_missing"], 1)
        self.assertEqual(stats2["firestore_deleted"], 0, "Second worker must NOT delete tracking record on 404!")

        doc2 = db.get_store('pending_scans').get(scan_id)
        self.assertIsNotNone(doc2, "Tracking record must be preserved across worker takeover")
        self.assertEqual(doc2["status"], "deleting")
        self.assertTrue(doc2.get("unresolved_upload"), "Durable marker must persist through worker takeover")
        claim_id_2 = doc2.get("claim_id")
        self.assertIsNotNone(claim_id_2)
        self.assertNotEqual(claim_id_1, claim_id_2, "Second worker must acquire its own fresh claim_id")

        # Step 4: Further cleanup (e.g. lease expires again, third worker receives 404)
        doc2["claimed_at"] = (datetime.now(timezone.utc) - timedelta(seconds=400)).isoformat()
        stats3 = run_cleanup(db, storage_client, "test-bucket", retention_hours=24, dry_run=False)
        self.assertEqual(stats3["gcs_already_missing"], 1)
        self.assertEqual(stats3["firestore_deleted"], 0)
        self.assertIsNotNone(db.get_store('pending_scans').get(scan_id))

        # Invariant: User promotion must remain strictly blocked while unresolved
        pending_ref = db.collection('pending_scans').document(scan_id)
        hist_ref = db.collection('histories').document("hist_unresolved")
        tx = db.transaction()
        prom_ok, prom_reason, _ = promote_scan_tx(tx, pending_ref, hist_ref, self.user_id)
        self.assertFalse(prom_ok, "Promotion must be rejected for scan marked deleting / unresolved_upload")
        self.assertEqual(prom_reason, "claimed_for_deletion")
        self.assertFalse(hist_ref.get().exists)

        # Step 5: The blob subsequently appears in GCS!
        blob_mock.delete.side_effect = None  # Blob is now found and deleted successfully

        # Lease expires so next cleanup worker claims it
        doc3 = db.get_store('pending_scans')[scan_id]
        doc3["claimed_at"] = (datetime.now(timezone.utc) - timedelta(seconds=350)).isoformat()

        stats4 = run_cleanup(db, storage_client, "test-bucket", retention_hours=24, dry_run=False)
        self.assertEqual(stats4["gcs_deleted"], 1, "Cleanup worker must delete the late-arriving blob")
        self.assertEqual(stats4["firestore_deleted"], 1, "Cleanup worker must finalize Firestore tracking doc after GCS deletion")

        # Step 6: Finalization follows documented upload-resolution conditions
        final_doc = db.get_store('pending_scans').get(scan_id)
        self.assertIsNone(final_doc, "Pending scan document must be finalized and deleted once upload is resolved")

if __name__ == "__main__":
    unittest.main()

