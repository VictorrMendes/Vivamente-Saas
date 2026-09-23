import random
from datetime import timedelta

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.appointments.models import Appointment, AvailabilitySlot
from apps.clients.models import Client
from apps.institutional_requests.models import InstitutionalRequest
from apps.leads.models import Lead
from apps.packages.models import Package
from apps.payments.models import Payment
from apps.professionals.models import Professional, Specialty
from apps.services.models import Service

SPECIALTY_NAMES = [
    "Ansiedade", "Depressão", "Terapia de casal", "TCC", "Luto", "Autoestima",
    "Burnout e estresse no trabalho", "Adolescentes e jovens adultos",
    "TDAH em adultos", "Terapia familiar",
]

# Dados inteiramente fictícios (nomes, e-mails, CRPs) - nenhuma relação com
# pessoas reais. firebase_uid é um placeholder local, não sincroniza com
# Firebase de verdade (não há credencial real neste ambiente).
THERAPISTS = [
    {
        "full_name": "Camila Nogueira Rocha", "slug": "camila-nogueira-rocha",
        "registration": "CRP 06/098234", "is_public": True,
        "specialties": ["Ansiedade", "TCC", "Autoestima"],
        "bio": "Atendo adultos em processos de ansiedade e autoestima, com base na Terapia "
               "Cognitivo-Comportamental. Acredito em um espaço de escuta sem julgamento, "
               "no seu tempo, para construir ferramentas práticas para o dia a dia.",
        "services": [
            ("Sessão individual online", 50, "220.00", "ONLINE"),
            ("Sessão individual presencial", 50, "260.00", "IN_PERSON"),
        ],
    },
    {
        "full_name": "Rafael Andrade Lima", "slug": "rafael-andrade-lima",
        "registration": "CRP 05/077412", "is_public": True,
        "specialties": ["Terapia de casal", "Terapia familiar"],
        "bio": "Trabalho com casais e famílias em momentos de transição - conflitos de "
               "comunicação, reorganização após separações, chegada de filhos. Abordagem "
               "sistêmica, com sessões que incluem todas as partes quando possível.",
        "services": [
            ("Sessão de casal", 60, "320.00", "BOTH"),
            ("Sessão familiar", 60, "350.00", "IN_PERSON"),
        ],
    },
    {
        "full_name": "Beatriz Fontoura Xavier", "slug": "beatriz-fontoura-xavier",
        "registration": "CRP 06/112987", "is_public": True,
        "specialties": ["Luto", "Depressão"],
        "bio": "Especializo-me em processos de luto e depressão, acompanhando pessoas "
               "que atravessam perdas - de pessoas queridas, relações ou fases da vida. "
               "Cada luto tem seu próprio ritmo; meu papel é caminhar junto.",
        "services": [
            ("Sessão individual online", 50, "200.00", "ONLINE"),
            ("Sessão individual presencial", 50, None, "IN_PERSON"),
        ],
    },
    {
        "full_name": "Thiago Meireles Cunha", "slug": "thiago-meireles-cunha",
        "registration": "CRP 04/065521", "is_public": True,
        "specialties": ["Adolescentes e jovens adultos", "TDAH em adultos"],
        "bio": "Atendo adolescentes, jovens adultos e pessoas com TDAH. Um espaço para "
               "falar sobre escola, trabalho, identidade e organização da rotina, sem "
               "cobrança de produtividade.",
        "services": [
            ("Sessão individual online", 50, "190.00", "ONLINE"),
        ],
    },
    {
        "full_name": "Larissa Bittencourt Prado", "slug": "larissa-bittencourt-prado",
        "registration": "CRP 06/103456", "is_public": True,
        "specialties": ["Burnout e estresse no trabalho", "Ansiedade"],
        "bio": "Ajudo profissionais em situação de esgotamento e ansiedade relacionada "
               "ao trabalho a reencontrar limites saudáveis, sem culpa por precisar "
               "desacelerar.",
        "services": [
            ("Sessão individual online", 50, "230.00", "ONLINE"),
            ("Sessão individual presencial", 50, "270.00", "IN_PERSON"),
        ],
    },
    {
        # Perfil intencionalmente não-público - testa o estado "perfil em
        # rascunho" no catálogo e na Plataforma.
        "full_name": "Eduardo Salgado Vieira", "slug": "eduardo-salgado-vieira",
        "registration": "CRP 07/054321", "is_public": False,
        "specialties": ["TCC", "Depressão"],
        "bio": "Perfil em preparação - ainda não publicado no catálogo.",
        "services": [
            ("Sessão individual online", 50, "210.00", "ONLINE"),
        ],
    },
]

