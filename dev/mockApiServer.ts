/**
 * Mock do Oauth + Back embutido no dev server do Vite — só existe em
 * `npm run dev` (registrado em vite.config.ts apenas quando command === 'serve'),
 * nunca entra no bundle de produção nem roda em `vite build`/`vite preview`.
 *
 * Dados em memória, resetam a cada restart do dev server. Objetivo é só dar
 * uma experiência navegável enquanto o Oauth/Back reais não estão no ar
 * (docs, seção 11).
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

function nextId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function atHour(daysFromNow: number, hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

// ---------- seed data ----------

type MockAppointment = Appointment & { professional: string };

const appointments: MockAppointment[] = [
  { id: 'a1', client: 'c1', professional: 'p1', service: 's1', startsAt: atHour(0, 10), endsAt: atHour(0, 11), status: 'CONFIRMED' as const, modality: 'ONLINE' as const, price: 180, notes: '' },
  { id: 'a2', client: 'c2', professional: 'p1', service: 's2', startsAt: atHour(1, 15), endsAt: atHour(1, 16), status: 'PENDING' as const, modality: 'IN_PERSON' as const, price: 250, notes: '' },
  { id: 'a3', client: 'c1', professional: 'p2', service: 's1', startsAt: atHour(-3, 9), endsAt: atHour(-3, 10), status: 'COMPLETED' as const, modality: 'ONLINE' as const, price: 180, notes: 'Sessão de acompanhamento.' },
  { id: 'a4', client: 'c3', professional: 'p1', service: 's1', startsAt: atHour(4, 11), endsAt: atHour(4, 12), status: 'PENDING' as const, modality: 'ONLINE' as const, callLink: 'https://meet.example.com/sala-1', price: 180, notes: '' },
];

const availability = [
  { id: 'av1', startsAt: atHour(1, 9), endsAt: atHour(1, 12), isBlocked: false },
  { id: 'av2', startsAt: atHour(1, 14), endsAt: atHour(1, 18), isBlocked: false },
  { id: 'av3', startsAt: atHour(3, 9), endsAt: atHour(3, 13), isBlocked: true },
  { id: 'av4', startsAt: atHour(5, 10), endsAt: atHour(5, 16), isBlocked: false },
];

const leads: Lead[] = [
  { id: 'l1', name: 'João Silva', email: 'joao.silva@example.com', phone: '(11) 91111-0001', serviceInterest: 'Terapia individual', message: 'Gostaria de agendar uma primeira sessão.', status: 'NEW' as const, createdAt: atHour(-1, 9) },
  { id: 'l2', name: 'Ana Pereira', email: 'ana.pereira@example.com', phone: '(11) 91111-0002', serviceInterest: 'Terapia de casal', message: 'Eu e meu marido queremos iniciar terapia de casal.', status: 'CONTACTED' as const, createdAt: atHour(-2, 14) },
  { id: 'l3', name: 'Beatriz Costa', email: 'beatriz.costa@example.com', phone: '(11) 91111-0003', serviceInterest: 'Terapia individual', message: 'Fico no aguardo de retorno.', status: 'AWAITING_RESPONSE' as const, createdAt: atHour(-4, 11) },
  { id: 'l4', name: 'Rafael Nunes', email: 'rafael.nunes@example.com', phone: '(11) 91111-0004', serviceInterest: 'Terapia individual', message: 'Já agendamos a primeira sessão.', status: 'SCHEDULED' as const, createdAt: atHour(-6, 16) },
];

const clients = [
  { id: 'c1', name: 'Maria Souza', email: 'maria.souza@example.com', phone: '(11) 92222-0001', createdAt: atHour(-60, 10) },
  { id: 'c2', name: 'Carlos Lima', email: 'carlos.lima@example.com', phone: '(11) 92222-0002', createdAt: atHour(-45, 10) },
  { id: 'c3', name: 'Beatriz Costa', email: 'beatriz.costa@example.com', phone: '(11) 92222-0003', createdAt: atHour(-10, 10) },
];

const services = [
  { id: 's1', name: 'Terapia individual', description: 'Sessão 1:1, 50 minutos.', durationMinutes: 50, price: 180, modality: 'ONLINE' as const },
  { id: 's2', name: 'Terapia de casal', description: 'Sessão para casais, 60 minutos.', durationMinutes: 60, price: 250, modality: 'BOTH' as const },
  { id: 's3', name: 'Terapia infantil', description: 'Atendimento infantil, 45 minutos.', durationMinutes: 45, price: 160, modality: 'IN_PERSON' as const },
];

const specialties = [
  { id: 'sp1', name: 'Ansiedade' },
  { id: 'sp2', name: 'TCC' },
  { id: 'sp3', name: 'Casais' },
  { id: 'sp4', name: 'Família' },
];

const professionals = [
  {
    id: 'p1',
    user: 'u1',
    slug: 'ana-reis',
    fullName: 'Dra. Ana Reis',
    bio: 'Psicóloga clínica com foco em ansiedade e terapia cognitivo-comportamental.',
    isPublic: true,
    specialtyIds: ['sp1', 'sp2'],
    photoUrl: '',
    createdAt: atHour(-200, 10),
  },
  {
    id: 'p2',
    user: 'u2',
    slug: 'pedro-alves',
    fullName: 'Dr. Pedro Alves',
    bio: 'Psicólogo especialista em terapia de casal e família.',
    isPublic: true,
    specialtyIds: ['sp3', 'sp4'],
    photoUrl: '',
    createdAt: atHour(-150, 10),
  },
];

const clinicalRecords = [
  { id: 'cr1', client: 'c1', content: 'Primeira sessão: paciente relata ansiedade relacionada ao trabalho.', createdAt: atHour(-10, 10) },
  { id: 'cr2', client: 'c1', content: 'Evolução positiva, técnicas de respiração incorporadas na rotina.', createdAt: atHour(-3, 9) },
];

const packages = [
  { id: 'pk1', client: 'c1', name: 'Pacote mensal', totalSessions: 4, usedSessions: 2, remainingSessions: 2, totalValue: 640, startDate: '2026-08-01' },
  { id: 'pk2', client: 'c2', name: 'Pacote trimestral', totalSessions: 12, usedSessions: 1, remainingSessions: 11, totalValue: 2160, startDate: '2026-09-01' },
];

let paymentReceiptSeq = 2;
const payments = [
  { id: 'pay1', client: 'c1', amount: 180, dueDate: '2026-09-05', status: 'PAID' as const, receiptNumber: 'REC-000001', paidAt: atHour(-5, 10) },
  { id: 'pay2', client: 'c2', amount: 250, dueDate: '2026-09-20', status: 'PENDING' as const, receiptNumber: 'REC-000002' },
];

const notifications = [
  { id: 'n1', title: 'Novo lead', message: 'João Silva enviou uma solicitação de contato.', read: false, createdAt: atHour(0, 8) },
  { id: 'n2', title: 'Agendamento confirmado', message: 'Maria Souza confirmou o horário de hoje.', read: false, createdAt: atHour(0, 7) },
  { id: 'n3', title: 'Agendamento concluído', message: 'Sessão com Maria Souza foi concluída.', read: true, createdAt: atHour(-3, 10) },
];

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
    recentActivity: [
      { action: 'create', resource: 'lead', resourceId: 'l1', createdAt: atHour(-1, 9) },
      { action: 'confirmed', resource: 'appointment', resourceId: 'a1', createdAt: atHour(0, 8) },
      { action: 'create', resource: 'payment', resourceId: 'pay2', createdAt: atHour(-2, 10) },
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
          const previousToken = String(body.refreshToken ?? '');
          const user = oauthSessions.get(previousToken);
          if (!user) return sendJson(res, 401, { title: 'Sessão expirada.', status: 401 });
          oauthSessions.delete(previousToken);
          const refreshToken = crypto.randomUUID();
          oauthSessions.set(refreshToken, user);
          return sendJson(res, 200, envelope({
            idToken: 'mock-id-token-refreshed', refreshToken, expiresIn: 3600, user,
          }));
        }
        if (pathname === '/oauth/v1/logout' && method === 'POST') {
          return sendJson(res, 200, {});
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
          if (clientId) list = list.filter((a) => a.client === clientId);
          if (professionalId) list = list.filter((a) => a.professional === professionalId);
          return sendJson(res, 200, paginated(list, page, perPage || 100));
        }
        const apptActionMatch = pathname.match(/^\/api\/v1\/appointments\/([^/]+)\/(confirm|cancel|complete)$/);
        if (apptActionMatch && method === 'PATCH') {
          const [, id, action] = apptActionMatch;
          const appt = appointments.find((a) => a.id === id);
          if (appt) {
            appt.status = action === 'confirm' ? 'CONFIRMED' : action === 'cancel' ? 'CANCELLED' : 'COMPLETED';
          }
          return sendJson(res, 200, envelope(appt ?? {}));
        }

        // ---- Availability ----
        if (pathname === '/api/v1/availability' && method === 'GET') {
          return sendJson(res, 200, paginated(availability, 1, 100));
        }
        if (pathname === '/api/v1/availability' && method === 'POST') {
          const body = await readBody(req);
          const slot = { id: nextId('av'), startsAt: String(body.startsAt), endsAt: String(body.endsAt), isBlocked: false };
          availability.push(slot);
          return sendJson(res, 201, envelope(slot));
        }
        const availMatch = pathname.match(/^\/api\/v1\/availability\/([^/]+)$/);
        if (availMatch && method === 'PATCH') {
          const body = await readBody(req);
          const slot = availability.find((s) => s.id === availMatch[1]);
          if (slot) Object.assign(slot, body);
          return sendJson(res, 200, envelope(slot ?? {}));
        }
        if (availMatch && method === 'DELETE') {
          const index = availability.findIndex((s) => s.id === availMatch[1]);
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
          const lead = leads.find((l) => l.id === leadMatch[1]);
          if (!lead) return sendJson(res, 404, { message: 'Lead não encontrado.' });
          return sendJson(res, 200, envelope(lead));
        }
        if (leadMatch && method === 'DELETE') {
          const index = leads.findIndex((l) => l.id === leadMatch[1]);
          if (index !== -1) leads.splice(index, 1);
          res.statusCode = 204;
          return res.end();
        }
        const leadStatusMatch = pathname.match(/^\/api\/v1\/leads\/([^/]+)\/status$/);
        if (leadStatusMatch && method === 'PATCH') {
          const body = await readBody(req);
          const lead = leads.find((l) => l.id === leadStatusMatch[1]);
          if (lead) lead.status = body.status as typeof lead.status;
          return sendJson(res, 200, envelope(lead ?? {}));
        }
        const leadConvertMatch = pathname.match(/^\/api\/v1\/leads\/([^/]+)\/convert$/);
        if (leadConvertMatch && method === 'POST') {
          const lead = leads.find((l) => l.id === leadConvertMatch[1]);
          const newClient = { id: nextId('c'), name: lead?.name ?? 'Novo cliente', email: lead?.email ?? '', phone: lead?.phone ?? '', createdAt: new Date().toISOString() };
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
            id: nextId('c'),
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
          const client = clients.find((c) => c.id === clientMatch[1]);
          if (!client) return sendJson(res, 404, { message: 'Cliente não encontrado.' });
          return sendJson(res, 200, envelope(client));
        }
        if (clientMatch && method === 'PATCH') {
          const body = await readBody(req);
          const client = clients.find((c) => c.id === clientMatch[1]);
          if (client) Object.assign(client, body);
          return sendJson(res, 200, envelope(client ?? {}));
        }
        if (clientMatch && method === 'DELETE') {
          const index = clients.findIndex((c) => c.id === clientMatch[1]);
          if (index !== -1) clients.splice(index, 1);
          res.statusCode = 204;
          return res.end();
        }

        // ---- Clinical Records ----
        // Só existe GET filtrado por client (sem listagem geral) — reflete o Back real.
        if (pathname === '/api/v1/clinical-records' && method === 'GET') {
          const clientId = url.searchParams.get('client');
          const list = clientId ? clinicalRecords.filter((r) => r.client === clientId) : [];
          return sendJson(res, 200, paginated(list, page, perPage));
        }
        if (pathname === '/api/v1/clinical-records' && method === 'POST') {
          const body = await readBody(req);
          const record = {
            id: nextId('cr'),
            client: String(body.client),
            content: String(body.content),
            createdAt: new Date().toISOString(),
          };
          clinicalRecords.unshift(record);
          return sendJson(res, 201, envelope(record));
        }
        const clinicalRecordMatch = pathname.match(/^\/api\/v1\/clinical-records\/([^/]+)$/);
        if (clinicalRecordMatch && method === 'PATCH') {
          const body = await readBody(req);
          const record = clinicalRecords.find((r) => r.id === clinicalRecordMatch[1]);
          if (record) Object.assign(record, body);
          return sendJson(res, 200, envelope(record ?? {}));
        }
        if (clinicalRecordMatch && method === 'DELETE') {
          const index = clinicalRecords.findIndex((r) => r.id === clinicalRecordMatch[1]);
          if (index !== -1) clinicalRecords.splice(index, 1);
          res.statusCode = 204;
          return res.end();
        }

        // ---- Packages ----
        if (pathname === '/api/v1/packages' && method === 'GET') {
          return sendJson(res, 200, paginated(packages, page, perPage));
        }
        if (pathname === '/api/v1/packages' && method === 'POST') {
          const body = await readBody(req);
          const totalSessions = Number(body.totalSessions);
          const pkg = {
            id: nextId('pk'),
            client: String(body.client),
            name: String(body.name),
            totalSessions,
            usedSessions: 0,
            remainingSessions: totalSessions,
            totalValue: Number(body.totalValue),
            startDate: String(body.startDate),
          };
          packages.push(pkg);
          return sendJson(res, 201, envelope(pkg));
        }
        const packageMatch = pathname.match(/^\/api\/v1\/packages\/([^/]+)$/);
        if (packageMatch && method === 'PATCH') {
          const body = await readBody(req);
          const pkg = packages.find((p) => p.id === packageMatch[1]);
          if (pkg) Object.assign(pkg, body);
          return sendJson(res, 200, envelope(pkg ?? {}));
        }
        if (packageMatch && method === 'DELETE') {
          const index = packages.findIndex((p) => p.id === packageMatch[1]);
          if (index !== -1) packages.splice(index, 1);
          res.statusCode = 204;
          return res.end();
        }

        // ---- Payments ----
        // GET /payments/balance existe no Back real mas a forma exata da resposta não está
        // documentada no Postman — não implementado aqui nem consumido pelo front por ora.
        if (pathname === '/api/v1/payments' && method === 'GET') {
          let list = payments;
          const clientId = url.searchParams.get('client');
          const status = url.searchParams.get('status');
          if (clientId) list = list.filter((p) => p.client === clientId);
          if (status) list = list.filter((p) => p.status === status);
          return sendJson(res, 200, paginated(list, page, perPage));
        }
        if (pathname === '/api/v1/payments' && method === 'POST') {
          const body = await readBody(req);
          paymentReceiptSeq += 1;
          const payment = {
            id: nextId('pay'),
            client: String(body.client),
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
          const payment = payments.find((p) => p.id === paymentMatch[1]);
          if (!payment) return sendJson(res, 404, { message: 'Pagamento não encontrado.' });
          return sendJson(res, 200, envelope(payment));
        }
        if (paymentMatch && method === 'PATCH') {
          const body = await readBody(req);
          const payment = payments.find((p) => p.id === paymentMatch[1]);
          if (payment) {
            Object.assign(payment, body);
            if (body.status === 'PAID' && !('paidAt' in body)) (payment as { paidAt?: string }).paidAt = new Date().toISOString();
          }
          return sendJson(res, 200, envelope(payment ?? {}));
        }
        if (paymentMatch && method === 'DELETE') {
          const index = payments.findIndex((p) => p.id === paymentMatch[1]);
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
            id: nextId('s'),
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
          const service = services.find((s) => s.id === serviceMatch[1]);
          if (service) Object.assign(service, body);
          return sendJson(res, 200, envelope(service ?? {}));
        }
        if (serviceMatch && method === 'DELETE') {
          const index = services.findIndex((s) => s.id === serviceMatch[1]);
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
          const specialty = { id: nextId('sp'), name: String(body.name) };
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
            id: nextId('p'),
            user: String(body.user),
            slug: String(body.slug),
            fullName: String(body.fullName),
            bio: String(body.bio ?? ''),
            isPublic: Boolean(body.isPublic),
            specialtyIds: Array.isArray(body.specialtyIds) ? (body.specialtyIds as string[]) : [],
            photoUrl: '',
            createdAt: new Date().toISOString(),
          };
          professionals.push(professional);
          return sendJson(res, 201, envelope(professional));
        }
        const professionalMatch = pathname.match(/^\/api\/v1\/professionals\/([^/]+)$/);
        if (professionalMatch && method === 'GET') {
          const professional = professionals.find((p) => p.id === professionalMatch[1]);
          if (!professional) return sendJson(res, 404, { message: 'Profissional não encontrado.' });
          return sendJson(res, 200, envelope(professional));
        }
        if (professionalMatch && method === 'PATCH') {
          const body = await readBody(req);
          const professional = professionals.find((p) => p.id === professionalMatch[1]);
          if (professional) Object.assign(professional, body);
          return sendJson(res, 200, envelope(professional ?? {}));
        }
        if (professionalMatch && method === 'DELETE') {
          const index = professionals.findIndex((p) => p.id === professionalMatch[1]);
          if (index !== -1) professionals.splice(index, 1);
          res.statusCode = 204;
          return res.end();
        }
        const publicProfileMatch = pathname.match(/^\/api\/v1\/professionals\/([^/]+)\/public-profile$/);
        if (publicProfileMatch && method === 'PATCH') {
          const body = await readBody(req);
          const professional = professionals.find((p) => p.id === publicProfileMatch[1]);
          if (professional) Object.assign(professional, body);
          return sendJson(res, 200, envelope(professional ?? {}));
        }

        // ---- Me ----
        // /me retorna o User autenticado (id/email/role), não o Professional —
        // o perfil completo vem de GET /api/v1/professionals/{id} (useMyPublicProfile.ts).
        // Fixo em 'p1' (Dra. Ana Reis): o mock não rastreia sessão por token.
        if (pathname === '/api/v1/me' && method === 'GET') {
          return sendJson(res, 200, envelope({ id: 'p1', email: 'ana.reis@vivamente.dev', role: 'THERAPIST' }));
        }
        if (pathname === '/api/v1/me' && method === 'PATCH') {
          const body = await readBody(req);
          const professional = professionals.find((p) => p.id === 'p1');
          if (professional) Object.assign(professional, body);
          return sendJson(res, 200, envelope(professional ?? {}));
        }

        // ---- Notifications ----
        if (pathname === '/api/v1/notifications' && method === 'GET') {
          return sendJson(res, 200, paginated(notifications, page, perPage));
        }
        const notifReadMatch = pathname.match(/^\/api\/v1\/notifications\/([^/]+)\/read$/);
        if (notifReadMatch && method === 'PATCH') {
          const notif = notifications.find((n) => n.id === notifReadMatch[1]);
          if (notif) notif.read = true;
          return sendJson(res, 200, envelope(notif ?? {}));
        }
        if (pathname === '/api/v1/notifications/read-all' && method === 'PATCH') {
          notifications.forEach((n) => (n.read = true));
          return sendJson(res, 200, {});
        }

        next();
      });
    },
  };
}
