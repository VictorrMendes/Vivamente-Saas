from datetime import timedelta
from unittest.mock import Mock, patch

import requests
from django.db import transaction
from django.test import TestCase, override_settings
from django.utils import timezone

from apps.auth import back_sync
from apps.auth.models import IdentitySyncOutbox, OauthUser

# Chave de teste (RS256) - nao e usada em nenhum ambiente real, so existe
# pra jwt.encode(..., algorithm="RS256") ter uma chave privada valida.
TEST_PRIVATE_KEY = """-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC8sabEeeFACMlE
l3erF2MdNs+lKCx1xKH5ORdsDGLU1Y8PAsCQo108KYV95076jisVw5xEz9g1wuOQ
NDEIVDlhxhiiRdmKW6BKNrGbP8AQxTQ5JK6LbFL3cQENi/QO8taXdVIRM0D/N13Y
QTrM9jZAiVxkAUUlhRgfmDSd1A1nrFnyCCl/R7UQQf0t6fxv/JxkJBfS8WWfk9o/
Fmokb724BaPclHP/FeOGncZw7ssFLePhKLmppgdyERynYPyh18i8Yi2O9kNt7Ah0
A/3IIgtfb9lnZloEeRxq7+wp4VgkNdeiJrkTaUxZJdP4XHslhPQRRJBGk6Kp4kBJ
biD6fe1HAgMBAAECggEARv/je69Oia0kqjoCDa8FnML4e7DzlbaQqbmJLh80+teG
dkP3WBUYKmCHOboU1iMzZAOP47Z/KK91t9djkbo7QyZqM3jr42sZk4Mj7gIdT1Ic
ldnPEWgHidKL7mB4Sz2lcCT1ZcJu1Pksxwe4S9Hi1QK6cGin73e2fYDkX3SgPJ8Q
ZVpsvw5iKh00VZBJ52BDvrIRMXfb5Bljp1WOM+2jHdhNOqZCqSBeyil/ujIcD+3f
wi3hSq8Fx+D76+2fkIBzAEnfr91JM6DR99hCd2xutQdmUnP0Y1Z20haBNUfxVmRM
zbWJSqzqaRFddfjcJaXvrDecAN6BlHJRGb2laGvmbQKBgQDf9eKXj/EvKYas2+bo
nijiOEmDyMd9ashqRuYqXXaH+fyyEXsdYHeTTLlq2Qn+NSaPy9Mfc5cl+XX1sFt1
ajayJnZQRzOfs2NFWMo9P0qCICN0PJ8ykbzoI4rGrPKKK/5PILMuYrkFV5LAu07L
4eFFOzkotYskI2AE9FUrUNvEBQKBgQDXsDLGL0aQhtRpS5MECxwe4bI/aldyTh9T
qYwXyyCwnd/NYZEoPe0AAj6oA5I+mPS7wa9S6pEJsI3IdXTFJW420+jyjKAljdeT
oWnDR0zQOapX2WvYn9lb1NqSj/cuXiUtSMVE73Z1EY3GcEmZf+G6rgAmGgf5x24K
Gm3/TRHZ2wKBgFEIBhQQYJNP0wp4BfPkRaaT9wVXf9ZA7IKHZH+vkVNhf6xt5r2a
Salh+TRPku4HDQy6EokuqWF0ANoEFRNGesO6ZtRk7qi5nxFYLtQ6MhsixbEovfDu
Cgtz0KJRsO+NO1Yl3q7JyWfFZ7OUEc5yy67g3q18AfvxUKx6OtaRSvKBAoGBAMJS
j9w4WaX6o8LeAO1iqQo1o2c5AuIL+nNgzMPfEWuuQSWD4sjTygP5AcRTu13EZrIG
VVQp21RUidjx4auBBqRFFZn5EovjGDd89JGoWk87tPoC/AQmOClhQy9Kn5NZ5LrA
1mI+MIZWs1n2bojqS0/qVl39k/P5Nm3J1BJwuEWDAoGBAIDVHAedcouy3iWSz9S9
6qumpGL9eIHafuv6P8lo731P0X0Iuz8fevFSCRNjUbpJ8i/AfoG7M6cKNNGK2QHE
UG1yEx/RpRTurdDYzepWunupBdAXWEOo1UcerpbAItCZWbRvXOxtumUtQj+zvlls
JKRCwqDRyaYSIz/Knrc9cs9t
-----END PRIVATE KEY-----"""