PATIENT_INTERESTS = [
    ("Juliana Marques Teixeira", "juliana.teixeira@example.com", "(11) 98765-4321",
     "Estou passando por um momento de bastante ansiedade e gostaria de conversar com alguém."),
    ("Marcos Vinícius Pereira", "marcos.pereira@example.com", "(21) 97654-3210",
     "Eu e minha esposa gostaríamos de fazer terapia de casal."),
    ("Fernanda Costa Ribeiro", "fernanda.ribeiro@example.com", "",
     "Perdi meu pai recentemente e não sei bem com quem conversar sobre isso."),
    ("Gustavo Henrique Souza", "gustavo.souza@example.com", "(31) 96543-2109",
     "Meu filho adolescente está bem fechado ultimamente, queria uma indicação."),
    ("Patrícia Almeida Farias", "patricia.farias@example.com", "(41) 95432-1098",
     "Estou com sintomas de burnout no trabalho, preciso de ajuda."),
]

THERAPIST_INTERESTS = [
    ("Renata Cavalcante Dias", "renata.dias@example.com", "(11) 94321-0987",
     "Sou psicóloga, CRP ativo, e tenho interesse em fazer parte da rede VivaMente."),
    ("Vinícius Barbosa Rezende", "vinicius.rezende@example.com", "(21) 93210-9876",
     "Trabalho com terapia familiar há 8 anos e gostaria de conhecer a plataforma."),
    ("Isabela Monteiro Guedes", "isabela.guedes@example.com", "",
     "Recém-formada, buscando uma rede pra começar a atender."),
]


