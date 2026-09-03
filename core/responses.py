from django.utils import timezone

from core.request_id import get_request_id


def success_envelope(data, request_id=None):
    return {
        "data": data,
        "meta": {
            "request_id": request_id or get_request_id(),
            "timestamp": timezone.now().isoformat(),
        },
    }


def error_envelope(type_suffix, title, status_code, detail, errors=None, request_id=None):
    return {
        "type": f"https://api.vivamenteterapias.com.br/errors/{type_suffix}",
        "title": title,
        "status": status_code,
        "detail": detail,
        "request_id": request_id or get_request_id(),
        "errors": errors or [],
    }
