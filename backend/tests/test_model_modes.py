import os
import unittest
from unittest.mock import patch, MagicMock
from io import BytesIO
from PIL import Image
from tests.mock_firestore import InMemoryDB

class TestModelModesAndStorageSecurity(unittest.TestCase):
    """
    Verifies:
    1. Outside demo mode, missing model returns HTTP 503 before any upload or Firestore write,
       ensuring no upload occurs, no tracking record is created, and no deletion is needed.
    2. If a model-unavailable condition occurs post-upload, guarded recovery flow is used,
       preserving durable tracking if storage deletion is unsuccessful or ambiguous.
    3. In explicit demo mode (KLINIK_DEMO_MODE=1 or KLINIK_OFFLINE_TESTING=1), missing model returns
       HTTP 200 with simulated_analysis=True and model_mode='simulated_local_demo'.
    4. Storage service requires explicit configuration and never defaults to local storage on missing credentials.
    """

    def setUp(self):
        self.db = InMemoryDB()

    def _create_test_image(self):
        img_byte_arr = BytesIO()
        image = Image.new("RGB", (900, 900), color=(180, 160, 140))
        image.save(img_byte_arr, format="JPEG")
        img_byte_arr.seek(0)
        return img_byte_arr

    def test_missing_model_outside_demo_mode_returns_503_before_upload_or_tracking(self):
        """When model is None outside demo mode, /predict returns 503 with no upload, no tracking, and no deletion."""
        from app import app
        client = app.test_client()

        mock_delete = MagicMock()
        mock_upload = MagicMock(return_value="anonymous/test_scan/original.jpg")

        with patch.dict(os.environ, {
            "KLINIK_DEMO_MODE": "0",
            "KLINIK_OFFLINE_TESTING": "0",
            "KLINIK_ALLOW_SIMULATED_PREDICTIONS": "0"
        }, clear=False):
            with patch("app.model", None), \
                 patch("models.db", self.db), \
                 patch("models.pending_scans_collection", self.db.collection("pending_scans")), \
                 patch("services.storage_service.upload_image_to_gcs", mock_upload), \
                 patch("services.storage_service.delete_image_from_gcs", mock_delete), \
                 patch("services.storage_service.generate_signed_url", return_value="http://signed-url"):

                img_data = self._create_test_image()
                data = {
                    "image": (img_data, "test.jpg"),
                    "guest_consent": "true",
                    "disclosure_version": "2026-09-24.1"
                }
                response = client.post("/predict", data=data, content_type="multipart/form-data")

                # 1. Assert HTTP 503 returned with error_type=model_unavailable
                self.assertEqual(response.status_code, 503)
                json_data = response.get_json()
                self.assertEqual(json_data.get("error"), "Prediction unavailable")
                self.assertEqual(json_data.get("error_type"), "model_unavailable")
                self.assertIn("unavailable", json_data.get("message", ""))

                # 2. Assert no image upload occurs
                mock_upload.assert_not_called()

                # 3. Assert no pending scan record is created
                pending_keys = [k for k in self.db.get_store("pending_scans").keys() if not k.startswith("__ver_")]
                self.assertEqual(len(pending_keys), 0)

                # 4. Assert no deletion is needed or called
                mock_delete.assert_not_called()

    def test_post_upload_model_unavailable_uses_guarded_recovery_and_preserves_tracking_on_failure(self):
        """If a post-upload model-unavailable condition occurs, guarded recovery preserves tracking when deletion fails."""
        from app import app
        client = app.test_client()

        # Simulate upload success, but deletion failure on cleanup
        mock_upload = MagicMock(return_value="anonymous/test_post_upload/original.jpg")
        mock_delete = MagicMock(return_value=False)

        # Allow initial check to pass by having model truthy at entry, then None at prediction
        class TransientModelWrapper:
            def __init__(self):
                self._calls = 0

            def __bool__(self):
                return True

            def predict(self, *args, **kwargs):
                raise RuntimeError("Inference engine crashed")

        with patch.dict(os.environ, {
            "KLINIK_DEMO_MODE": "0",
            "KLINIK_OFFLINE_TESTING": "0",
            "KLINIK_ALLOW_SIMULATED_PREDICTIONS": "0"
        }, clear=False):
            with patch("app.model", TransientModelWrapper()), \
                 patch("models.db", self.db), \
                 patch("models.pending_scans_collection", self.db.collection("pending_scans")), \
                 patch("services.storage_service.upload_image_to_gcs", mock_upload), \
                 patch("services.storage_service.delete_image_from_gcs", mock_delete), \
                 patch("services.storage_service.generate_signed_url", return_value="http://signed-url"), \
                 patch("app.detect_face", return_value=(True, 1, "Face detected")):

                img_data = self._create_test_image()
                data = {
                    "image": (img_data, "test.jpg"),
                    "guest_consent": "true",
                    "disclosure_version": "2026-09-24.1"
                }
                response = client.post("/predict", data=data, content_type="multipart/form-data")
                # Fails closed on exception with 500 or 503
                self.assertIn(response.status_code, (500, 503))

                # Since deletion failed (returned False), tracking record MUST be preserved with needs_cleanup
                pending_keys = [k for k in self.db.get_store("pending_scans").keys() if not k.startswith("__ver_")]
                self.assertEqual(len(pending_keys), 1)
                doc = self.db.get_store("pending_scans")[pending_keys[0]]
                self.assertEqual(doc.get("status"), "deleting")
                self.assertTrue(doc.get("needs_cleanup"))

    def test_missing_model_in_demo_mode_returns_simulated_200(self):
        """When model is None in explicit demo mode, /predict returns 200 with simulated_analysis=True."""
        from app import app
        client = app.test_client()

        mock_upload = MagicMock(return_value="anonymous/test_scan/original.jpg")

        with patch.dict(os.environ, {
            "KLINIK_DEMO_MODE": "1",
            "KLINIK_OFFLINE_TESTING": "1",
            "KLINIK_LOCAL_STORAGE": "1"
        }, clear=False):
            with patch("app.model", None), \
                 patch("models.db", self.db), \
                 patch("models.pending_scans_collection", self.db.collection("pending_scans")), \
                 patch("services.storage_service.upload_image_to_gcs", mock_upload), \
                 patch("services.storage_service.generate_signed_url", return_value="http://signed-url"):

                img_data = self._create_test_image()
                data = {
                    "image": (img_data, "test.jpg"),
                    "guest_consent": "true",
                    "disclosure_version": "2026-09-24.1"
                }
                response = client.post("/predict", data=data, content_type="multipart/form-data")
                self.assertEqual(response.status_code, 200)
                json_data = response.get_json()
                self.assertTrue(json_data.get("simulated_analysis"))
                self.assertEqual(json_data.get("model_mode"), "simulated_local_demo")
                self.assertIn("Local demo", json_data.get("model_notice", ""))

    def test_storage_service_requires_explicit_local_configuration(self):
        """Absence of credentials must not trigger local storage; explicit config is required."""
        from services.storage_service import is_local_storage

        # With no local/test flags set:
        with patch.dict(os.environ, {
            "KLINIK_LOCAL_STORAGE": "0",
            "KLINIK_OFFLINE_TESTING": "0",
            "KLINIK_SYNTHETIC_STORAGE": "0"
        }, clear=False):
            self.assertFalse(is_local_storage())

        # With explicit local storage flag:
        with patch.dict(os.environ, {"KLINIK_LOCAL_STORAGE": "1"}, clear=False):
            self.assertTrue(is_local_storage())

        # With explicit offline testing flag:
        with patch.dict(os.environ, {"KLINIK_OFFLINE_TESTING": "1"}, clear=False):
            self.assertTrue(is_local_storage())

if __name__ == "__main__":
    unittest.main()