class Command(BaseCommand):
    help = (
        "Apaga todos os dados de domínio e recria um conjunto de dados fictícios "
        "e coerentes (profissionais, especialidades, fila institucional, leads, "
        "clientes, agenda, pagamentos) para demonstração/visualização local. "
        "Nunca usar contra um banco de produção."
    )

    def handle(self, *args, **options):
        self.stdout.write("Limpando o banco (flush)...")
        call_command("flush", interactive=False, verbosity=0)

        with transaction.atomic():
            self._seed()

        self.stdout.write(self.style.SUCCESS("Dados de demonstração criados."))

    def _seed(self):
        specialties = {name: Specialty.objects.create(name=name) for name in SPECIALTY_NAMES}

        admin_user = User.objects.create(
            firebase_uid="seed-admin-1", email="admin@vivamenteterapias.example.com",
            role=User.ADMIN, active=True,
        )
        self.stdout.write(f"Admin: {admin_user.email}")

        professionals = []
        for i, data in enumerate(THERAPISTS, start=1):
            user = User.objects.create(
                firebase_uid=f"seed-therapist-{i}",
                email=f"{data['slug'].replace('-', '.')}@vivamenteterapias.example.com",
                role=User.THERAPIST, active=True,
            )
            professional = Professional.objects.create(
                user=user, slug=data["slug"], full_name=data["full_name"],
                bio=data["bio"], registration=data["registration"], is_public=data["is_public"],
            )
            professional.specialties.set([specialties[name] for name in data["specialties"]])
            for name, duration, price, modality in data["services"]:
                Service.objects.create(
                    professional=professional, name=name, duration_minutes=duration,
                    price=price, modality=modality,
                    description=f"{name} com {data['full_name'].split()[0]}.",
                )
            professionals.append(professional)
        self.stdout.write(f"{len(professionals)} profissionais criados.")

        # Horários futuros livres pros 3 primeiros profissionais públicos -
        # alimenta o seletor de horário em /[slug]/agendar na Loja.
        now = timezone.now().replace(minute=0, second=0, microsecond=0)
        for professional in professionals[:3]:
            for day_offset in (1, 2, 3, 5, 8):
                starts = now + timedelta(days=day_offset, hours=random.choice([9, 11, 14, 16]))
                AvailabilitySlot.objects.create(
                    professional=professional, starts_at=starts, ends_at=starts + timedelta(minutes=50),
                )

        # Fila institucional: mistura de status e dos dois "kind", incluindo
        # um PATIENT encaminhado (cria Lead de verdade, mesmo services.py da
        # fila real) e estados NEW/IN_PROGRESS/CLOSED pra exercitar a UI que
        # ajustamos hoje.
        institutional_statuses_patient = ["NEW", "NEW", "IN_PROGRESS", "CLOSED"]
        for (name, email, phone, message), status in zip(PATIENT_INTERESTS, institutional_statuses_patient):
            InstitutionalRequest.objects.create(
                kind=InstitutionalRequest.PATIENT, name=name, email=email, phone=phone,
                message=message, status=status,
            )
        # O 5º é encaminhado de verdade (status FORWARDED + Lead vinculado).
        forwarded_name, forwarded_email, forwarded_phone, forwarded_message = PATIENT_INTERESTS[4]
        forwarded_professional = professionals[0]
        forwarded_lead = Lead.objects.create(
            professional=forwarded_professional, name=forwarded_name, email=forwarded_email,
            phone=forwarded_phone, message=forwarded_message, status=Lead.CONTACTED,
        )
        InstitutionalRequest.objects.create(
            kind=InstitutionalRequest.PATIENT, name=forwarded_name, email=forwarded_email,
            phone=forwarded_phone, message=forwarded_message, status=InstitutionalRequest.FORWARDED,
            forwarded_to=forwarded_professional, forwarded_lead=forwarded_lead, forwarded_at=timezone.now(),
        )

        therapist_interest_statuses = ["NEW", "IN_PROGRESS", "CLOSED"]
        for (name, email, phone, message), status in zip(THERAPIST_INTERESTS, therapist_interest_statuses):
            InstitutionalRequest.objects.create(
                kind=InstitutionalRequest.THERAPIST_INTEREST, name=name, email=email, phone=phone,
                message=message, status=status,
            )
        self.stdout.write(f"{len(PATIENT_INTERESTS) + len(THERAPIST_INTERESTS)} solicitações institucionais criadas.")

        # Leads adicionais (fora da fila institucional) direto com um
        # profissional, em vários estágios do funil.
        extra_leads_data = [
            ("Bruno Castro Lopes", "bruno.lopes@example.com", "(51) 92109-8765", Lead.SCHEDULED, professionals[1]),
            ("Sabrina Oliveira Nunes", "sabrina.nunes@example.com", "(61) 91098-7654", Lead.AWAITING_RESPONSE, professionals[2]),
            ("Diego Martins Azevedo", "diego.azevedo@example.com", "(71) 90987-6543", Lead.CONVERTED, professionals[3]),
        ]
        leads = [forwarded_lead]
        for name, email, phone, status, professional in extra_leads_data:
            leads.append(Lead.objects.create(
                professional=professional, name=name, email=email, phone=phone,
                message="Contato direto pelo site.", status=status,
            ))

        # Clientes: alguns vieram de um Lead convertido, outros cadastrados
        # direto pelo profissional.
        clients_data = [
            ("Diego Martins Azevedo", "diego.azevedo@example.com", "(71) 90987-6543", professionals[3], leads[3]),
            ("Camila Reis Fonseca", "camila.fonseca@example.com", "(11) 98888-1111", professionals[0], None),
            ("André Luiz Barbosa", "andre.barbosa@example.com", "(21) 97777-2222", professionals[1], None),
            ("Vanessa Cristina Melo", "vanessa.melo@example.com", "(31) 96666-3333", professionals[4], None),
        ]
        clients = []
        for name, email, phone, professional, lead in clients_data:
            clients.append(Client.objects.create(
                professional=professional, lead=lead, name=name, email=email, phone=phone,
                document=f"{random.randint(100,999)}.{random.randint(100,999)}.{random.randint(100,999)}-{random.randint(10,99)}",
                administrative_notes="Cliente de demonstração.",
            ))
        self.stdout.write(f"{len(clients)} clientes criados.")

        # Agenda: mistura de consultas passadas (concluídas) e futuras
        # (confirmadas/pendentes), sem sobrepor horário pro mesmo profissional.
        appointments = []
        schedule = [
            (clients[0], professionals[3], -14, Appointment.COMPLETED),
            (clients[0], professionals[3], -7, Appointment.COMPLETED),
            (clients[1], professionals[0], -3, Appointment.COMPLETED),
            (clients[1], professionals[0], 4, Appointment.CONFIRMED),
            (clients[2], professionals[1], 2, Appointment.CONFIRMED),
            (clients[2], professionals[1], -10, Appointment.CANCELLED),
            (clients[3], professionals[4], 6, Appointment.PENDING),
        ]
        for client, professional, day_offset, status in schedule:
            starts = now + timedelta(days=day_offset, hours=10)
            service = professional.services.first()
            appointments.append(Appointment.objects.create(
                professional=professional, client=client, service=service,
                starts_at=starts, ends_at=starts + timedelta(minutes=service.duration_minutes if service else 50),
                status=status, modality="ONLINE", price=service.price if service else None,
            ))
        self.stdout.write(f"{len(appointments)} agendamentos criados.")

        # Pagamentos ligados a algumas das consultas concluídas/confirmadas.
        payment_map = [
            (appointments[0], Payment.PAID, "REC-000001"),
            (appointments[1], Payment.PAID, "REC-000002"),
            (appointments[2], Payment.PAID, "REC-000003"),
            (appointments[3], Payment.PENDING, None),
            (appointments[6], Payment.PENDING, None),
        ]
        for appointment, status, receipt in payment_map:
            Payment.objects.create(
                professional=appointment.professional, client=appointment.client, appointment=appointment,
                amount=appointment.price or 200, status=status,
                due_date=appointment.starts_at.date(),
                paid_at=timezone.now() if status == Payment.PAID else None,
                receipt_number=receipt, payment_method="PIX" if status == Payment.PAID else "",
            )

        # Um pacote ativo pra um dos clientes.
        Package.objects.create(
            professional=professionals[3], client=clients[0], name="Pacote 8 sessões",
            total_sessions=8, total_value="1520.00", status=Package.ACTIVE,
            start_date=(now - timedelta(days=14)).date(),
        )
        self.stdout.write("Pagamentos e pacote criados.")
