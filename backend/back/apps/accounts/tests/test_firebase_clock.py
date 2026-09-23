import datetime
from unittest.mock import patch

import firebase_admin
from firebase_admin import auth
from google.auth.credentials import AnonymousCredentials
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
import jwt
from django.test import SimpleTestCase, override_settings

from rest_framework.exceptions import AuthenticationFailed
from rest_framework.test import APIRequestFactory
from apps.accounts.authentication import FirebaseAuthentication

@override_settings(DEBUG=False)
class FirebaseClockSkewTests(SimpleTestCase):
    """JWTs RS256 reais; apenas certificados e cadastro remoto sao simulados."""
    def setUp(self):
        self.now = datetime.datetime(2026, 9, 23, 14, 0, 0)
        self.timestamp = int(self.now.replace(tzinfo=datetime.timezone.utc).timestamp())
        self.key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        public_key = self.key.public_key().public_bytes(
            serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo,
        ).decode()
        self.app = firebase_admin.initialize_app(
            AnonymousCredentials(), {'projectId':'clock-test'}, name='clock-skew-test',
        )
        self.addCleanup(firebase_admin.delete_app, self.app)
        client = auth._get_client(self.app)
        self.remote_user = auth.UserRecord({'localId':'test-uid','validSince':'0','disabled':False})
        self.remote_lookup = patch.object(client, 'get_user', return_value=self.remote_user).start()
        self.addCleanup(patch.stopall)
        patch('firebase_admin.auth._get_client', return_value=client).start()
        patch('google.oauth2.id_token._fetch_certs', return_value={'test-key':public_key}).start()
        patch('google.auth._helpers.utcnow', return_value=self.now).start()
        patch('apps.accounts.authentication._get_firebase_app', return_value=self.app).start()
        patch('apps.accounts.authentication.User.objects.filter').start()

    def token(self, iat_offset=2, exp_offset=3600, audience='clock-test', key=None):
        return jwt.encode({
            'iss':'https://securetoken.google.com/clock-test',
            'aud':audience, 'sub':'test-uid',
            'iat':self.timestamp + iat_offset, 'exp':self.timestamp + exp_offset,
            'auth_time':self.timestamp - 60,
        }, key or self.key, algorithm='RS256', headers={'kid':'test-key'})

    def verify(self, token):
        request = APIRequestFactory().get('/api/v1/me', HTTP_AUTHORIZATION='Bearer ' + token)
        return FirebaseAuthentication().authenticate(request)

    def test_accepts_token_issued_two_seconds_ahead(self):
        self.verify(self.token())
        self.remote_lookup.assert_called_once_with('test-uid')

    def test_rejects_token_issued_beyond_tolerance(self):
        with self.assertRaises(AuthenticationFailed):
            self.verify(self.token(iat_offset=6))

    def test_accepts_token_at_five_second_boundary(self):
        self.verify(self.token(iat_offset=5))

    def test_rejects_expired_token_beyond_tolerance(self):
        with self.assertRaises(AuthenticationFailed):
            self.verify(self.token(iat_offset=-100, exp_offset=-6))

    def test_rejects_wrong_signature(self):
        other_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        with self.assertRaises(AuthenticationFailed):
            self.verify(self.token(key=other_key))

    def test_rejects_other_project(self):
        with self.assertRaises(AuthenticationFailed):
            self.verify(self.token(audience='other-project'))

    def test_rejects_revoked_token(self):
        self.remote_lookup.return_value = auth.UserRecord({
            'localId':'test-uid','validSince':str(self.timestamp),'disabled':False,
        })
        with self.assertRaises(AuthenticationFailed):
            self.verify(self.token(iat_offset=-1))

    def test_rejects_disabled_user(self):
        self.remote_lookup.return_value = auth.UserRecord({
            'localId':'test-uid','validSince':'0','disabled':True,
        })
        with self.assertRaises(AuthenticationFailed):
            self.verify(self.token())