def _mock_response(status_code):
    resp = Mock()
    resp.status_code = status_code
    return resp


@override_settings(
    BACK_INTERNAL_URL="http://back.local",
    BACK_INTERNAL_SERVICE_PRIVATE_KEY=TEST_PRIVATE_KEY,
)
class EnqueueIdentityEventTests(TestCase):
    """O envio HTTP roda via transaction.on_commit (ver back_sync.py), entao
    so dispara depois que a transacao comita de verdade -
    captureOnCommitCallbacks executa esses callbacks dentro do teste."""

    def setUp(self):
        self.user = OauthUser.objects.create(
            firebase_uid="uid-1", email="a@x.com", role="THERAPIST", active=True
        )

    def _enqueue(self, *args, **kwargs):
        with self.captureOnCommitCallbacks(execute=True):
            return back_sync.enqueue_identity_event(*args, **kwargs)

    @patch("apps.auth.back_sync.requests.put")
    def test_persists_before_attempting_http_call(self, mock_put):
        mock_put.side_effect = requests.exceptions.ConnectionError("boom")

        row = self._enqueue(self.user, IdentitySyncOutbox.PUT)

        self.assertIsNotNone(row)
        self.assertTrue(IdentitySyncOutbox.objects.filter(id=row.id).exists())
        mock_put.assert_called_once()

    @patch("apps.auth.back_sync.requests.put")
    def test_success_marks_row_sent(self, mock_put):
        mock_put.return_value = _mock_response(200)

        row = self._enqueue(self.user, IdentitySyncOutbox.PUT)

        row.refresh_from_db()
        self.assertEqual(row.status, IdentitySyncOutbox.SENT)
        self.assertIsNotNone(row.processed_at)
        self.assertEqual(self.user.identity_version, 1)

    @patch("apps.auth.back_sync.requests.put")
    def test_sends_required_headers_and_body(self, mock_put):
        mock_put.return_value = _mock_response(201)

        self._enqueue(self.user, IdentitySyncOutbox.PUT)

        _, kwargs = mock_put.call_args
        headers = kwargs["headers"]
        self.assertTrue(headers["Authorization"].startswith("Bearer "))
        self.assertIn("Idempotency-Key", headers)
        self.assertIn("X-Request-Id", headers)

    @patch("apps.auth.back_sync.requests.delete")
    def test_delete_event_does_not_persist_version_on_user(self, mock_delete):
        mock_delete.return_value = _mock_response(200)

        self._enqueue(
            self.user, IdentitySyncOutbox.DELETE, persist_version=False
        )

        self.user.refresh_from_db()
        self.assertEqual(self.user.identity_version, 0)

    @patch("apps.auth.back_sync.requests.put")
    def test_timeout_keeps_row_pending_and_counts_attempt(self, mock_put):
        mock_put.side_effect = requests.exceptions.Timeout("slow")

        row = self._enqueue(self.user, IdentitySyncOutbox.PUT)

        row.refresh_from_db()
        self.assertEqual(row.status, IdentitySyncOutbox.PENDING)
        self.assertEqual(row.attempts, 1)

    @patch("apps.auth.back_sync.requests.put")
    def test_401_marks_row_failed_without_retry(self, mock_put):
        mock_put.return_value = _mock_response(401)

        row = self._enqueue(self.user, IdentitySyncOutbox.PUT)

        row.refresh_from_db()
        self.assertEqual(row.status, IdentitySyncOutbox.FAILED)
        self.assertEqual(row.attempts, 1)

    @patch("apps.auth.back_sync.requests.put")
    def test_403_marks_row_failed_without_retry(self, mock_put):
        mock_put.return_value = _mock_response(403)

        row = self._enqueue(self.user, IdentitySyncOutbox.PUT)

        row.refresh_from_db()
        self.assertEqual(row.status, IdentitySyncOutbox.FAILED)

    @patch("apps.auth.back_sync.requests.put")
    def test_send_failure_never_raises_even_on_unexpected_error(self, mock_put):
        mock_put.side_effect = RuntimeError("kaboom")

        row = self._enqueue(self.user, IdentitySyncOutbox.PUT)

        self.assertIsNotNone(row)
        self.assertTrue(IdentitySyncOutbox.objects.filter(id=row.id).exists())

    def test_persistence_failure_propagates_and_rolls_back_user_mutation(self):
        with self.assertRaises(Exception):
            with transaction.atomic():
                self.user.active = False
                self.user.save(update_fields=["active"])
                with patch(
                    "apps.auth.back_sync.IdentitySyncOutbox.objects.create",
                    side_effect=RuntimeError("db down"),
                ):
                    back_sync.enqueue_identity_event(
                        self.user, IdentitySyncOutbox.PUT
                    )

        self.user.refresh_from_db()
        self.assertTrue(self.user.active)


