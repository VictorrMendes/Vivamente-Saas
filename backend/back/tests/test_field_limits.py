from django.test import SimpleTestCase

from apps.appointments.serializers import AppointmentWriteSerializer
from apps.clients.serializers import ClientWriteSerializer
from apps.clinical_records.serializers import ClinicalRecordWriteSerializer
from apps.institutional_requests.serializers import InstitutionalRequestPublicCreateSerializer
from apps.leads.serializers import LeadWriteSerializer, PublicAppointmentRequestSerializer
from apps.packages.serializers import PackagePlanWriteSerializer, PackageWriteSerializer
from apps.payments.serializers import PaymentWriteSerializer
from apps.professionals.serializers import ProfessionalWriteSerializer
from apps.services.serializers import ServiceWriteSerializer
from config import limits

# (serializer, campo de texto livre, limite): estourar o limite tem que dar erro nesse campo,
# no limite exato não pode dar (a validação é por campo, então erros de outros campos não contam).
CASES = [
    (LeadWriteSerializer, "message", limits.MESSAGE_MAX),
    (PublicAppointmentRequestSerializer, "message", limits.MESSAGE_MAX),
    (InstitutionalRequestPublicCreateSerializer, "message", limits.MESSAGE_MAX),
    (ClientWriteSerializer, "administrative_notes", limits.NOTES_MAX),
    (AppointmentWriteSerializer, "notes", limits.NOTES_MAX),
    (PackageWriteSerializer, "notes", limits.NOTES_MAX),
    (PackagePlanWriteSerializer, "description", limits.DESCRIPTION_MAX),
    (ServiceWriteSerializer, "description", limits.DESCRIPTION_MAX),
    (PaymentWriteSerializer, "description", limits.PAYMENT_DESCRIPTION_MAX),
    (ProfessionalWriteSerializer, "bio", limits.BIO_MAX),
    (ClinicalRecordWriteSerializer, "content", limits.CLINICAL_CONTENT_MAX),
]


class TextFieldLimitTests(SimpleTestCase):
    def test_free_text_fields_reject_oversized_input(self):
        for serializer_class, field, limit in CASES:
            with self.subTest(serializer=serializer_class.__name__, field=field):
                too_long = serializer_class(data={field: "x" * (limit + 1)})
                too_long.is_valid()
                self.assertIn(field, too_long.errors)

                exact = serializer_class(data={field: "x" * limit})
                exact.is_valid()
                self.assertNotIn(field, exact.errors)
