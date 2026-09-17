from django.core.exceptions import ValidationError

# Rotas estáticas da loja e nomes destinados ao catálogo/institucional.
RESERVED_PUBLIC_SLUGS = frozenset({
    "contato", "sobre", "privacidade", "termos", "terapeutas",
    "profissionais", "para-terapeutas", "api", "admin", "_next",
})


def validate_public_slug(value):
    if value.casefold() in RESERVED_PUBLIC_SLUGS:
        raise ValidationError("Este endereço é reservado. Escolha outro slug.")
