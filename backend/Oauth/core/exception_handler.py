import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

from core.exceptions import ExternalServiceError
from core.responses import error_envelope

logger = logging.getLogger(__name__)

_TYPE_SUFFIXES = {
    400: "bad-request",
    401: "invalid-credentials",
    403: "forbidden",
    404: "not-found",
    429: "rate-limited",
    502: "external-service-error",
    500: "internal-error",
}


def oauth_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)

    if response is not None:
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

    if isinstance(exc, ExternalServiceError):
        logger.warning("external service error: %s", exc)

        return Response(
            error_envelope(
                type_suffix="external-service-error",
                title="External Service Error",
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=str(exc),
            ),
            status=status.HTTP_502_BAD_GATEWAY,
        )

    logger.exception("unhandled exception")

    return Response(
        error_envelope(
            type_suffix="internal-error",
            title="Internal Server Error",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ocorreu um erro inesperado.",
        ),
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
