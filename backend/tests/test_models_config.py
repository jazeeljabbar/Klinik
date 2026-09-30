import unittest
from unittest.mock import patch, MagicMock
from models import init_firestore_client, _SafeDummyDB

class TestModelsConfigurationAndSecurity(unittest.TestCase):
    """
    Focused checks proving:
    1. Production initialization failure does NOT activate a dummy database and raises RuntimeError.
    2. Explicit offline tests remain isolated only when KLINIK_OFFLINE_TESTING=1.
    3. Emulator configuration cannot target production (rejects non-loopback and non-demo projects).
    4. Emulator configuration enforces AnonymousCredentials.
    """

    def test_production_init_failure_raises_and_never_activates_dummy(self):
        """In production mode, Firestore initialization failure must raise RuntimeError and never fall back to dummy DB."""
        env = {
            "GOOGLE_CLOUD_PROJECT": "klinik-ai-499720",
            "FIRESTORE_DATABASE_ID": "klinikdb"
        }
        with patch("google.cloud.firestore.Client", side_effect=Exception("Connection to GCP failed")):
            with self.assertRaises(RuntimeError) as ctx:
                init_firestore_client(environ=env)
            self.assertIn("Firestore initialization failed", str(ctx.exception))

    def test_explicit_offline_test_isolation(self):
        """When KLINIK_OFFLINE_TESTING=1 is explicitly set, an isolated test double is returned."""
        env = {
            "KLINIK_OFFLINE_TESTING": "1"
        }
        client = init_firestore_client(environ=env)
        self.assertIsInstance(client, _SafeDummyDB)
        # Verify dummy collection returns empty results and safe objects
        col = client.collection("test")
        self.assertEqual(col.get(), [])
        self.assertFalse(col.exists)

    def test_emulator_config_rejects_non_loopback_host(self):
        """Emulator mode must reject remote or non-loopback addresses."""
        invalid_hosts = [
            "192.168.1.100:8080",
            "10.0.0.1:8080",
            "firestore.googleapis.com:443",
            "example.com:8080"
        ]
        for host in invalid_hosts:
            env = {
                "FIRESTORE_EMULATOR_HOST": host,
                "GOOGLE_CLOUD_PROJECT": "demo-klinik-review"
            }
            with self.assertRaises(ValueError) as ctx:
                init_firestore_client(environ=env)
            self.assertIn("must be a loopback address", str(ctx.exception))

    def test_emulator_config_rejects_production_project_id(self):
        """Emulator mode must reject production project IDs to prevent production contamination."""
        env = {
            "FIRESTORE_EMULATOR_HOST": "127.0.0.1:8080",
            "GOOGLE_CLOUD_PROJECT": "klinik-ai-499720"
        }
        with self.assertRaises(ValueError) as ctx:
            init_firestore_client(environ=env)
        self.assertIn("requires a 'demo-*' project ID", str(ctx.exception))

    def test_emulator_config_uses_anonymous_credentials(self):
        """Emulator mode must construct the client using AnonymousCredentials and loopback."""
        env = {
            "FIRESTORE_EMULATOR_HOST": "127.0.0.1:8080",
            "GOOGLE_CLOUD_PROJECT": "demo-klinik-review"
        }
        with patch("google.cloud.firestore.Client") as mock_client:
            init_firestore_client(environ=env)
            mock_client.assert_called_once()
            call_kwargs = mock_client.call_args[1]
            self.assertEqual(call_kwargs.get("project"), "demo-klinik-review")
            creds = call_kwargs.get("credentials")
            import google.auth.credentials
            self.assertIsInstance(creds, google.auth.credentials.AnonymousCredentials)

if __name__ == "__main__":
    unittest.main()
