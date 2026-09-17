import getpass

from django.core.management.base import BaseCommand, CommandError

from apps.auth import services
from apps.auth.serializers import RegisterSerializer
from core.exceptions import ExternalServiceError


class Command(BaseCommand):
    help = "Cria um administrador e enfileira a sincronização de identidade com o Back."

    def add_arguments(self, parser):
        parser.add_argument("email")

    def handle(self, *args, **options):
        password = getpass.getpass("Senha: ")
        confirmation = getpass.getpass("Confirme a senha: ")
        if password != confirmation:
            raise CommandError("As senhas não coincidem.")

        serializer = RegisterSerializer(data={
            "email": options["email"], "password": password, "role": "ADMIN",
        })
        if not serializer.is_valid():
            # Não imprimir o payload, a senha ou exceções do provedor.
            raise CommandError("Informe um e-mail válido e uma senha de pelo menos 6 caracteres.")
        try:
            data = serializer.validated_data
            user = services.create_user(data["email"], data["password"], data["role"])
        except ExternalServiceError as exc:
            raise CommandError("Não foi possível criar o administrador no serviço de identidade.") from exc
        self.stdout.write(self.style.SUCCESS(f"ADMIN criado: {user.email}"))
        self.stdout.write("Verifique a sincronização com o Back antes do primeiro acesso à plataforma.")
