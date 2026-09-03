from pathlib import Path

_INSECURE_DEFAULTS = {"changeme", ""}


def collect_configuration_errors(
    secret_key, firebase_web_api_key, resend_api_key, firebase_credentials_path
):
    errors = []

    for env_name, value in (
        ("DJANGO_SECRET_KEY", secret_key),
        ("FIREBASE_WEB_API_KEY", firebase_web_api_key),
        ("RESEND_API_KEY", resend_api_key),
    ):
        if value in _INSECURE_DEFAULTS:
            errors.append(
                f"{env_name} precisa ser definido via variavel de ambiente "
                "em producao."
            )

    if not Path(firebase_credentials_path).is_file():
        errors.append(
            "FIREBASE_CREDENTIALS_PATH nao aponta pra um arquivo existente."
        )

    return errors
