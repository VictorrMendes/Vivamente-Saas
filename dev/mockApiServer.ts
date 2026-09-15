/**
 * Mock do Oauth + Back embutido no dev server do Vite — só existe em
 * `npm run dev` (registrado em vite.config.ts apenas quando command === 'serve'),
 * nunca entra no bundle de produção nem roda em `vite build`/`vite preview`.
 *
 * Dados em memória, resetam a cada restart do dev server. Objetivo é só dar
 * uma experiência navegável enquanto o Oauth/Back reais não estão no ar
 * (docs, seção 11). IDs são numéricos (auto-incremento por coleção), como no
 * Back real — nunca strings tipo "c1".
 */
import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Appointment } from '../src/types/appointment';
import type { Lead } from '../src/types/lead';
import type { ServiceModality } from '../src/types/service';
import { deepCamelCase } from '../src/services/api/caseConvert';

/**
 * client.ts manda o corpo em snake_case pro Back de verdade; aqui dentro do
 * mock convertemos de volta pra camelCase na entrada, já que os dados
 * internos do mock (e os types do app) são todos camelCase. Um ponto só de
 * conversão em vez de trocar cada `body.xxx` espalhado pelos handlers.
 */
function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      try {
        resolve(raw ? deepCamelCase(JSON.parse(raw)) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function envelope<T>(data: T) {
  return { data, meta: { request_id: 'mock', timestamp: new Date().toISOString() } };
}

function paginated<T>(data: T[], page: number, perPage: number) {
  const start = (page - 1) * perPage;
  const pageItems = data.slice(start, start + perPage);
  return {
    data: pageItems,
    pagination: {
      page,
      per_page: perPage,
      total: data.length,
      total_pages: Math.max(1, Math.ceil(data.length / perPage)),
    },
  };
}

/** Contador de auto-incremento isolado por coleção — igual ao id auto do Back (Django AutoField). */
function makeIdCounter(start: number) {
  let next = start;
  return () => next++;
}

/** Extrai e valida o :id numérico de um match de rota — nunca repassa NaN adiante. */
function parseRouteId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) ? id : null;
}

