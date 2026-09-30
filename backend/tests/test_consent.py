import unittest
from unittest.mock import MagicMock, patch
import json
import jwt
from datetime import datetime, timezone, timedelta

from constants.policies import (
    POLICY_VERSION,
    TERMS_VERSION,
    PRIVACY_VERSION,
    MEDICAL_DISCLAIMER_VERSION,
    IMAGE_PROCESSING_CONSENT_VERSION
)
from routes.auth import check_user_consent
import services.storage_service
from tests.mock_firestore import InMemoryDB

class TestConsentLogic(unittest.TestCase):

    def test_check_user_consent_complete(self):
        user_data = {
            "consents": {
                "terms_accepted": True,
                "medical_disclaimer_acknowledged": True,
                "image_processing_authorized": True,
                "policy_version": POLICY_VERSION,
                "recorded_at": datetime.now(timezone.utc).isoformat()
            }
        }
        self.assertTrue(check_user_consent(user_data))

    def test_check_user_consent_missing_or_false(self):
        # Empty dict
        self.assertFalse(check_user_consent({}))
        # Missing one flag
        self.assertFalse(check_user_consent({
            "consents": {
                "terms_accepted": True,
                "medical_disclaimer_acknowledged": False,
                "image_processing_authorized": True
            }
        }))
        # Non-dict
        self.assertFalse(check_user_consent(None))
        self.assertFalse(check_user_consent("consents"))

    def test_check_user_consent_outdated_policy_version(self):
        # Consents with older policy version
        user_data = {
            "consents": {
                "terms_accepted": True,
                "medical_disclaimer_acknowledged": True,
                "image_processing_authorized": True,
                "policy_version": "2024-01-01",  # outdated version
                "recorded_at": datetime.now(timezone.utc).isoformat()
            }
        }
        self.assertFalse(check_user_consent(user_data))

    @patch('routes.auth.users_collection')
    def test_signup_missing_consent(self, mock_users):
        from app import app
        client = app.test_client()
        
        # Missing consent entirely
        res = client.post('/api/auth/signup', json={
            "name": "Jane Doe",
            "email": "jane@example.com",
            "phone": "1234567890",
            "gender": "Female",
            "age": 25,
            "password": "Password123"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("Missing consent", res.get_json()["error"])

    @patch('routes.auth.users_collection')
    def test_signup_incomplete_consent(self, mock_users):
        from app import app
        client = app.test_client()
        
        res = client.post('/api/auth/signup', json={
            "name": "Jane Doe",
            "email": "jane@example.com",
            "phone": "1234567890",
            "gender": "Female",
            "age": 25,
            "password": "Password123",
            "consent": {
                "terms_accepted": True,
                "medical_disclaimer_acknowledged": True,
                "image_processing_authorized": False
            }
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("Consent required", res.get_json()["error"])

    @patch('routes.auth.get_user_by_email')
    @patch('routes.auth.get_user_by_phone')
    @patch('routes.auth.users_collection')
    def test_signup_with_valid_consent_stores_utc_timestamp(self, mock_users, mock_phone, mock_email):
        from app import app
        mock_email.return_value = None
        mock_phone.return_value = None
        mock_doc_ref = MagicMock()
        mock_doc_ref.id = "user_new_123"
        mock_users.document.return_value = mock_doc_ref

        client = app.test_client()
        res = client.post('/api/auth/signup', json={
            "name": "Jane Doe",
            "email": "jane@example.com",
            "phone": "1234567890",
            "gender": "Female",
            "age": 25,
            "password": "Password123",
            "consent": {
                "terms_accepted": True,
                "medical_disclaimer_acknowledged": True,
                "image_processing_authorized": True,
                "client_timestamp": "2020-01-01T00:00:00Z"  # Client timestamp must be ignored
            }
        })
        self.assertEqual(res.status_code, 201)
        # Verify stored consent
        stored_user = mock_doc_ref.set.call_args[0][0]
        self.assertIn("consents", stored_user)
        consents = stored_user["consents"]
        self.assertTrue(consents["terms_accepted"])
        self.assertTrue(consents["medical_disclaimer_acknowledged"])
        self.assertTrue(consents["image_processing_authorized"])
        self.assertEqual(consents["policy_version"], POLICY_VERSION)
        # Authoritative server UTC timestamp, not client timestamp
        self.assertNotEqual(consents["recorded_at"], "2020-01-01T00:00:00Z")

    @patch('routes.auth.users_collection')
    def test_consent_endpoint_requires_auth(self, mock_users):
        from app import app
        client = app.test_client()
        res = client.post('/api/auth/consent', json={
            "terms_accepted": True,
            "medical_disclaimer_acknowledged": True,
            "image_processing_authorized": True
        })
        self.assertEqual(res.status_code, 401)

    @patch('routes.auth.users_collection')
    def test_predict_invalid_bearer_token_not_treated_as_guest(self, mock_users):
        from app import app
        client = app.test_client()
        # Invalid bearer token with guest_consent form field should NOT be treated as guest
        res = client.post('/predict',
            data={
                "image": (b"dummy_image_data", "test.jpg"),
                "guest_consent": "true"
            },
            headers={"Authorization": "Bearer invalid.fake.token"}
        )
        self.assertEqual(res.status_code, 401)
        self.assertEqual(res.get_json()["error"], "Unauthorized")

    def test_predict_guest_requires_disclosure_acknowledgement(self):
        from app import app
        client = app.test_client()
        # Guest upload without guest_consent
        res = client.post('/predict',
            data={
                "image": (b"dummy_image_data", "test.jpg")
            }
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("Guest disclosure acknowledgement required", res.get_json()["error"])

    @patch('utils.auth_middleware.users_collection')
    def test_history_post_blocks_unconsented_user(self, mock_users):
        from app import app
        # Generate valid token for user without consent
        user_id = "user_no_consent"
        token = jwt.encode(
            {"user_id": user_id, "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
            app.config["SECRET_KEY"],
            algorithm="HS256"
        )
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.id = user_id
        mock_doc.to_dict.return_value = {
            "name": "Old User",
            "email": "old@example.com"
            # No consents block!
        }
        mock_users.document.return_value.get.return_value = mock_doc

        client = app.test_client()
        res = client.post('/api/history/',
            json={"scan_id": "any_scan_id"},
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(res.status_code, 403)
        self.assertIn("Consent required", res.get_json()["error"])

    @patch('routes.auth.get_user_by_email')
    @patch('routes.auth.users_collection')
    @patch('routes.auth.id_token.verify_oauth2_token')
    def test_google_auth_new_user_requires_consent(self, mock_verify, mock_users, mock_get_user):
        from app import app
        mock_verify.return_value = {"email": "newgoogle@example.com", "name": "New Google User"}
        mock_get_user.return_value = None
        
        mock_doc_ref = MagicMock()
        mock_doc_ref.id = "new_google_id"
        new_doc = MagicMock()
        new_doc.id = "new_google_id"
        new_doc.to_dict.return_value = {
            "name": "New Google User",
            "email": "newgoogle@example.com",
            "authProvider": "google"
        }
        mock_doc_ref.get.return_value = new_doc
        mock_users.document.return_value = mock_doc_ref

        client = app.test_client()
        res = client.post('/api/auth/google', json={"token": "valid_google_token"})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["user"]["consent_required"])

    @patch('routes.auth.get_user_by_email')
    @patch('routes.auth.id_token.verify_oauth2_token')
    def test_google_auth_returning_unconsented_user_requires_consent(self, mock_verify, mock_get_user):
        from app import app
        mock_verify.return_value = {"email": "oldgoogle@example.com", "name": "Old Google User"}
        
        existing_doc = MagicMock()
        existing_doc.id = "old_google_id"
        existing_doc.to_dict.return_value = {
            "name": "Old Google User",
            "email": "oldgoogle@example.com",
            "authProvider": "google"
            # No consents block
        }
        mock_get_user.return_value = existing_doc

        client = app.test_client()
        res = client.post('/api/auth/google', json={"token": "valid_google_token"})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["user"]["consent_required"])

    @patch('routes.auth.get_user_by_email')
    @patch('routes.auth.id_token.verify_oauth2_token')
    def test_google_auth_returning_consented_user_consent_false(self, mock_verify, mock_get_user):
        from app import app
        mock_verify.return_value = {"email": "consented@example.com", "name": "Consented Google User"}
        
        consented_doc = MagicMock()
        consented_doc.id = "consented_google_id"
        consented_doc.to_dict.return_value = {
            "name": "Consented Google User",
            "email": "consented@example.com",
            "authProvider": "google",
            "consents": {
                "terms_accepted": True,
                "medical_disclaimer_acknowledged": True,
                "image_processing_authorized": True,
                "policy_version": POLICY_VERSION,
                "recorded_at": datetime.now(timezone.utc).isoformat()
            }
        }
        mock_get_user.return_value = consented_doc

        client = app.test_client()
        res = client.post('/api/auth/google', json={"token": "valid_google_token"})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertFalse(data["user"]["consent_required"])

    @patch('utils.auth_middleware.users_collection')
    def test_get_current_user_valid_token(self, mock_users):
        from app import app
        user_id = "user_me_valid"
        token = jwt.encode(
            {"user_id": user_id, "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
            app.config["SECRET_KEY"],
            algorithm="HS256"
        )
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.id = user_id
        mock_doc.to_dict.return_value = {
            "name": "Valid User",
            "email": "valid@example.com",
            "consents": {
                "terms_accepted": True,
                "medical_disclaimer_acknowledged": True,
                "image_processing_authorized": True,
                "policy_version": POLICY_VERSION,
                "recorded_at": datetime.now(timezone.utc).isoformat()
            }
        }
        mock_users.document.return_value.get.return_value = mock_doc

        client = app.test_client()
        res = client.get('/api/auth/me', headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res.status_code, 200)
        user_data = res.get_json()["user"]
        self.assertFalse(user_data["consent_required"])
        self.assertEqual(user_data["email"], "valid@example.com")

    @patch('utils.auth_middleware.users_collection')
    def test_get_current_user_outdated_policy_requires_renewed_consent(self, mock_users):
        from app import app
        user_id = "user_me_outdated"
        token = jwt.encode(
            {"user_id": user_id, "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
            app.config["SECRET_KEY"],
            algorithm="HS256"
        )
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.id = user_id
        mock_doc.to_dict.return_value = {
            "name": "Outdated User",
            "email": "outdated@example.com",
            "consents": {
                "terms_accepted": True,
                "medical_disclaimer_acknowledged": True,
                "image_processing_authorized": True,
                "policy_version": "2024-01-01",  # Outdated
                "recorded_at": datetime.now(timezone.utc).isoformat()
            }
        }
        mock_users.document.return_value.get.return_value = mock_doc

        client = app.test_client()
        res = client.get('/api/auth/me', headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(res.status_code, 200)
        user_data = res.get_json()["user"]
        self.assertTrue(user_data["consent_required"])

    def test_get_current_user_expired_token(self):
        from app import app
        expired_token = jwt.encode(
            {"user_id": "user_exp", "exp": datetime.now(timezone.utc) - timedelta(hours=1)},
            app.config["SECRET_KEY"],
            algorithm="HS256"
        )
        client = app.test_client()
        res = client.get('/api/auth/me', headers={"Authorization": f"Bearer {expired_token}"})
        self.assertEqual(res.status_code, 401)
        self.assertEqual(res.get_json()["error"], "Unauthorized")

    @patch('routes.auth.users_collection')
    def test_consent_endpoint_records_and_returns_updated_user(self, mock_users):
        from app import app
        user_id = "user_record_consent"
        token = jwt.encode(
            {"user_id": user_id, "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
            app.config["SECRET_KEY"],
            algorithm="HS256"
        )
        mock_doc_ref = MagicMock()
        initial_doc = MagicMock()
        initial_doc.exists = True
        initial_doc.id = user_id
        initial_doc.to_dict.return_value = {"name": "User", "email": "user@example.com"}

        updated_doc = MagicMock()
        updated_doc.exists = True
        updated_doc.id = user_id
        updated_doc.to_dict.return_value = {
            "name": "User",
            "email": "user@example.com",
            "consents": {
                "terms_accepted": True,
                "medical_disclaimer_acknowledged": True,
                "image_processing_authorized": True,
                "policy_version": POLICY_VERSION,
                "recorded_at": datetime.now(timezone.utc).isoformat()
            }
        }
        mock_doc_ref.get.side_effect = [initial_doc, updated_doc]
        mock_users.document.return_value = mock_doc_ref

        client = app.test_client()
        res = client.post('/api/auth/consent',
            json={
                "terms_accepted": True,
                "medical_disclaimer_acknowledged": True,
                "image_processing_authorized": True
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("user", data)
        self.assertFalse(data["user"]["consent_required"])
        self.assertEqual(data["user"]["consents"]["policy_version"], POLICY_VERSION)

    @patch('app.detect_face')
    @patch('services.storage_service.delete_image_from_gcs')
    @patch('services.storage_service.upload_image_to_gcs')
    def test_predict_low_confidence_cleans_up_gcs_image(self, mock_upload, mock_delete, mock_face):
        import app as app_module
        import io
        from PIL import Image
        import numpy as np

        mock_face.return_value = (True, 1, "Face detected")
        mock_upload.return_value = "anonymous/scan_low_conf/original.jpg"
        mock_delete.return_value = True

        buf = io.BytesIO()
        Image.new('RGB', (100, 100), color='white').save(buf, format='JPEG')
        valid_jpeg = buf.getvalue()

        # Mock model to return low confidence (< 50% threshold)
        mock_model = MagicMock()
        mock_model.predict.return_value = np.array([[0.30, 0.25, 0.25, 0.20]])
        
        db = InMemoryDB()
        orig_model = app_module.model
        app_module.model = mock_model
        try:
            with patch('models.db', db), patch('models.pending_scans_collection', db.collection('pending_scans')):
                client = app_module.app.test_client()
                res = client.post('/predict',
                    data={
                        "image": (io.BytesIO(valid_jpeg), "face.jpg"),
                        "guest_consent": "true"
                    },
                    content_type='multipart/form-data'
                )
                self.assertEqual(res.status_code, 200)
                self.assertEqual(res.get_json()["error_type"], "low_confidence")
                mock_delete.assert_called_once_with("anonymous/scan_low_conf/original.jpg")
                # When deletion succeeds, pending scan doc is removed
                scan_ids = [k for k in db.get_store('pending_scans').keys() if not k.startswith('__ver_')]
                self.assertTrue(len(scan_ids) >= 1)
                self.assertIsNone(db.get_store('pending_scans')[scan_ids[0]])
        finally:
            app_module.model = orig_model

    @patch('app.detect_face')
    @patch('services.storage_service.delete_image_from_gcs')
    @patch('services.storage_service.upload_image_to_gcs')
    def test_predict_low_confidence_immediate_delete_returns_false_persists_deleting_status(
        self, mock_upload, mock_delete, mock_face
    ):
        """When immediate delete returns False, tracking record is retained with status='deleting' and needs_cleanup=True."""
        import app as app_module
        import io
        from PIL import Image
        import numpy as np

        mock_face.return_value = (True, 1, "Face detected")
        mock_upload.return_value = "anonymous/scan_low_del_fail/original.jpg"
        # Simulate GCS deletion failing or returning False
        mock_delete.return_value = False

        buf = io.BytesIO()
        Image.new('RGB', (100, 100), color='white').save(buf, format='JPEG')
        valid_jpeg = buf.getvalue()

        mock_model = MagicMock()
        mock_model.predict.return_value = np.array([[0.30, 0.25, 0.25, 0.20]])
        
        db = InMemoryDB()
        orig_model = app_module.model
        app_module.model = mock_model
        try:
            with patch('models.db', db), patch('models.pending_scans_collection', db.collection('pending_scans')):
                client = app_module.app.test_client()
                res = client.post('/predict',
                    data={
                        "image": (io.BytesIO(valid_jpeg), "face.jpg"),
                        "guest_consent": "true"
                    },
                    content_type='multipart/form-data'
                )
                self.assertEqual(res.status_code, 200)
                self.assertEqual(res.get_json()["error_type"], "low_confidence")
                # Verified that Firestore tracking doc was NOT deleted, but updated to deleting + needs_cleanup
                scan_ids = [k for k in db.get_store('pending_scans').keys() if not k.startswith('__ver_')]
                self.assertTrue(len(scan_ids) >= 1)
                doc = db.get_store('pending_scans')[scan_ids[0]]
                self.assertIsNotNone(doc)
                self.assertEqual(doc['status'], 'deleting')
                self.assertTrue(doc['needs_cleanup'])
                self.assertEqual(doc['last_deletion_error'], 'Immediate GCS deletion returned False')
        finally:
            app_module.model = orig_model

    @patch('services.storage_service.delete_image_from_gcs')
    @patch('services.storage_service.upload_image_to_gcs')
    def test_predict_exception_cleans_up_gcs_image(self, mock_upload, mock_delete):
        import app as app_module
        import io
        from PIL import Image

        mock_upload.return_value = "anonymous/scan_err/original.jpg"
        mock_delete.return_value = True

        buf = io.BytesIO()
        Image.new('RGB', (100, 100), color='white').save(buf, format='JPEG')
        valid_jpeg = buf.getvalue()

        db = InMemoryDB()
        with patch('models.db', db), \
             patch('models.pending_scans_collection', db.collection('pending_scans')), \
             patch('app.model', MagicMock()), \
             patch('app.detect_face', side_effect=RuntimeError("OpenCV crash")):
            client = app_module.app.test_client()
            res = client.post('/predict',
                data={
                    "image": (io.BytesIO(valid_jpeg), "face.jpg"),
                    "guest_consent": "true"
                },
                content_type='multipart/form-data'
            )
            self.assertEqual(res.status_code, 500)
            mock_delete.assert_called_once_with("anonymous/scan_err/original.jpg")

    @patch('services.storage_service.delete_image_from_gcs')
    @patch('services.storage_service.upload_image_to_gcs')
    def test_predict_upload_failure_persists_durable_tracking(self, mock_upload, mock_delete):
        """Process/upload failure preserves durable cleanup tracking record with needs_cleanup."""
        import app as app_module
        import io
        from PIL import Image

        # Upload times out or fails
        mock_upload.side_effect = TimeoutError("Storage connection timed out")
        mock_delete.return_value = False

        buf = io.BytesIO()
        Image.new('RGB', (100, 100), color='white').save(buf, format='JPEG')
        valid_jpeg = buf.getvalue()

        db = InMemoryDB()
        with patch('models.db', db), \
             patch('models.pending_scans_collection', db.collection('pending_scans')), \
             patch('app.model', MagicMock()):
            client = app_module.app.test_client()
            res = client.post('/predict',
                data={
                    "image": (io.BytesIO(valid_jpeg), "face.jpg"),
                    "guest_consent": "true"
                },
                content_type='multipart/form-data'
            )
            self.assertEqual(res.status_code, 500)
            # Tracking record was created and updated to deleting + needs_cleanup + upload_failed
            scan_ids = [k for k in db.get_store('pending_scans').keys() if not k.startswith('__ver_')]
            self.assertTrue(len(scan_ids) >= 1)
            doc = db.get_store('pending_scans')[scan_ids[0]]
            self.assertIsNotNone(doc)
            self.assertEqual(doc['status'], 'deleting')
            self.assertTrue(doc['needs_cleanup'])
            self.assertTrue(doc['upload_failed'])
            self.assertIn("Storage connection timed out", doc['last_deletion_error'])

    @patch('services.storage_service.delete_image_from_gcs')
    @patch('services.storage_service.upload_image_to_gcs')
    def test_predict_exception_after_completion_does_not_delete_valid_image(self, mock_upload, mock_delete):
        """An unexpected error occurring after successful pending scan persistence must NOT delete the valid image."""
        import app as app_module
        import io
        from PIL import Image

        mock_upload.return_value = "anonymous/scan_valid/original.jpg"

        buf = io.BytesIO()
        Image.new('RGB', (100, 100), color='white').save(buf, format='JPEG')
        valid_jpeg = buf.getvalue()

        import numpy as np
        mock_model = MagicMock()
        mock_model.predict.return_value = np.array([[0.1, 0.7, 0.1, 0.1]])

        db = InMemoryDB()
        # Simulate exception during post-save processing / response generation
        with patch('models.db', db), \
             patch('models.pending_scans_collection', db.collection('pending_scans')), \
             patch('app.model', mock_model), \
             patch('app.detect_face', return_value=(True, 1, "Face detected")), \
             patch('app.jsonify', side_effect=Exception("Response formatting crash")):
            client = app_module.app.test_client()
            res = client.post('/predict',
                data={
                    "image": (io.BytesIO(valid_jpeg), "face.jpg"),
                    "guest_consent": "true"
                },
                content_type='multipart/form-data'
            )
            self.assertEqual(res.status_code, 500)
            # Crucial check: delete_image_from_gcs must NOT have been called because completed_persisted was True!
            mock_delete.assert_not_called()

if __name__ == '__main__':
    unittest.main()
