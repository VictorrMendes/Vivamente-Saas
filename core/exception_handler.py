from rest_framework.views import exception_handler as drf_exception_handler

from core.responses import error_envelope

_TYPE_SUFFIXES = {
    400: "bad-request",
    401: "invalid-credentials",
    403: "forbidden",
    404: "not-found",
    429: "rate-limited",
}


def oauth_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)

    if response is None:
        return None

    title = getattr(exc, "default_detail", exc.__class__.__name__)
    detail = (
        response.data.get("detail", title)
        if isinstance(response.data, dict)
        else title
    )
    type_suffix = _TYPE_SUFFIXES.get(response.status_code, "error")

    response.data = error_envelope(
        type_suffix=type_suffix,
        title=str(title),
        status_code=response.status_code,
        detail=str(detail),
    )

    return response
