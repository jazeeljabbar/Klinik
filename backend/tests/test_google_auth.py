import unittest
from unittest.mock import patch, MagicMock
import json
from google.auth import exceptions as google_exceptions

from app import app
from constants.policies import POLICY_VERSION

class TestGoogleAuth(unittest.TestCase):
    def setUp(self):
        self.app = app
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()

    def test_google_auth_missing_token_returns_400(self):
        response = self.client.post('/api/auth/google', json={})
        self.assertEqual(response.status_code, 400)
        data = response.get_json()
        self.assertEqual(data.get('error'), 'Missing token')

    @patch('routes.auth.id_token.verify_oauth2_token')
    def test_google_auth_transport_error_returns_503(self, mock_verify):
        mock_verify.side_effect = google_exceptions.TransportError(
            "Could not fetch certificates at https://www.googleapis.com/oauth2/v1/certs"
        )
        response = self.client.post('/api/auth/google', json={'token': 'simulated-google-token'})
        self.assertEqual(response.status_code, 503)
        data = response.get_json()
        self.assertEqual(data.get('error_type'), 'google_auth_unavailable')
        self.assertIn('email and password', data.get('message', '').lower())

    @patch('routes.auth.id_token.verify_oauth2_token')
    def test_google_auth_invalid_token_returns_401(self, mock_verify):
        mock_verify.side_effect = ValueError("Wrong number of segments in token")
        response = self.client.post('/api/auth/google', json={'token': 'bad-token'})
        self.assertEqual(response.status_code, 401)
        data = response.get_json()
        self.assertEqual(data.get('error_type'), 'invalid_token')
        self.assertIn('Invalid Google token', data.get('message', ''))

    @patch('routes.auth.users_collection')
    @patch('routes.auth.get_user_by_email')
    @patch('routes.auth.id_token.verify_oauth2_token')
    def test_google_auth_success_with_consent_required(self, mock_verify, mock_get_user, mock_users_col):
        mock_verify.return_value = {
            'email': 'newuser@example.com',
            'name': 'New User'
        }
        mock_get_user.return_value = None
        
        mock_doc_ref = MagicMock()
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.id = "new_doc_123"
        mock_doc.to_dict.return_value = {
            'email': 'newuser@example.com',
            'name': 'New User',
            'authProvider': 'google'
        }
        mock_doc_ref.get.return_value = mock_doc
        mock_users_col.document.return_value = mock_doc_ref

        response = self.client.post('/api/auth/google', json={'token': 'valid-google-token'})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn('token', data)
        self.assertIn('user', data)
        self.assertTrue(data['user']['consent_required'])

    @patch('routes.auth.get_user_by_email')
    @patch('routes.auth.id_token.verify_oauth2_token')
    def test_google_auth_success_with_consent_satisfied(self, mock_verify, mock_get_user):
        mock_verify.return_value = {
            'email': 'consented@example.com',
            'name': 'Consented User'
        }
        mock_doc = MagicMock()
        mock_doc.exists = True
        mock_doc.id = "consented_doc_456"
        mock_doc.to_dict.return_value = {
            'email': 'consented@example.com',
            'name': 'Consented User',
            'authProvider': 'google',
            'consents': {
                'terms_accepted': True,
                'medical_disclaimer_acknowledged': True,
                'image_processing_authorized': True,
                'policy_version': POLICY_VERSION
            }
        }
        mock_get_user.return_value = mock_doc

        response = self.client.post('/api/auth/google', json={'token': 'valid-google-token'})
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertFalse(data['user']['consent_required'])

if __name__ == '__main__':
    unittest.main()
