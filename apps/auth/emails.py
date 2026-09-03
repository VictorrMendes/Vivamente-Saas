import resend
from django.conf import settings

from core.exceptions import ExternalServiceError


class EmailDeliveryError(ExternalServiceError):
    pass


def _send(to_email, subject, html):
    resend.api_key = settings.RESEND_API_KEY

    try:
        resend.Emails.send(
            {
                "from": settings.RESEND_FROM_EMAIL,
                "to": [to_email],
                "subject": subject,
                "html": html,
            }
        )
    except Exception as exc:
        raise EmailDeliveryError("Falha ao enviar e-mail via Resend.") from exc


def send_verification_email(to_email, link):
    _send(
        to_email,
        "Confirme seu e-mail - VivaMente",
        f'<p>Clique para confirmar seu e-mail: <a href="{link}">{link}</a></p>',
    )


def send_password_reset_email(to_email, link):
    _send(
        to_email,
        "Redefinição de senha - VivaMente",
        f'<p>Clique para redefinir sua senha: <a href="{link}">{link}</a></p>',
    )
