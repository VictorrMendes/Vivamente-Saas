from django.core.management.base import BaseCommand

from apps.auth import back_sync


class Command(BaseCommand):
    help = (
        "Reprocessa eventos PENDING de identity_sync_outbox (retry com "
        "backoff). Rode periodicamente via cron/systemd timer - o outbox "
        "nao tem worker proprio."
    )

    def handle(self, *args, **options):
        sent = back_sync.process_pending()
        self.stdout.write(self.style.SUCCESS(f"{sent} evento(s) sincronizado(s)."))