@override_settings(
    BACK_INTERNAL_URL="http://back.local",
    BACK_INTERNAL_SERVICE_PRIVATE_KEY=TEST_PRIVATE_KEY,
)
class ProcessPendingTests(TestCase):
    def setUp(self):
        self.user = OauthUser.objects.create(
            firebase_uid="uid-1", email="a@x.com", role="THERAPIST", active=True
        )

    def _row(self, version, status=IdentitySyncOutbox.PENDING, attempts=0, created_at=None):
        row = IdentitySyncOutbox.objects.create(
            event_type=IdentitySyncOutbox.PUT,
            firebase_uid=self.user.firebase_uid,
            payload={"email": "a@x.com", "role": "THERAPIST", "active": True, "version": version},
            version=version,
            idempotency_key=f"key-{version}",
            attempts=attempts,
            status=status,
        )
        if created_at is not None:
            IdentitySyncOutbox.objects.filter(id=row.id).update(created_at=created_at)
            row.refresh_from_db()
        return row

    @patch("apps.auth.back_sync.requests.put")
    def test_repeated_run_does_not_resend_already_sent_row(self, mock_put):
        mock_put.return_value = _mock_response(200)
        self._row(version=1)

        first = back_sync.process_pending()
        second = back_sync.process_pending()

        self.assertEqual(first, 1)
        self.assertEqual(second, 0)
        self.assertEqual(mock_put.call_count, 1)

    @patch("apps.auth.back_sync.requests.put")
    def test_processes_versions_in_order_and_blocks_on_failure(self, mock_put):
        mock_put.return_value = _mock_response(500)
        self._row(version=1)
        self._row(version=2)

        sent = back_sync.process_pending()

        self.assertEqual(sent, 0)
        # so a v1 foi tentada - v2 fica bloqueada ate v1 sair de PENDING.
        self.assertEqual(mock_put.call_count, 1)
        called_payload = mock_put.call_args.kwargs["data"]
        self.assertIn('"version": 1', called_payload)

    @patch("apps.auth.back_sync.requests.put")
    def test_row_not_yet_due_for_retry_is_skipped(self, mock_put):
        self._row(version=1, attempts=1, created_at=timezone.now())

        sent = back_sync.process_pending()

        self.assertEqual(sent, 0)
        mock_put.assert_not_called()

    @patch("apps.auth.back_sync.requests.put")
    def test_row_past_backoff_window_is_retried(self, mock_put):
        mock_put.return_value = _mock_response(200)
        self._row(
            version=1, attempts=1, created_at=timezone.now() - timedelta(seconds=30)
        )

        sent = back_sync.process_pending()

        self.assertEqual(sent, 1)
        mock_put.assert_called_once()
