import unittest
from unittest.mock import MagicMock
from datetime import datetime, timedelta, timezone
from google.cloud.exceptions import NotFound

from scripts.cleanup_pending_scans import (
    run_cleanup,
    is_safe_scan_path,
    is_scan_referenced_in_histories,
    parse_iso_datetime,
    claim_pending_scan_tx,
    record_deletion_failure_tx,
    finalize_deletion_tx
)
from tests.mock_firestore import (
    InMemoryDocSnapshot,
    InMemoryDocRef,
    InMemoryTransaction,
    InMemoryDB
)

class TestCleanupPendingScans(unittest.TestCase):

    def test_path_safety(self):
        # Valid anonymous paths
        self.assertTrue(is_safe_scan_path("anonymous/abc12345/original.jpg"))
        self.assertTrue(is_safe_scan_path("anonymous/scan_99-ab/original.png"))
        
        # Valid user scan paths
        self.assertTrue(is_safe_scan_path("users/user123/scans/scan456/original.webp"))
        
        # Invalid / dangerous paths
        self.assertFalse(is_safe_scan_path("users/user123/profile.jpg"))
        self.assertFalse(is_safe_scan_path("system/config.json"))
        self.assertFalse(is_safe_scan_path("../../etc/passwd"))
        self.assertFalse(is_safe_scan_path(None))
        self.assertFalse(is_safe_scan_path(""))

    def test_cleanup_preserves_promoted_scans(self):
        db = MagicMock()
        storage_client = MagicMock()

        old_ts = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
        promoted_doc = MagicMock()
        promoted_doc.id = "scan_promoted"
        promoted_doc.to_dict.return_value = {
            "scan_id": "scan_promoted",
            "image_path": "anonymous/scan_promoted/original.jpg",
            "status": "promoted",
            "created_at": old_ts
        }

        db.collection.return_value.limit.return_value.get.return_value = [promoted_doc]

        stats = run_cleanup(db, storage_client, "test-bucket", retention_hours=24, dry_run=False)

        self.assertEqual(stats["skipped_promoted"], 1)
        self.assertEqual(stats["gcs_deleted"], 0)
        self.assertEqual(stats["firestore_deleted"], 0)
        storage_client.bucket.return_value.blob.return_value.delete.assert_not_called()
        promoted_doc.reference.delete.assert_not_called()

    def test_cleanup_preserves_recent_scans_within_retention(self):
        db = MagicMock()
        storage_client = MagicMock()

        recent_ts = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
        recent_doc = MagicMock()
        recent_doc.id = "scan_recent"
        recent_doc.to_dict.return_value = {
            "scan_id": "scan_recent",
            "image_path": "anonymous/scan_recent/original.jpg",
            "status": "pending",
            "created_at": recent_ts
        }

        db.collection.return_value.limit.return_value.get.return_value = [recent_doc]

        stats = run_cleanup(db, storage_client, "test-bucket", retention_hours=24, dry_run=False)

        self.assertEqual(stats["skipped_within_retention"], 1)
        self.assertEqual(stats["gcs_deleted"], 0)
        self.assertEqual(stats["firestore_deleted"], 0)

    def test_cleanup_preserves_scans_referenced_in_histories(self):
        db = MagicMock()
        storage_client = MagicMock()

        old_ts = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
        doc = MagicMock()
        doc.id = "scan_with_history"
        doc.to_dict.return_value = {
            "scan_id": "scan_with_history",
            "image_path": "anonymous/scan_with_history/original.jpg",
            "status": "pending",
            "created_at": old_ts
        }

        # Mock collection dispatch
        def col_mock(name):
            col = MagicMock()
            if name == "pending_scans":
                col.limit.return_value.get.return_value = [doc]
            elif name == "histories":
                # Returns a document when queried
                hist_match = MagicMock()
                col.where.return_value.limit.return_value.get.return_value = [hist_match]
            return col

        db.collection.side_effect = col_mock

        stats = run_cleanup(db, storage_client, "test-bucket", retention_hours=24, dry_run=False)

        self.assertEqual(stats["skipped_in_history"], 1)
        self.assertEqual(stats["gcs_deleted"], 0)
        self.assertEqual(stats["firestore_deleted"], 0)

    def test_cleanup_dry_run_does_not_mutate(self):
        db = MagicMock()
        storage_client = MagicMock()

        old_ts = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
        abandoned_doc = MagicMock()
        abandoned_doc.id = "scan_abandoned"
        abandoned_doc.to_dict.return_value = {
            "scan_id": "scan_abandoned",
            "image_path": "anonymous/scan_abandoned/original.jpg",
            "status": "pending",
            "created_at": old_ts
        }

        def col_mock(name):
            col = MagicMock()
            if name == "pending_scans":
                col.limit.return_value.get.return_value = [abandoned_doc]
            elif name == "histories":
                col.where.return_value.limit.return_value.get.return_value = []
            return col

        db.collection.side_effect = col_mock

        stats = run_cleanup(db, storage_client, "test-bucket", retention_hours=24, dry_run=True)

        self.assertEqual(stats["gcs_deleted"], 1)
        self.assertEqual(stats["firestore_deleted"], 1)
        # Verify NO actual deletion calls were executed on cloud resources
        storage_client.bucket.return_value.blob.return_value.delete.assert_not_called()
        abandoned_doc.reference.delete.assert_not_called()

    def test_cleanup_execution_deletes_gcs_then_firestore(self):
        storage_client = MagicMock()
        old_ts = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
        db = InMemoryDB(pending_data={
            "scan_abandoned": {
                "scan_id": "scan_abandoned",
                "image_path": "anonymous/scan_abandoned/original.jpg",
                "status": "pending",
                "created_at": old_ts
            }
        })

        stats = run_cleanup(db, storage_client, "test-bucket", retention_hours=24, dry_run=False)

        self.assertEqual(stats["gcs_deleted"], 1)
        self.assertEqual(stats["firestore_deleted"], 1)
        storage_client.bucket.return_value.blob.return_value.delete.assert_called_once()
        self.assertIsNone(db.get_store("pending_scans").get("scan_abandoned"))
        self.assertEqual(len(db.active_transactions[-1].deletes), 1)

    def test_cleanup_retains_firestore_doc_if_gcs_delete_fails(self):
        storage_client = MagicMock()
        old_ts = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
        db = InMemoryDB(pending_data={
            "scan_error": {
                "scan_id": "scan_error",
                "image_path": "anonymous/scan_error/original.jpg",
                "status": "pending",
                "created_at": old_ts
            }
        })

        # GCS delete raises a network/permission error
        storage_client.bucket.return_value.blob.return_value.delete.side_effect = Exception("GCS connection timeout")

        stats = run_cleanup(db, storage_client, "test-bucket", retention_hours=24, dry_run=False)

        self.assertEqual(stats["gcs_failed"], 1)
        self.assertEqual(stats["firestore_deleted"], 0)
        # Must retain doc for retry with status='deleting' and error recorded
        doc = db.get_store("pending_scans").get("scan_error")
        self.assertIsNotNone(doc)
        self.assertEqual(doc["status"], "deleting")
        self.assertIn("GCS connection timeout", doc.get("last_deletion_error", ""))

    def test_cleanup_deletes_orphan_firestore_if_gcs_is_404(self):
        storage_client = MagicMock()
        old_ts = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
        db = InMemoryDB(pending_data={
            "scan_orphan": {
                "scan_id": "scan_orphan",
                "image_path": "anonymous/scan_orphan/original.jpg",
                "status": "pending",
                "created_at": old_ts
            }
        })

        # GCS delete raises NotFound (blob already gone)
        storage_client.bucket.return_value.blob.return_value.delete.side_effect = NotFound("Blob not found")

        stats = run_cleanup(db, storage_client, "test-bucket", retention_hours=24, dry_run=False)

        self.assertEqual(stats["gcs_already_missing"], 1)
        self.assertEqual(stats["firestore_deleted"], 1)
        self.assertIsNone(db.get_store("pending_scans").get("scan_orphan"))
        self.assertEqual(len(db.active_transactions[-1].deletes), 1)

    def test_cleanup_aborts_deletion_if_promoted_during_run(self):
        storage_client = MagicMock()
        old_ts = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
        # Scan was initially fetched in batch, but promoted in DB before claim tx
        db = InMemoryDB(pending_data={
            "scan_mid_run_promoted": {
                "scan_id": "scan_mid_run_promoted",
                "image_path": "anonymous/scan_mid_run_promoted/original.jpg",
                "status": "promoted",
                "created_at": old_ts
            }
        })

        stats = run_cleanup(db, storage_client, "test-bucket", retention_hours=24, dry_run=False)

        self.assertEqual(stats["skipped_promoted"], 1)
        self.assertEqual(stats["gcs_deleted"], 0)
        self.assertEqual(stats["firestore_deleted"], 0)
        storage_client.bucket.return_value.blob.return_value.delete.assert_not_called()
    def test_cleanup_rejects_negative_or_zero_retention(self):
        db = MagicMock()
        storage_client = MagicMock()
        with self.assertRaises(ValueError):
            run_cleanup(db, storage_client, "test-bucket", retention_hours=0)
        with self.assertRaises(ValueError):
            run_cleanup(db, storage_client, "test-bucket", retention_hours=-10)

    def test_cleanup_rejects_invalid_max_scans(self):
        db = MagicMock()
        storage_client = MagicMock()
        with self.assertRaises(ValueError):
            run_cleanup(db, storage_client, "test-bucket", max_scans=0)
        with self.assertRaises(ValueError):
            run_cleanup(db, storage_client, "test-bucket", max_scans="1000")

    def test_cleanup_skips_missing_or_invalid_created_at(self):
        db = MagicMock()
        storage_client = MagicMock()
        doc_missing = MagicMock()
        doc_missing.id = "scan_missing"
        doc_missing.to_dict.return_value = {
            "scan_id": "scan_missing",
            "image_path": "anonymous/scan_missing/original.jpg",
            "status": "pending",
            "created_at": None
        }
        doc_invalid = MagicMock()
        doc_invalid.id = "scan_invalid"
        doc_invalid.to_dict.return_value = {
            "scan_id": "scan_invalid",
            "image_path": "anonymous/scan_invalid/original.jpg",
            "status": "pending",
            "created_at": "invalid-date"
        }
        db.collection.return_value.limit.return_value.get.return_value = [doc_missing, doc_invalid]
        stats = run_cleanup(db, storage_client, "test-bucket", retention_hours=24, dry_run=False)
        self.assertEqual(stats["skipped_invalid_created_at"], 2)
        self.assertEqual(stats["gcs_deleted"], 0)

    def test_cleanup_skips_future_created_at(self):
        db = MagicMock()
        storage_client = MagicMock()
        future_ts = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
        doc = MagicMock()
        doc.id = "scan_future"
        doc.to_dict.return_value = {
            "scan_id": "scan_future",
            "image_path": "anonymous/scan_future/original.jpg",
            "status": "pending",
            "created_at": future_ts
        }
        db.collection.return_value.limit.return_value.get.return_value = [doc]
        stats = run_cleanup(db, storage_client, "test-bucket", retention_hours=24, dry_run=False)
        self.assertEqual(stats["skipped_invalid_created_at"], 1)
        self.assertEqual(stats["gcs_deleted"], 0)

    def test_cleanup_skips_mismatched_doc_id_and_scan_id(self):
        db = MagicMock()
        storage_client = MagicMock()
        old_ts = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
        doc = MagicMock()
        doc.id = "doc_id_abc"
        doc.to_dict.return_value = {
            "scan_id": "scan_id_xyz",
            "image_path": "anonymous/scan_id_xyz/original.jpg",
            "status": "pending",
            "created_at": old_ts
        }
        db.collection.return_value.limit.return_value.get.return_value = [doc]
        stats = run_cleanup(db, storage_client, "test-bucket", retention_hours=24, dry_run=False)
        self.assertEqual(stats["skipped_mismatched_id"], 1)
        self.assertEqual(stats["gcs_deleted"], 0)

    def test_cleanup_skips_mismatched_image_path(self):
        db = MagicMock()
        storage_client = MagicMock()
        old_ts = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
        doc = MagicMock()
        doc.id = "scan_target"
        doc.to_dict.return_value = {
            "scan_id": "scan_target",
            "image_path": "anonymous/other_scan/original.jpg",
            "status": "pending",
            "created_at": old_ts
        }
        db.collection.return_value.limit.return_value.get.return_value = [doc]
        stats = run_cleanup(db, storage_client, "test-bucket", retention_hours=24, dry_run=False)
        self.assertEqual(stats["skipped_mismatched_path"], 1)
        self.assertEqual(stats["gcs_deleted"], 0)

    def test_deterministic_concurrency_cleanup_claims_promotion_fails(self):
        from app import app
        import jwt

        # 1. Setup user with consent
        user_id = "user_concurrent_1"
        token = jwt.encode(
            {"user_id": user_id, "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
            app.config["SECRET_KEY"],
            algorithm="HS256"
        )

        from constants.policies import POLICY_VERSION

        # Scan is claimed for deletion by cleanup (< 5 min ago)
        scan_id = "scan_claimed_test"
        claimed_at = (datetime.now(timezone.utc) - timedelta(seconds=30)).isoformat()
        pending_doc = MagicMock()
        pending_doc.exists = True
        pending_doc.id = scan_id
        pending_doc.to_dict.return_value = {
            "scan_id": scan_id,
            "user_id": user_id,
            "image_path": f"users/{user_id}/scans/{scan_id}/original.jpg",
            "status": "deleting",  # CLAIMED by cleanup!
            "claimed_at": claimed_at,
            "predicted_class": "Mild",
            "confidence": 85.0,
            "severity_index": 1
        }

        user_doc = MagicMock()
        user_doc.exists = True
        user_doc.id = user_id
        user_doc.to_dict.return_value = {
            "name": "Test User",
            "email": "test@example.com",
            "consents": {
                "terms_accepted": True,
                "medical_disclaimer_acknowledged": True,
                "image_processing_authorized": True,
                "policy_version": POLICY_VERSION,
                "recorded_at": datetime.now(timezone.utc).isoformat()
            }
        }

        with unittest.mock.patch('utils.auth_middleware.users_collection') as mock_users, \
             unittest.mock.patch('models.pending_scans_collection') as mock_pending, \
             unittest.mock.patch('models.histories_collection') as mock_histories, \
             unittest.mock.patch('models.db') as mock_db:

            mock_users.document.return_value.get.return_value = user_doc
            mock_pending.document.return_value = pending_doc
            mock_pending.document.return_value.get.return_value = pending_doc

            # Mock transaction
            mock_tx = MagicMock()
            pending_doc.get.return_value = pending_doc
            mock_db.transaction.return_value = mock_tx

            client = app.test_client()
            res = client.post('/api/history/',
                json={"scan_id": scan_id},
                headers={"Authorization": f"Bearer {token}"}
            )

            # Promotion MUST be rejected with 409 Conflict
            self.assertEqual(res.status_code, 409)
            self.assertIn("Scan claimed for deletion", res.get_json()["error"])
            # Histories collection set MUST NOT be called!
            mock_tx.set.assert_not_called()

    def test_cleanup_records_failure_without_reverting_to_pending(self):
        """A failed GCS deletion records failure metadata and retains status='deleting', never reverting to 'pending'."""
        db = MagicMock()
        storage_client = MagicMock()

        old_ts = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
        doc = MagicMock()
        doc.id = "scan_gcs_fail"
        doc.to_dict.return_value = {
            "scan_id": "scan_gcs_fail",
            "image_path": "anonymous/scan_gcs_fail/original.jpg",
            "status": "pending",
            "created_at": old_ts
        }

        pending_col = MagicMock()
        pending_col.limit.return_value.get.return_value = [doc]
        pending_ref = MagicMock()
        pending_snap = MagicMock()
        pending_snap.exists = True
        pending_snap.to_dict.return_value = {
            "scan_id": "scan_gcs_fail",
            "image_path": "anonymous/scan_gcs_fail/original.jpg",
            "status": "pending",
            "created_at": old_ts
        }
        pending_ref.get.return_value = pending_snap
        pending_col.document.return_value = pending_ref

        histories_col = MagicMock()
        histories_col.where.return_value.limit.return_value.get.return_value = []

        def col_mock(name):
            if name == "pending_scans":
                return pending_col
            elif name == "histories":
                return histories_col
            return MagicMock()

        db.collection.side_effect = col_mock

        # GCS delete fails
        storage_client.bucket.return_value.blob.return_value.delete.side_effect = Exception("Storage timeout error")
        db = InMemoryDB(pending_data={
            "scan_gcs_fail": {
                "scan_id": "scan_gcs_fail",
                "image_path": "anonymous/scan_gcs_fail/original.jpg",
                "status": "pending",
                "created_at": old_ts
            }
        })

        stats = run_cleanup(db, storage_client, "test-bucket", retention_hours=24, dry_run=False)

        self.assertEqual(stats["gcs_failed"], 1)
        self.assertEqual(stats["firestore_deleted"], 0)
        # Verify status was NEVER reverted to 'pending'; update was called with status: 'deleting'
        doc = db.get_store("pending_scans").get("scan_gcs_fail")
        self.assertIsNotNone(doc)
        self.assertEqual(doc.get("status"), "deleting")
        self.assertNotEqual(doc.get("status"), "pending")
        self.assertIn("Storage timeout error", doc.get("last_deletion_error", ""))

    def test_cleanup_crashes_after_gcs_delete_promotion_remains_blocked(self):
        """If cleanup deletes the GCS blob and crashes before doc deletion, promotion remains blocked even after lease expires."""
        from app import app
        import jwt

        user_id = "user_crashed_worker"
        token = jwt.encode(
            {"user_id": user_id, "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
            app.config["SECRET_KEY"],
            algorithm="HS256"
        )
        from constants.policies import POLICY_VERSION

        # Scan was claimed 600 seconds ago (lease expired > 300s), but worker crashed
        scan_id = "scan_crashed_worker"
        claimed_at = (datetime.now(timezone.utc) - timedelta(seconds=600)).isoformat()
        pending_doc = MagicMock()
        pending_doc.exists = True
        pending_doc.id = scan_id
        pending_doc.to_dict.return_value = {
            "scan_id": scan_id,
            "user_id": user_id,
            "image_path": f"users/{user_id}/scans/{scan_id}/original.jpg",
            "status": "deleting",  # Deletion was initiated
            "claimed_at": claimed_at,
            "claim_id": "crashed_worker_uuid"
        }

        user_doc = MagicMock()
        user_doc.exists = True
        user_doc.id = user_id
        user_doc.to_dict.return_value = {
            "consents": {
                "terms_accepted": True,
                "medical_disclaimer_acknowledged": True,
                "image_processing_authorized": True,
                "policy_version": POLICY_VERSION,
                "recorded_at": datetime.now(timezone.utc).isoformat()
            }
        }

        with unittest.mock.patch('utils.auth_middleware.users_collection') as mock_users, \
             unittest.mock.patch('models.pending_scans_collection') as mock_pending, \
             unittest.mock.patch('models.histories_collection') as mock_histories, \
             unittest.mock.patch('models.db') as mock_db:

            mock_users.document.return_value.get.return_value = user_doc
            pending_doc.get.return_value = pending_doc
            mock_pending.document.return_value = pending_doc
            mock_db.transaction.return_value = MagicMock()

            client = app.test_client()
            res = client.post('/api/history/',
                json={"scan_id": scan_id},
                headers={"Authorization": f"Bearer {token}"}
            )

            # Invariant: Once 'deleting', promotion must be rejected even though lease is expired!
            self.assertEqual(res.status_code, 409)
            self.assertIn("Scan claimed for deletion", res.get_json()["error"])

    def test_worker_lease_expiry_worker_b_takes_over_worker_a_cannot_finalize(self):
        """Worker A pauses, its lease expires, Worker B resumes cleanup with new claim_id, and Worker A cannot finalize."""
        pending_ref = MagicMock()
        pending_ref.id = "scan_two_workers"
        doc_data = {
            "scan_id": "scan_two_workers",
            "image_path": "anonymous/scan_two_workers/original.jpg",
            "status": "deleting",
            "claimed_at": (datetime.now(timezone.utc) - timedelta(seconds=400)).isoformat(),  # expired lease
            "claim_id": "worker_a_id"
        }

        snap_a = InMemoryDocSnapshot("scan_two_workers", doc_data)
        pending_ref.get.return_value = snap_a
        tx_b = MagicMock()

        # 1. Worker B takes over the expired claim
        histories_col = MagicMock()
        histories_col.where.return_value.limit.return_value.get.return_value = []
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)

        success, reason, _ = claim_pending_scan_tx(tx_b, pending_ref, "worker_b_id", cutoff, histories_col)
        self.assertTrue(success)
        self.assertEqual(reason, "claimed")

        # Now document state in Firestore has claim_id = worker_b_id
        doc_data["claim_id"] = "worker_b_id"
        snap_b = InMemoryDocSnapshot("scan_two_workers", doc_data)

        # 2. Worker A wakes up and attempts to finalize deletion with its stale claim_id
        pending_ref.get.return_value = snap_b
        tx_a = MagicMock()
        fin_ok, fin_reason = finalize_deletion_tx(tx_a, pending_ref, "worker_a_id")
        self.assertFalse(fin_ok)
        self.assertEqual(fin_reason, "claim_lost")
        tx_a.delete.assert_not_called()

        # 3. Worker B finalizes deletion with active claim_id
        tx_b_fin = MagicMock()
        fin_ok_b, fin_reason_b = finalize_deletion_tx(tx_b_fin, pending_ref, "worker_b_id")
        self.assertTrue(fin_ok_b)
        self.assertEqual(fin_reason_b, "deleted")
        tx_b_fin.delete.assert_called_once_with(pending_ref)

    def test_storage_timeout_does_not_reopen_scan_for_promotion(self):
        """A storage timeout during cleanup records failure and leaves status='deleting', never reopening promotion."""
        pending_ref = MagicMock()
        pending_ref.id = "scan_timeout_test"
        doc_data = {
            "scan_id": "scan_timeout_test",
            "image_path": "anonymous/scan_timeout_test/original.jpg",
            "status": "deleting",
            "claimed_at": (datetime.now(timezone.utc) - timedelta(seconds=60)).isoformat(),
            "claim_id": "worker_timeout_id"
        }
        snap = InMemoryDocSnapshot("scan_timeout_test", doc_data)
        pending_ref.get.return_value = snap
        tx = MagicMock()

        ok, res = record_deletion_failure_tx(tx, pending_ref, "worker_timeout_id", "GCS Gateway Timeout 504")
        self.assertTrue(ok)
        self.assertEqual(res, "updated")

        update_arg = tx.update.call_args[0][1]
        self.assertEqual(update_arg["status"], "deleting")
        self.assertEqual(update_arg["last_deletion_error"], "GCS Gateway Timeout 504")
        # Ensure 'pending' is nowhere in the update
        self.assertNotIn("pending", update_arg.values())

    def test_concurrent_promotion_and_cleanup_when_image_path_absent(self):
        """Scans without image_path must also require transactional claim; promotion cannot race."""
        from app import app
        import jwt

        user_id = "user_no_image_path"
        token = jwt.encode(
            {"user_id": user_id, "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
            app.config["SECRET_KEY"],
            algorithm="HS256"
        )
        from constants.policies import POLICY_VERSION

        scan_id = "scan_no_image_123"
        doc_data = {
            "scan_id": scan_id,
            "user_id": user_id,
            "image_path": None,  # image_path is absent
            "status": "pending",
            "created_at": (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
        }

        pending_doc = MagicMock()
        pending_doc.exists = True
        pending_doc.id = scan_id
        pending_doc.to_dict.return_value = doc_data
        snap = InMemoryDocSnapshot(scan_id, doc_data)
        pending_doc.get.return_value = snap

        # Cleanup claims the record via transaction
        tx_clean = MagicMock()
        histories_col = MagicMock()
        histories_col.where.return_value.limit.return_value.get.return_value = []
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)

        success, reason, _ = claim_pending_scan_tx(tx_clean, pending_doc, "claim_no_img", cutoff, histories_col)
        self.assertTrue(success)
        self.assertEqual(reason, "claimed")

        # Now document has status: 'deleting'
        doc_data["status"] = "deleting"

        # User attempts concurrent promotion
        user_doc = MagicMock()
        user_doc.exists = True
        user_doc.id = user_id
        user_doc.to_dict.return_value = {
            "consents": {
                "terms_accepted": True,
                "medical_disclaimer_acknowledged": True,
                "image_processing_authorized": True,
                "policy_version": POLICY_VERSION,
                "recorded_at": datetime.now(timezone.utc).isoformat()
            }
        }

        with unittest.mock.patch('utils.auth_middleware.users_collection') as mock_users, \
             unittest.mock.patch('models.pending_scans_collection') as mock_pending, \
             unittest.mock.patch('models.histories_collection') as mock_histories, \
             unittest.mock.patch('models.db') as mock_db:

            mock_users.document.return_value.get.return_value = user_doc
            pending_doc.get.return_value = pending_doc
            mock_pending.document.return_value = pending_doc
            mock_db.transaction.return_value = MagicMock()

            client = app.test_client()
            res = client.post('/api/history/',
                json={"scan_id": scan_id},
                headers={"Authorization": f"Bearer {token}"}
            )

            # Promotion is blocked with 409 Conflict even though image_path was absent
            self.assertEqual(res.status_code, 409)
            self.assertIn("Scan claimed for deletion", res.get_json()["error"])

    def test_transaction_callbacks_perform_no_direct_writes_or_deletes(self):
        """Transaction callbacks must queue operations exclusively via tx, never calling ref.update or ref.delete directly."""
        pending_ref = MagicMock()
        pending_ref.id = "scan_tx_purity"
        doc_data = {
            "scan_id": "scan_tx_purity",
            "image_path": "anonymous/scan_tx_purity/original.jpg",
            "status": "pending",
            "created_at": (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
        }
        snap = InMemoryDocSnapshot("scan_tx_purity", doc_data)
        pending_ref.get.return_value = snap
        tx = MagicMock()

        histories_col = MagicMock()
        histories_col.where.return_value.limit.return_value.get.return_value = []
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)

        # 1. Claim
        ok_claim, _, _ = claim_pending_scan_tx(tx, pending_ref, "claim_purity", cutoff, histories_col)
        self.assertTrue(ok_claim)
        pending_ref.update.assert_not_called()
        pending_ref.delete.assert_not_called()
        tx.update.assert_called_once()

        # Update doc_data to deleting with claim_id
        doc_data["status"] = "deleting"
        doc_data["claim_id"] = "claim_purity"
        snap_deleting = InMemoryDocSnapshot("scan_tx_purity", doc_data)
        pending_ref.get.return_value = snap_deleting

        # 2. Failure record
        ok_fail, _ = record_deletion_failure_tx(tx, pending_ref, "claim_purity", "Network error")
        self.assertTrue(ok_fail)
        pending_ref.update.assert_not_called()
        pending_ref.delete.assert_not_called()
        self.assertEqual(tx.update.call_count, 2)

        # 3. Finalize
        ok_fin, _ = finalize_deletion_tx(tx, pending_ref, "claim_purity")
        self.assertTrue(ok_fin)
        pending_ref.update.assert_not_called()
        pending_ref.delete.assert_not_called()
        tx.delete.assert_called_once_with(pending_ref)

    def test_failed_fresh_read_cannot_authorize_cleanup(self):
        """If transactional read returns nonexistent snapshot or fails, cleanup must not be authorized."""
        pending_ref = MagicMock()
        pending_ref.id = "scan_missing"
        snap_missing = InMemoryDocSnapshot("scan_missing", None)
        pending_ref.get.return_value = snap_missing
        tx = MagicMock()

        histories_col = MagicMock()
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)

        ok_claim, reason, _ = claim_pending_scan_tx(tx, pending_ref, "claim_missing", cutoff, histories_col)
        self.assertFalse(ok_claim)
        self.assertEqual(reason, "not_found")
        tx.update.assert_not_called()

        ok_fail, fail_reason = record_deletion_failure_tx(tx, pending_ref, "claim_missing", "err")
        self.assertFalse(ok_fail)
        self.assertEqual(fail_reason, "not_found")
        tx.update.assert_not_called()

        # Exception during read must propagate or abort without mutations
        pending_ref_error = MagicMock()
        pending_ref_error.id = "scan_missing"
        pending_ref_error.get.side_effect = Exception("Firestore read timeout")
        with self.assertRaises(Exception):
            claim_pending_scan_tx(tx, pending_ref_error, "claim_missing", cutoff, histories_col)
        tx.update.assert_not_called()

    def test_stale_or_missing_claim_id_cannot_finalize_or_update(self):
        """Missing claim_id, mismatched claim_id, or non-deleting status must reject mutation."""
        pending_ref = MagicMock()
        pending_ref.id = "scan_claim_guard"
        doc_data = {
            "scan_id": "scan_claim_guard",
            "image_path": "anonymous/scan_claim_guard/original.jpg",
            "status": "deleting",
            "claim_id": "active_claim_123"
        }
        snap = InMemoryDocSnapshot("scan_claim_guard", doc_data)
        pending_ref.get.return_value = snap
        tx = MagicMock()

        # Missing claim_id
        self.assertEqual(record_deletion_failure_tx(tx, pending_ref, None, "err")[1], "invalid_claim_id")
        self.assertEqual(record_deletion_failure_tx(tx, pending_ref, "", "err")[1], "invalid_claim_id")
        self.assertEqual(finalize_deletion_tx(tx, pending_ref, None)[1], "invalid_claim_id")
        self.assertEqual(finalize_deletion_tx(tx, pending_ref, "")[1], "invalid_claim_id")

        # Mismatched / stale claim_id
        self.assertEqual(record_deletion_failure_tx(tx, pending_ref, "stale_claim_abc", "err")[1], "claim_lost")
        self.assertEqual(finalize_deletion_tx(tx, pending_ref, "stale_claim_abc")[1], "claim_lost")

        # Non-deleting status
        for non_del_status in ("pending", "completed", "promoted"):
            doc_data["status"] = non_del_status
            snap_status = InMemoryDocSnapshot("scan_claim_guard", doc_data)
            pending_ref.get.return_value = snap_status
            self.assertEqual(record_deletion_failure_tx(tx, pending_ref, "active_claim_123", "err")[1], "invalid_status")
            self.assertEqual(finalize_deletion_tx(tx, pending_ref, "active_claim_123")[1], "invalid_status")

        tx.update.assert_not_called()
        tx.delete.assert_not_called()

    def test_delayed_prediction_cannot_overwrite_deletion_claim(self):
        """A delayed prediction finishing after a deletion claim must fail with 409 Conflict, preserving deletion state."""
        from app import transition_pending_scan_status
        scan_id = "scan_delayed_pred"
        db = InMemoryDB(pending_data={
            scan_id: {
                "scan_id": scan_id,
                "status": "deleting",
                "needs_cleanup": True,
                "claimed_at": datetime.now(timezone.utc).isoformat(),
                "claim_id": "cleanup_worker_1"
            }
        })

        with unittest.mock.patch('models.db', db), \
             unittest.mock.patch('models.pending_scans_collection', db.collection('pending_scans')):
            # Prediction tries to transition to 'completed'
            ok, reason = transition_pending_scan_status(
                scan_id,
                allowed_current_statuses=('processing',),
                update_payload={'status': 'completed', 'predicted_class': 'Mild'}
            )
            self.assertFalse(ok)
            self.assertEqual(reason, "ineligible_status_deleting")
            # Document must remain in status='deleting'
            current_doc = db.get_store('pending_scans')[scan_id]
            self.assertEqual(current_doc["status"], "deleting")
            self.assertTrue(current_doc["needs_cleanup"])

    def test_upload_timeout_404_cleanup_recovers_when_upload_completes_late(self):
        """Upload timeout + 404 delete retains tracking doc; late-arriving image is cleanly recovered and purged by cleanup."""
        scan_id = "scan_late_upload"
        image_path = f"anonymous/{scan_id}/original.jpg"
        db = InMemoryDB(pending_data={
            scan_id: {
                "scan_id": scan_id,
                "image_path": image_path,
                "status": "deleting",
                "needs_cleanup": True,
                "upload_failed": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        })
        storage_client = MagicMock()
        # Late-arriving blob now exists in GCS and delete succeeds
        storage_client.bucket.return_value.blob.return_value.delete.return_value = True

        stats = run_cleanup(db, storage_client, "test-bucket", retention_hours=24, dry_run=False)
        self.assertEqual(stats["evaluated"], 1)
        self.assertEqual(stats["gcs_deleted"], 1)
        self.assertEqual(stats["firestore_deleted"], 1)
        # Blob was deleted from GCS
        storage_client.bucket.return_value.blob.return_value.delete.assert_called_once()
        # Firestore tracking doc was deleted
        self.assertIsNone(db.get_store("pending_scans").get(scan_id))

    def test_transactional_occ_conflict_and_retry_interleaving(self):
        """Concurrent cleanup and promotion: cleanup commits first; promotion retries fresh read and aborts cleanly."""
        scan_id = "scan_occ_interleave"
        user_id = "user_occ_1"
        old_ts = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
        db = InMemoryDB(
            pending_data={
                scan_id: {
                    "scan_id": scan_id,
                    "user_id": user_id,
                    "image_path": f"users/{user_id}/scans/{scan_id}/original.jpg",
                    "status": "pending",
                    "created_at": old_ts
                }
            },
            history_data=[]
        )

        histories_col = db.collection('histories')
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)

        # Cleanup transaction executes and claims
        tx_clean = db.transaction()
        pending_ref = db.collection('pending_scans').document(scan_id)
        ok_claim, reason, _ = claim_pending_scan_tx(tx_clean, pending_ref, "claim_occ", cutoff, histories_col)
        self.assertTrue(ok_claim)
        self.assertEqual(reason, "claimed")
        tx_clean._commit()

        # Now status is 'deleting' in DB
        self.assertEqual(db.get_store('pending_scans')[scan_id]["status"], "deleting")

        # Promotion transaction runs: fresh read sees committed 'deleting' state
        from app import app
        import jwt

        token = jwt.encode(
            {"user_id": user_id, "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
            app.config["SECRET_KEY"],
            algorithm="HS256"
        )
        from constants.policies import POLICY_VERSION

        user_doc = MagicMock()
        user_doc.exists = True
        user_doc.id = user_id
        user_doc.to_dict.return_value = {
            "consents": {
                "terms_accepted": True,
                "medical_disclaimer_acknowledged": True,
                "image_processing_authorized": True,
                "policy_version": POLICY_VERSION,
                "recorded_at": datetime.now(timezone.utc).isoformat()
            }
        }

        with unittest.mock.patch('utils.auth_middleware.users_collection') as mock_users, \
             unittest.mock.patch('models.pending_scans_collection', db.collection('pending_scans')), \
             unittest.mock.patch('models.histories_collection', histories_col), \
             unittest.mock.patch('models.db', db):

            mock_users.document.return_value.get.return_value = user_doc

            client = app.test_client()
            res = client.post('/api/history/',
                json={"scan_id": scan_id},
                headers={"Authorization": f"Bearer {token}"}
            )

            # Promotion must be rejected because scan status was changed to 'deleting' by cleanup
            self.assertEqual(res.status_code, 409)
            self.assertIn("Scan claimed for deletion", res.get_json()["error"])
            # Histories collection must remain empty
            self.assertEqual(len(db.get_store('histories')), 0)

if __name__ == '__main__':
    unittest.main()