function atHour(daysFromNow: number, hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

// ---------- seed data ----------

type MockAppointment = Appointment & { professional: number };

const appointments: MockAppointment[] = [
  { id: 1, client: 1, professional: 1, service: 1, startsAt: atHour(0, 10), endsAt: atHour(0, 11), status: 'CONFIRMED' as const, modality: 'ONLINE' as const, price: 180, notes: '' },
  { id: 2, client: 2, professional: 1, service: 2, startsAt: atHour(1, 15), endsAt: atHour(1, 16), status: 'PENDING' as const, modality: 'IN_PERSON' as const, price: 250, notes: '' },
  { id: 3, client: 1, professional: 2, service: 1, startsAt: atHour(-3, 9), endsAt: atHour(-3, 10), status: 'COMPLETED' as const, modality: 'ONLINE' as const, price: 180, notes: 'Sessão de acompanhamento.' },
  { id: 4, client: 3, professional: 1, service: 1, startsAt: atHour(4, 11), endsAt: atHour(4, 12), status: 'PENDING' as const, modality: 'ONLINE' as const, callLink: 'https://meet.example.com/sala-1', price: 180, notes: '' },
];
const nextAppointmentId = makeIdCounter(5);

const availability = [
  { id: 1, startsAt: atHour(1, 9), endsAt: atHour(1, 12), isBlocked: false },
  { id: 2, startsAt: atHour(1, 14), endsAt: atHour(1, 18), isBlocked: false },
  { id: 3, startsAt: atHour(3, 9), endsAt: atHour(3, 13), isBlocked: true },
  { id: 4, startsAt: atHour(5, 10), endsAt: atHour(5, 16), isBlocked: false },
];
const nextAvailabilityId = makeIdCounter(5);

const leads: Lead[] = [
  { id: 1, name: 'João Silva', email: 'joao.silva@example.com', phone: '(11) 91111-0001', service: 1, message: 'Gostaria de agendar uma primeira sessão.', status: 'NEW' as const, createdAt: atHour(-1, 9) },
  { id: 2, name: 'Ana Pereira', email: 'ana.pereira@example.com', phone: '(11) 91111-0002', service: 2, message: 'Eu e meu marido queremos iniciar terapia de casal.', status: 'CONTACTED' as const, createdAt: atHour(-2, 14) },
  { id: 3, name: 'Beatriz Costa', email: 'beatriz.costa@example.com', phone: '(11) 91111-0003', message: 'Fico no aguardo de retorno.', status: 'AWAITING_RESPONSE' as const, createdAt: atHour(-4, 11) },
  { id: 4, name: 'Rafael Nunes', email: 'rafael.nunes@example.com', phone: '(11) 91111-0004', service: 1, message: 'Já agendamos a primeira sessão.', status: 'SCHEDULED' as const, createdAt: atHour(-6, 16) },
];
const nextLeadId = makeIdCounter(5);

const clients = [
  { id: 1, name: 'Maria Souza', email: 'maria.souza@example.com', phone: '(11) 92222-0001', createdAt: atHour(-60, 10) },
  { id: 2, name: 'Carlos Lima', email: 'carlos.lima@example.com', phone: '(11) 92222-0002', createdAt: atHour(-45, 10) },
  { id: 3, name: 'Beatriz Costa', email: 'beatriz.costa@example.com', phone: '(11) 92222-0003', createdAt: atHour(-10, 10) },
];
const nextClientId = makeIdCounter(4);

const services = [
  { id: 1, name: 'Terapia individual', description: 'Sessão 1:1, 50 minutos.', durationMinutes: 50, price: 180, modality: 'ONLINE' as const },
  { id: 2, name: 'Terapia de casal', description: 'Sessão para casais, 60 minutos.', durationMinutes: 60, price: 250, modality: 'BOTH' as const },
  { id: 3, name: 'Terapia infantil', description: 'Atendimento infantil, 45 minutos.', durationMinutes: 45, price: 160, modality: 'IN_PERSON' as const },
];
const nextServiceId = makeIdCounter(4);

const specialties = [
  { id: 1, name: 'Ansiedade' },
  { id: 2, name: 'TCC' },
  { id: 3, name: 'Casais' },
  { id: 4, name: 'Família' },
];
const nextSpecialtyId = makeIdCounter(5);

const professionals = [
  {
    id: 1,
    user: 1,
    slug: 'ana-reis',
    fullName: 'Dra. Ana Reis',
    bio: 'Psicóloga clínica com foco em ansiedade e terapia cognitivo-comportamental.',
    isPublic: true,
    specialtyIds: [1, 2],
    photoUrl: '',
    createdAt: atHour(-200, 10),
  },
  {
    id: 2,
    user: 2,
    slug: 'pedro-alves',
    fullName: 'Dr. Pedro Alves',
    bio: 'Psicólogo especialista em terapia de casal e família.',
    isPublic: true,
    specialtyIds: [3, 4],
    photoUrl: '',
    createdAt: atHour(-150, 10),
  },
];
const nextProfessionalId = makeIdCounter(3);

const clinicalRecords = [
  { id: 1, client: 1, professional: 1, appointment: 3, content: 'Primeira sessão: paciente relata ansiedade relacionada ao trabalho.', recordedAt: atHour(-10, 10), author: 1, createdAt: atHour(-10, 10) },
  { id: 2, client: 1, professional: 1, content: 'Evolução positiva, técnicas de respiração incorporadas na rotina.', recordedAt: atHour(-3, 9), author: 1, createdAt: atHour(-3, 9) },
];
const nextClinicalRecordId = makeIdCounter(3);

// usedSessions/remainingSessions não são armazenados — computados ao vivo a
// partir de appointments.package, igual à @property do model real (nunca um
// contador mutável duplicado).
const packages = [
  // totalSessions baixo de propósito: demonstra o alerta "pacote quase no fim" no Dashboard sem interação extra.
  { id: 1, client: 1, name: 'Pacote mensal', totalSessions: 1, totalValue: 640, status: 'ACTIVE' as const, startDate: '2026-08-01', expirationDate: undefined as string | undefined, notes: undefined as string | undefined },
  { id: 2, client: 2, name: 'Pacote trimestral', totalSessions: 12, totalValue: 2160, status: 'ACTIVE' as const, startDate: '2026-09-01', expirationDate: undefined as string | undefined, notes: undefined as string | undefined },
];
const nextPackageId = makeIdCounter(3);

function withPackageSessions<T extends { id: number; totalSessions: number }>(pkg: T) {
  const used = appointments.filter((a) => a.package === pkg.id && a.status !== 'CANCELLED').length;
  return { ...pkg, usedSessions: used, remainingSessions: Math.max(pkg.totalSessions - used, 0) };
}

const payments = [
  { id: 1, client: 1, amount: 180, dueDate: '2026-09-05', status: 'PAID' as const, receiptNumber: 'REC-000001', paidAt: atHour(-5, 10) },
  { id: 2, client: 2, amount: 250, dueDate: '2026-09-20', status: 'PENDING' as const, receiptNumber: 'REC-000002' },
];
const nextPaymentId = makeIdCounter(3);
let paymentReceiptSeq = 2;

const notifications = [
  { id: 1, title: 'Novo lead', body: 'João Silva enviou uma solicitação de contato.', readAt: undefined as string | undefined, createdAt: atHour(0, 8) },
  { id: 2, title: 'Agendamento confirmado', body: 'Maria Souza confirmou o horário de hoje.', readAt: undefined as string | undefined, createdAt: atHour(0, 7) },
  { id: 3, title: 'Agendamento concluído', body: 'Sessão com Maria Souza foi concluída.', readAt: atHour(-3, 10) as string | undefined, createdAt: atHour(-3, 10) },
];
const nextNotificationId = makeIdCounter(4);

// User do Back autenticado (id numérico + firebase_uid) — só email é editável via PATCH /me (UserUpdateSerializer real).
const meState = { id: 1, firebaseUid: 'mock-user', email: 'ana.reis@vivamente.dev', role: 'THERAPIST', active: true };

// Espelha apps/appointments/services.py::_notify_if_package_low — dispara ao
// criar/editar um agendamento vinculado a um pacote com <=1 sessão restante.
function notifyIfPackageLow(packageId: number | undefined) {
  if (packageId == null) return;
  const pkg = packages.find((p) => p.id === packageId);
  if (!pkg) return;
  const { remainingSessions } = withPackageSessions(pkg);
  if (pkg.status === 'ACTIVE' && remainingSessions <= 1) {
    notifications.push({
      id: nextNotificationId(),
      title: 'Pacote quase no fim',
      body: `O pacote "${pkg.name}" tem ${remainingSessions} sessão(ões) restante(s).`,
      readAt: undefined,
      createdAt: new Date().toISOString(),
    });
  }
}

// Espelha config/dashboard.py::_compute_metrics do Back real (mesmos nomes de campo).
function buildDashboardMetrics() {
  const now = new Date();
  const activeAppointments = appointments.filter((a) => a.status !== 'CANCELLED');
  const thisMonthAppointments = activeAppointments.filter((a) => {
    const d = new Date(a.startsAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const pendingPayments = payments.filter((p) => p.status === 'PENDING');
  const monthlyPaid = payments.filter((p) => {
    if (p.status !== 'PAID') return false;
    const d = new Date(p.dueDate);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  return {
    newLeads: leads.filter((l) => l.status === 'NEW').length,
    activeClients: clients.length,
    sessionsThisMonth: thisMonthAppointments.length,
    appointmentsToday: activeAppointments.filter((a) => a.startsAt.slice(0, 10) === now.toISOString().slice(0, 10)).length,
    upcomingAppointments: activeAppointments
      .filter((a) => new Date(a.startsAt).getTime() >= Date.now())
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .slice(0, 5)
      .map((a) => ({ id: a.id, client: a.client, startsAt: a.startsAt, status: a.status })),
    pendingPayments: {
      count: pendingPayments.length,
      total: pendingPayments.reduce((sum, p) => sum + p.amount, 0),
    },
    monthlySummary: {
      receivedTotal: monthlyPaid.reduce((sum, p) => sum + p.amount, 0),
      sessionsCount: thisMonthAppointments.length,
    },
    // resource_id no AuditLog real é sempre string (CharField) mesmo quando o
    // recurso referenciado tem id numérico — por isso fica como texto aqui.
    recentActivity: [
      { action: 'create', resource: 'lead', resourceId: '1', createdAt: atHour(-1, 9) },
      { action: 'confirmed', resource: 'appointment', resourceId: '1', createdAt: atHour(0, 8) },
      { action: 'create', resource: 'payment', resourceId: '2', createdAt: atHour(-2, 10) },
    ],
  };
}

// ---------- router ----------

export function mockApiServer(): Plugin {
  return {
    name: 'vivamente-mock-api',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      // Sessões fictícias isoladas por refresh token; nunca usadas em produção.
      // O id do usuário aqui é o firebase_uid (string) do Oauth — nunca numérico.
      const oauthSessions = new Map<string, { id: string; email: string; role: string }>();
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const { pathname } = url;
        const method = req.method ?? 'GET';
        const page = Number(url.searchParams.get('page') ?? 1);
        const perPage = Number(url.searchParams.get('per_page') ?? 10);

        // ---- Oauth ----
        if (pathname === '/oauth/v1/login' && method === 'POST') {
          const body = await readBody(req);
          const email = String(body.email ?? 'admin@vivamente.dev');
          // Campo real do LoginSerializer é "password" (não "senha") — só validamos presença.
          if (!body.password) return sendJson(res, 400, { title: 'password é obrigatório.', status: 400 });
          const role = email.toLowerCase().includes('admin') ? 'ADMIN' : 'THERAPIST';
          const refreshToken = crypto.randomUUID();
          const user = { id: 'mock-user', email, role };
          oauthSessions.set(refreshToken, user);
          return sendJson(res, 200, envelope({
            idToken: 'mock-id-token',
            refreshToken,
            expiresIn: 3600,
            user,
          }));
        }
        if (pathname === '/oauth/v1/refresh' && method === 'POST') {
          const body = await readBody(req);
          const refreshToken = String(body.refreshToken ?? '');
          const user = oauthSessions.get(refreshToken);
          if (!user) return sendJson(res, 401, { title: 'Sessão expirada.', status: 401 });
          // Contrato real (RefreshResponseSerializer): só idToken + expiresIn,
          // nunca refreshToken nem user — o refresh token do Firebase não roda.
          return sendJson(res, 200, envelope({ idToken: 'mock-id-token-refreshed', expiresIn: 3600 }));
        }
        if (pathname === '/oauth/v1/logout' && method === 'POST') {
          return sendJson(res, 200, {});
        }
        if (pathname === '/oauth/v1/tokens/revoke' && method === 'POST') {
          oauthSessions.clear();
          return sendJson(res, 200, envelope({ revoked: true }));
        }

        // ---- Dashboard ----
        if (pathname === '/api/v1/dashboard/metrics' && method === 'GET') {
          return sendJson(res, 200, envelope(buildDashboardMetrics()));
        }

        // ---- Appointments ----
        if (pathname === '/api/v1/appointments' && method === 'GET') {
          let list = appointments;
          const clientId = url.searchParams.get('client');
          const professionalId = url.searchParams.get('professional');
          if (clientId) list = list.filter((a) => a.client === Number(clientId));
          if (professionalId) list = list.filter((a) => a.professional === Number(professionalId));
          return sendJson(res, 200, paginated(list, page, perPage || 100));
        }
        const apptActionMatch = pathname.match(/^\/api\/v1\/appointments\/([^/]+)\/(confirm|cancel|complete)$/);
        if (apptActionMatch && method === 'PATCH') {
          const id = parseRouteId(apptActionMatch[1]);
          const action = apptActionMatch[2];
          const appt = appointments.find((a) => a.id === id);
          if (appt) {
            appt.status = action === 'confirm' ? 'CONFIRMED' : action === 'cancel' ? 'CANCELLED' : 'COMPLETED';
          }
          return sendJson(res, 200, envelope(appt ?? {}));
        }
        if (pathname === '/api/v1/appointments' && method === 'POST') {
          const body = await readBody(req);
          // O mock não modela sessão/role — replica o Back só no que importa aqui:
          // ADMIN manda `professional` explícito, THERAPIST não manda (mock resolve pra 1).
          const professional = body.professional != null ? Number(body.professional) : 1;
          const startsAt = String(body.startsAt);
          const endsAt = String(body.endsAt);
          const conflict = appointments.some(
            (a) => a.professional === professional && a.status !== 'CANCELLED' && a.startsAt < endsAt && a.endsAt > startsAt,
          );
          if (conflict) {
            return sendJson(res, 400, { detail: 'starts_at: Já existe um agendamento nesse horário para este profissional.', status: 400 });
          }
          if (body.package != null) {
            const pkg = packages.find((p) => p.id === Number(body.package));
            if (!pkg || pkg.client !== Number(body.client)) {
              return sendJson(res, 400, { detail: 'package: Pacote não pertence a este cliente.', status: 400 });
            }
            if (pkg.status !== 'ACTIVE') {
              return sendJson(res, 400, { detail: 'package: Pacote não está ativo.', status: 400 });
            }
            if (withPackageSessions(pkg).remainingSessions <= 0) {
              return sendJson(res, 400, { detail: 'package: Pacote sem sessões restantes.', status: 400 });
            }
          }
          const appt: MockAppointment = {
            id: nextAppointmentId(),
            client: Number(body.client),
            professional,
            service: body.service != null ? Number(body.service) : undefined,
            package: body.package != null ? Number(body.package) : undefined,
            startsAt,
            endsAt,
            status: 'PENDING',
            modality: body.modality as MockAppointment['modality'],
            callLink: body.callLink ? String(body.callLink) : undefined,
            price: body.price != null ? Number(body.price) : undefined,
            notes: body.notes ? String(body.notes) : undefined,
          };
          appointments.push(appt);
          notifyIfPackageLow(appt.package);
          return sendJson(res, 201, envelope(appt));
        }
        const apptMatch = pathname.match(/^\/api\/v1\/appointments\/([^/]+)$/);
        if (apptMatch && method === 'PATCH') {
          const body = await readBody(req);
          const appt = appointments.find((a) => a.id === parseRouteId(apptMatch[1]));
          if (!appt) return sendJson(res, 404, { message: 'Agendamento não encontrado.' });
          const startsAt = body.startsAt != null ? String(body.startsAt) : appt.startsAt;
          const endsAt = body.endsAt != null ? String(body.endsAt) : appt.endsAt;
          const conflict = appointments.some(
            (a) => a.id !== appt.id && a.professional === appt.professional && a.status !== 'CANCELLED' && a.startsAt < endsAt && a.endsAt > startsAt,
          );
          if (conflict) {
            return sendJson(res, 400, { detail: 'starts_at: Já existe um agendamento nesse horário para este profissional.', status: 400 });
          }
          if (body.package != null) {
            const pkg = packages.find((p) => p.id === Number(body.package));
            const clientId = body.client != null ? Number(body.client) : appt.client;
            if (!pkg || pkg.client !== clientId) {
              return sendJson(res, 400, { detail: 'package: Pacote não pertence a este cliente.', status: 400 });
            }
            if (pkg.status !== 'ACTIVE') {
              return sendJson(res, 400, { detail: 'package: Pacote não está ativo.', status: 400 });
            }
            if (withPackageSessions(pkg).remainingSessions <= 0) {
              return sendJson(res, 400, { detail: 'package: Pacote sem sessões restantes.', status: 400 });
            }
          }
          Object.assign(appt, body, { startsAt, endsAt });
          notifyIfPackageLow(appt.package);
          return sendJson(res, 200, envelope(appt));
        }

        // ---- Availability ----
        if (pathname === '/api/v1/availability' && method === 'GET') {
          return sendJson(res, 200, paginated(availability, 1, 100));
        }
        if (pathname === '/api/v1/availability' && method === 'POST') {
          const body = await readBody(req);
          const slot = { id: nextAvailabilityId(), startsAt: String(body.startsAt), endsAt: String(body.endsAt), isBlocked: false };
          availability.push(slot);
          return sendJson(res, 201, envelope(slot));
        }
        const availMatch = pathname.match(/^\/api\/v1\/availability\/([^/]+)$/);
        if (availMatch && method === 'PATCH') {
          const body = await readBody(req);
          const slot = availability.find((s) => s.id === parseRouteId(availMatch[1]));
          if (slot) Object.assign(slot, body);
          return sendJson(res, 200, envelope(slot ?? {}));
        }
        if (availMatch && method === 'DELETE') {
          const index = availability.findIndex((s) => s.id === parseRouteId(availMatch[1]));
          if (index !== -1) availability.splice(index, 1);
          res.statusCode = 204;
          return res.end();
        }

        // ---- Leads ----
        if (pathname === '/api/v1/leads' && method === 'GET') {
          let list = leads;
          const status = url.searchParams.get('status');
          const search = url.searchParams.get('search');
          if (status) list = list.filter((l) => l.status === status);
          if (search) list = list.filter((l) => l.name.toLowerCase().includes(search.toLowerCase()));
          return sendJson(res, 200, paginated(list, page, perPage));
        }
        const leadMatch = pathname.match(/^\/api\/v1\/leads\/([^/]+)$/);
        if (leadMatch && method === 'GET') {
          const lead = leads.find((l) => l.id === parseRouteId(leadMatch[1]));
          if (!lead) return sendJson(res, 404, { message: 'Lead não encontrado.' });
          return sendJson(res, 200, envelope(lead));
        }
        if (leadMatch && method === 'DELETE') {
          const index = leads.findIndex((l) => l.id === parseRouteId(leadMatch[1]));
          if (index !== -1) leads.splice(index, 1);
          res.statusCode = 204;
          return res.end();
        }
        const leadStatusMatch = pathname.match(/^\/api\/v1\/leads\/([^/]+)\/status$/);
        if (leadStatusMatch && method === 'PATCH') {
          const body = await readBody(req);
          const lead = leads.find((l) => l.id === parseRouteId(leadStatusMatch[1]));
          if (lead) lead.status = body.status as typeof lead.status;
          return sendJson(res, 200, envelope(lead ?? {}));
        }
        const leadConvertMatch = pathname.match(/^\/api\/v1\/leads\/([^/]+)\/convert$/);
        if (leadConvertMatch && method === 'POST') {
          const lead = leads.find((l) => l.id === parseRouteId(leadConvertMatch[1]));
          const newClient = { id: nextClientId(), name: lead?.name ?? 'Novo cliente', email: lead?.email ?? '', phone: lead?.phone ?? '', createdAt: new Date().toISOString() };
          clients.push(newClient);
          if (lead) lead.status = 'CONVERTED';
          // POST /leads/{id}/convert devolve o Client criado (não um { clientId }).
          return sendJson(res, 200, envelope(newClient));
        }

        // ---- Clients ----
        if (pathname === '/api/v1/clients' && method === 'GET') {
          let list = clients;
          const search = url.searchParams.get('search');
          if (search) list = list.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
          return sendJson(res, 200, paginated(list, page, perPage));
        }
        if (pathname === '/api/v1/clients' && method === 'POST') {
          const body = await readBody(req);
          const client = {
            id: nextClientId(),
            name: String(body.name),
            email: String(body.email),
            phone: String(body.phone),
            birthDate: body.birthDate ? String(body.birthDate) : undefined,
            document: body.document ? String(body.document) : undefined,
            administrativeNotes: body.administrativeNotes ? String(body.administrativeNotes) : undefined,
            createdAt: new Date().toISOString(),
          };
          clients.push(client);
          return sendJson(res, 201, envelope(client));
        }
        const clientMatch = pathname.match(/^\/api\/v1\/clients\/([^/]+)$/);
        if (clientMatch && method === 'GET') {
          const client = clients.find((c) => c.id === parseRouteId(clientMatch[1]));
          if (!client) return sendJson(res, 404, { message: 'Cliente não encontrado.' });
          return sendJson(res, 200, envelope(client));
        }
        if (clientMatch && method === 'PATCH') {
          const body = await readBody(req);
          const client = clients.find((c) => c.id === parseRouteId(clientMatch[1]));
          if (client) Object.assign(client, body);
          return sendJson(res, 200, envelope(client ?? {}));
        }
        if (clientMatch && method === 'DELETE') {
          const index = clients.findIndex((c) => c.id === parseRouteId(clientMatch[1]));
          if (index !== -1) clients.splice(index, 1);
          res.statusCode = 204;
          return res.end();
        }

        // ---- Clinical Records ----
        // Só existe GET filtrado por client (sem listagem geral) — reflete o Back real.
        if (pathname === '/api/v1/clinical-records' && method === 'GET') {
          const clientId = url.searchParams.get('client');
          const list = clientId ? clinicalRecords.filter((r) => r.client === Number(clientId)) : [];
          return sendJson(res, 200, paginated(list, page, perPage));
        }
        if (pathname === '/api/v1/clinical-records' && method === 'POST') {
          const body = await readBody(req);
          const now = new Date().toISOString();
          const record = {
            id: nextClinicalRecordId(),
            client: Number(body.client),
            professional: 1,
            appointment: body.appointment != null ? Number(body.appointment) : undefined,
            content: String(body.content),
            recordedAt: body.recordedAt ? String(body.recordedAt) : now,
            author: 1,
            createdAt: now,
          };
          clinicalRecords.unshift(record);
          return sendJson(res, 201, envelope(record));
        }
        const clinicalRecordMatch = pathname.match(/^\/api\/v1\/clinical-records\/([^/]+)$/);
        if (clinicalRecordMatch && method === 'PATCH') {
          const body = await readBody(req);
          const record = clinicalRecords.find((r) => r.id === parseRouteId(clinicalRecordMatch[1]));
          if (record) Object.assign(record, body);
          return sendJson(res, 200, envelope(record ?? {}));
        }
        if (clinicalRecordMatch && method === 'DELETE') {
          const index = clinicalRecords.findIndex((r) => r.id === parseRouteId(clinicalRecordMatch[1]));
          if (index !== -1) clinicalRecords.splice(index, 1);
          res.statusCode = 204;
          return res.end();
        }

        // ---- Packages ----
        if (pathname === '/api/v1/packages' && method === 'GET') {
          return sendJson(res, 200, paginated(packages.map(withPackageSessions), page, perPage));
        }
        if (pathname === '/api/v1/packages' && method === 'POST') {
          const body = await readBody(req);
          const pkg = {
            id: nextPackageId(),
            client: Number(body.client),
            name: String(body.name),
            totalSessions: Number(body.totalSessions),
            totalValue: Number(body.totalValue),
            status: 'ACTIVE' as const,
            startDate: String(body.startDate),
            expirationDate: body.expirationDate ? String(body.expirationDate) : undefined,
            notes: body.notes ? String(body.notes) : undefined,
          };
          packages.push(pkg);
          return sendJson(res, 201, envelope(withPackageSessions(pkg)));
        }
        const packageMatch = pathname.match(/^\/api\/v1\/packages\/([^/]+)$/);
        if (packageMatch && method === 'PATCH') {
          const body = await readBody(req);
          const pkg = packages.find((p) => p.id === parseRouteId(packageMatch[1]));
          if (pkg) Object.assign(pkg, body);
          return sendJson(res, 200, envelope(pkg ? withPackageSessions(pkg) : {}));
        }
        if (packageMatch && method === 'DELETE') {
          const index = packages.findIndex((p) => p.id === parseRouteId(packageMatch[1]));
          if (index !== -1) packages.splice(index, 1);
          res.statusCode = 204;
          return res.end();
        }

        // ---- Payments ----
        // Confirmado em apps/payments/views.py::PaymentViewSet.balance — agrega por due_date dentro do mês.
        if (pathname === '/api/v1/payments/balance' && method === 'GET') {
          const month = url.searchParams.get('month');
          if (!month) return sendJson(res, 400, { detail: 'month: Parâmetro obrigatório, formato YYYY-MM.', status: 400 });
          const monthPayments = payments.filter((p) => p.dueDate.startsWith(month));
          const received = monthPayments.filter((p) => p.status === 'PAID');
          const pending = monthPayments.filter((p) => p.status === 'PENDING');
          return sendJson(res, 200, envelope({
            month,
            receivedTotal: received.reduce((sum, p) => sum + p.amount, 0),
            receivedCount: received.length,
            pendingTotal: pending.reduce((sum, p) => sum + p.amount, 0),
            pendingCount: pending.length,
            sessionsCount: received.length + pending.length,
          }));
        }
        if (pathname === '/api/v1/payments' && method === 'GET') {
          let list = payments;
          const clientId = url.searchParams.get('client');
          const status = url.searchParams.get('status');
          if (clientId) list = list.filter((p) => p.client === Number(clientId));
          if (status) list = list.filter((p) => p.status === status);
          return sendJson(res, 200, paginated(list, page, perPage));
        }
        if (pathname === '/api/v1/payments' && method === 'POST') {
          const body = await readBody(req);
          paymentReceiptSeq += 1;
          const payment = {
            id: nextPaymentId(),
            client: Number(body.client),
            amount: Number(body.amount),
            dueDate: String(body.dueDate),
            status: 'PENDING' as const,
            receiptNumber: `REC-${String(paymentReceiptSeq).padStart(6, '0')}`,
          };
          payments.push(payment);
          return sendJson(res, 201, envelope(payment));
        }
        const paymentMatch = pathname.match(/^\/api\/v1\/payments\/([^/]+)$/);
        if (paymentMatch && method === 'GET') {
          const payment = payments.find((p) => p.id === parseRouteId(paymentMatch[1]));
          if (!payment) return sendJson(res, 404, { message: 'Pagamento não encontrado.' });
          return sendJson(res, 200, envelope(payment));
        }
        if (paymentMatch && method === 'PATCH') {
          const body = await readBody(req);
          const payment = payments.find((p) => p.id === parseRouteId(paymentMatch[1]));
          if (payment) {
            Object.assign(payment, body);
            if (body.status === 'PAID' && !('paidAt' in body)) (payment as { paidAt?: string }).paidAt = new Date().toISOString();
          }
          return sendJson(res, 200, envelope(payment ?? {}));
        }
        if (paymentMatch && method === 'DELETE') {
          const index = payments.findIndex((p) => p.id === parseRouteId(paymentMatch[1]));
          if (index !== -1) payments.splice(index, 1);
          res.statusCode = 204;
          return res.end();
        }

        // ---- Services ----
        if (pathname === '/api/v1/services' && method === 'GET') {
          return sendJson(res, 200, paginated(services, 1, 100));
        }
        if (pathname === '/api/v1/services' && method === 'POST') {
          const body = await readBody(req);
          const service = {
            id: nextServiceId(),
            name: String(body.name),
            description: String(body.description ?? ''),
            durationMinutes: Number(body.durationMinutes),
            price: Number(body.price),
            modality: (body.modality as ServiceModality) ?? 'ONLINE',
          };
          services.push(service);
          return sendJson(res, 201, envelope(service));
        }
        const serviceMatch = pathname.match(/^\/api\/v1\/services\/([^/]+)$/);
        if (serviceMatch && method === 'PATCH') {
          const body = await readBody(req);
          const service = services.find((s) => s.id === parseRouteId(serviceMatch[1]));
          if (service) Object.assign(service, body);
          return sendJson(res, 200, envelope(service ?? {}));
        }
        if (serviceMatch && method === 'DELETE') {
          const index = services.findIndex((s) => s.id === parseRouteId(serviceMatch[1]));
          if (index !== -1) services.splice(index, 1);
          res.statusCode = 204;
          return res.end();
        }

        // ---- Specialties ----
        if (pathname === '/api/v1/specialties' && method === 'GET') {
          return sendJson(res, 200, paginated(specialties, 1, 100));
        }
        if (pathname === '/api/v1/specialties' && method === 'POST') {
          const body = await readBody(req);
          const specialty = { id: nextSpecialtyId(), name: String(body.name) };
          specialties.push(specialty);
          return sendJson(res, 201, envelope(specialty));
        }

        // ---- Professionals ----
        if (pathname === '/api/v1/professionals' && method === 'GET') {
          // ponytail: o mock não distingue role por token — sempre devolve a
          // lista inteira, mesmo onde o Back real escopa pro próprio THERAPIST.
          let list = professionals;
          const search = url.searchParams.get('search');
          if (search) list = list.filter((p) => p.fullName.toLowerCase().includes(search.toLowerCase()));
          return sendJson(res, 200, paginated(list, page, perPage));
        }
        if (pathname === '/api/v1/professionals' && method === 'POST') {
          const body = await readBody(req);
          const professional = {
            id: nextProfessionalId(),
            user: Number(body.user),
            slug: String(body.slug),
            fullName: String(body.fullName),
            bio: String(body.bio ?? ''),
            isPublic: Boolean(body.isPublic),
            specialtyIds: Array.isArray(body.specialtyIds) ? (body.specialtyIds as number[]).map(Number) : [],
            photoUrl: '',
            createdAt: new Date().toISOString(),
          };
          professionals.push(professional);
          return sendJson(res, 201, envelope(professional));
        }
        const professionalMatch = pathname.match(/^\/api\/v1\/professionals\/([^/]+)$/);
        if (professionalMatch && method === 'GET') {
          const professional = professionals.find((p) => p.id === parseRouteId(professionalMatch[1]));
          if (!professional) return sendJson(res, 404, { message: 'Profissional não encontrado.' });
          return sendJson(res, 200, envelope(professional));
        }
        if (professionalMatch && method === 'PATCH') {
          const body = await readBody(req);
          const professional = professionals.find((p) => p.id === parseRouteId(professionalMatch[1]));
          if (professional) Object.assign(professional, body);
          return sendJson(res, 200, envelope(professional ?? {}));
        }
        if (professionalMatch && method === 'DELETE') {
          const index = professionals.findIndex((p) => p.id === parseRouteId(professionalMatch[1]));
          if (index !== -1) professionals.splice(index, 1);
          res.statusCode = 204;
          return res.end();
        }
        const publicProfileMatch = pathname.match(/^\/api\/v1\/professionals\/([^/]+)\/public-profile$/);
        if (publicProfileMatch && method === 'PATCH') {
          const body = await readBody(req);
          const professional = professionals.find((p) => p.id === parseRouteId(publicProfileMatch[1]));
          if (professional) Object.assign(professional, body);
          return sendJson(res, 200, envelope(professional ?? {}));
        }

        // ---- Me ----
        // /me retorna o User do Back (id numérico + firebase_uid), não o
        // Professional — o perfil completo vem de GET /api/v1/professionals/{id}
        // (useMyPublicProfile.ts). Fixo no primeiro professional/terapeuta
        // seedado: o mock não rastreia sessão por token.
        if (pathname === '/api/v1/me' && method === 'GET') {
          return sendJson(res, 200, envelope(meState));
        }
        if (pathname === '/api/v1/me' && method === 'PATCH') {
          const body = await readBody(req);
          // UserUpdateSerializer real só aceita email — outros campos do corpo são ignorados.
          if (typeof body.email === 'string') meState.email = body.email;
          return sendJson(res, 200, envelope(meState));
        }

        // ---- Notifications ----
        if (pathname === '/api/v1/notifications' && method === 'GET') {
          return sendJson(res, 200, paginated(notifications, page, perPage));
        }
        const notifReadMatch = pathname.match(/^\/api\/v1\/notifications\/([^/]+)\/read$/);
        if (notifReadMatch && method === 'PATCH') {
          const notif = notifications.find((n) => n.id === parseRouteId(notifReadMatch[1]));
          if (notif) notif.readAt = notif.readAt ?? new Date().toISOString();
          return sendJson(res, 200, envelope(notif ?? {}));
        }
        if (pathname === '/api/v1/notifications/read-all' && method === 'PATCH') {
          const now = new Date().toISOString();
          let updated = 0;
          notifications.forEach((n) => {
            if (!n.readAt) {
              n.readAt = now;
              updated += 1;
            }
          });
          return sendJson(res, 200, envelope({ updated }));
        }

        next();
      });
    },
  };
}
