# VivaMente Back — Referência da API

Documento pra Loja (Next.js) e Plataforma (Vue) consumirem o Back. Complementa (não substitui) o contrato técnico exato, que é sempre gerado do código:

- **Swagger UI**: `{base_url}/api/schema/swagger-ui/`
- **Schema OpenAPI bruto**: `{base_url}/api/schema/` (JSON) — snapshot local em [`docs/openapi.yaml`](docs/openapi.yaml)
- **Postman collection**: [`postman/VivaMente-Back.postman_collection.json`](postman/VivaMente-Back.postman_collection.json) + [`postman/VivaMente-Back-Local.postman_environment.json`](postman/VivaMente-Back-Local.postman_environment.json) — importa os dois, roda a pasta **"1. Dev Auth"** primeiro e o resto funciona sozinho (IDs são capturados automaticamente entre requests).

Se este documento e o Swagger divergirem em algum detalhe, **o Swagger está certo** — ele é gerado do código a cada deploy, este arquivo é mantido à mão.

---

## Índice

1. [Autenticação](#1-autenticação)
2. [Convenções (envelope, paginação, erros)](#2-convenções)
3. [Papéis e isolamento entre terapeutas](#3-papéis-e-isolamento-entre-terapeutas)
4. [Usuário autenticado](#4-usuário-autenticado--apiv1me)
5. [Profissionais e especialidades](#5-profissionais-e-especialidades)
6. [Serviços](#6-serviços)
7. [Leads](#7-leads)
8. [Endpoints públicos (Loja, sem login)](#8-endpoints-públicos-loja-sem-login)
9. [Clientes](#9-clientes)
10. [Disponibilidade e agendamentos](#10-disponibilidade-e-agendamentos)
11. [Prontuários clínicos](#11-prontuários-clínicos--clinical-records)
12. [Pacotes de sessão](#12-pacotes-de-sessão--packages)
13. [Pagamentos](#13-pagamentos--payments)
14. [Notificações](#14-notificações)
15. [Auditoria (somente ADMIN)](#15-auditoria--audit-logs-somente-admin)
16. [Dashboard](#16-dashboard)
17. [Health checks](#17-health-checks)
18. [Endpoints que a Loja/Plataforma NÃO chamam](#18-endpoints-que-a-lojaplataforma-não-chamam)

---

## 1. Autenticação

Todo endpoint autenticado espera `Authorization: Bearer <token>`, onde `<token>` é um **ID Token do Firebase** — o mesmo token que o serviço **Oauth** devolve no login. O Back valida esse token sozinho (não pergunta pro Oauth) e resolve o usuário local pelo `firebase_uid` da claim.

**Ambiente local/dev sem o Oauth pronto:** existe um backdoor **somente quando `DEBUG=True`**:

```http
POST /api/v1/dev/fake-token
Content-Type: application/json

{ "role": "THERAPIST" }
```
Resposta: `{ "token": "...", "uid": "...", "email": "...", "role": "THERAPIST" }`. Use esse `token` no header `Authorization: Bearer` normalmente. **Nunca disponível fora de DEBUG.**

---

## 2. Convenções

### Envelope de resposta (igual nos 4 projetos da VivaMente)

```jsonc
// sucesso — item
{ "data": { ... }, "meta": { "request_id": "req_abc123", "timestamp": "2026-09-02T10:30:00Z" } }

// sucesso — lista
{ "data": [...], "pagination": { "page": 1, "per_page": 20, "total": 42, "total_pages": 3 } }

// erro (RFC 9457)
{ "type": "https://api.vivamenteterapias.com.br/errors/not-found", "title": "Not Found", "status": 404, "detail": "Cliente não encontrado.", "request_id": "req_abc123" }
```

Todo endpoint (inclusive `DELETE`, que responde `204` sem corpo) devolve o header `X-Request-ID` — use pra correlacionar com o suporte se algo der errado.

### Paginação e filtros

Listagens aceitam `?page=1&per_page=20` (padrão 20, máximo 100) e `?ordering=campo` / `?ordering=-campo` pra ordenar. Os filtros disponíveis variam por recurso — ver tabela de cada seção.

### Status HTTP

| Código | Quando |
|---|---|
| `401` | sem token ou token inválido |
| `403` | autenticado, mas sem permissão pra essa ação |
| `404` | recurso não existe **ou pertence a outro terapeuta** (nunca revelamos que existe) |
| `400` | validação falhou (corpo malformado, regra de negócio violada) |
| `429` | rate limit (só nos 3 endpoints públicos sem login) |

---

## 3. Papéis e isolamento entre terapeutas

Dois papéis: **`ADMIN`** e **`THERAPIST`**. Regra geral (com uma exceção importante, ver §11): terapeuta só vê/edita os próprios dados; ADMIN vê tudo. Em toda criação, o campo `professional` é **preenchido automaticamente** pro terapeuta logado — ele nunca precisa (nem consegue) mandar esse campo. ADMIN precisa informar `professional` explicitamente ao criar qualquer recurso.

---

## 4. Usuário autenticado — `/api/v1/me`

| Método | Rota | Corpo | Descrição |
|---|---|---|---|
| GET | `/api/v1/me` | — | Dados do usuário autenticado (não confundir com o perfil público, §8) |
| PATCH | `/api/v1/me` | `{ "email": "..." }` | Só `email` é editável aqui |

Campos: `id, firebase_uid, email, role, active, created_at, updated_at`.

---

## 5. Profissionais e especialidades

| Método | Rota | Quem | Filtros/ordenação |
|---|---|---|---|
| GET/POST | `/api/v1/professionals` | ADMIN lista/cria tudo; THERAPIST só o próprio | `?is_public=`, `?ordering=full_name\|created_at` |
| GET/PATCH/DELETE | `/api/v1/professionals/{id}` | ADMIN qualquer um; THERAPIST só o próprio (nunca deleta) | — |
| PATCH | `/api/v1/professionals/{id}/public-profile` | dono do perfil ou ADMIN | edita só o que aparece na página pública |
| GET/POST/PATCH/DELETE | `/api/v1/specialties` | leitura livre; escrita só ADMIN | `?ordering=name` |

Campos de `Professional`: `id, user, user_email, slug, full_name, bio, photo_url, registration, is_public, specialties[], created_at, updated_at`. Na escrita, `specialty_ids` (lista de IDs) em vez de `specialties`.

---

## 6. Serviços

| Método | Rota | Quem | Filtros/ordenação |
|---|---|---|---|
| GET/POST/PATCH/DELETE | `/api/v1/services` | terapeuta gerencia os próprios; ADMIN, qualquer um | `?modality=`, `?professional=`, `?ordering=name\|price\|created_at` |

Campos: `id, professional, name, description, duration_minutes, price, modality, created_at`. `modality`: `ONLINE` \| `IN_PERSON` \| `BOTH`.

---

## 7. Leads

Fluxo de status: `NEW → CONTACTED → AWAITING_RESPONSE → SCHEDULED → CONVERTED`.

| Método | Rota | Quem | Filtros/ordenação |
|---|---|---|---|
| GET/POST | `/api/v1/leads` | uso interno (terapeuta/ADMIN) | `?status=`, `?professional=`, `?ordering=created_at\|status` |
| GET/PATCH/DELETE | `/api/v1/leads/{id}` | dono do lead ou ADMIN | — |
| PATCH | `/api/v1/leads/{id}/status` | idem | body: `{ "status": "CONTACTED" }` |
| POST | `/api/v1/leads/{id}/convert` | idem | sem corpo; cria um `Client`, marca o lead `CONVERTED`. 400 se já convertido |

Campos: `id, professional, name, email, phone, message, service, status, created_at, updated_at`.

---

## 8. Endpoints públicos (Loja, sem login)

Únicos 3 endpoints que **não exigem token**. Todos com rate limit por IP.

| Método | Rota | Rate limit | Descrição |
|---|---|---|---|
| POST | `/api/v1/public/appointment-requests` | 10/min | Cria um `Lead` (`status=NEW`) e notifica o terapeuta. Ver corpo abaixo |
| GET | `/api/v1/public/professionals/{slug}` | 30/min | Perfil público — só campos não-sensíveis |
| GET | `/api/v1/public/professionals/{slug}/available-slots` | 20/min | Horários livres (sem agendamento conflitante) |

**`POST /public/appointment-requests`:**
```jsonc
{
  "professionalSlug": "ana-silva",
  "name": "João Silva",
  "email": "joao@email.com",
  "phone": "+55 11 99999-9999",
  "message": "Gostaria de agendar uma sessão",
  "service": 12,                            // opcional — id do Service
  "preferredSlot": "2026-09-10T14:00:00Z"   // opcional
}
```
Resposta é **mínima de propósito**: `{ "id": 42, "status": "NEW" }` — não ecoa os dados de contato que o próprio cliente acabou de enviar. `professionalSlug` precisa apontar pra um profissional com `is_public=true` (senão `400`).

**`GET /public/professionals/{slug}`** retorna: `slug, full_name, bio, photo_url, registration, specialties[], services[]` — nunca telefone, agenda interna ou dado de cliente.

---

## 9. Clientes

| Método | Rota | Quem | Filtros/ordenação |
|---|---|---|---|
| GET/POST/PATCH/DELETE | `/api/v1/clients` | terapeuta gerencia os próprios; ADMIN, qualquer um | `?professional=`, `?ordering=name\|created_at` |

Campos: `id, professional, lead, name, email, phone, birth_date, document, administrative_notes, created_at, updated_at`.

`administrative_notes` é **dado administrativo** (ex.: "prefere pagar via Pix") — **nunca** coloque conteúdo clínico aqui. Prontuário de verdade é um recurso separado, ver §11.

---

## 10. Disponibilidade e agendamentos

| Método | Rota | Quem | Filtros/ordenação |
|---|---|---|---|
| GET/POST/PATCH/DELETE | `/api/v1/availability` | terapeuta define os próprios horários; ADMIN, qualquer um | `?professional=`, `?is_blocked=`, `?ordering=starts_at` |
| GET/POST/PATCH/DELETE | `/api/v1/appointments` | terapeuta gerencia os próprios; ADMIN, qualquer um | `?status=`, `?professional=`, `?client=`, `?ordering=starts_at\|status` |
| PATCH | `/api/v1/appointments/{id}/confirm` \| `/cancel` \| `/complete` | idem | sem corpo; transições: `PENDING→CONFIRMED\|CANCELLED`, `CONFIRMED→COMPLETED\|CANCELLED` |

Campos de `Appointment`: `id, professional, client, service, package, starts_at, ends_at, status, modality, call_link, price, notes, created_at`.

- `modality`: `ONLINE` \| `IN_PERSON` \| `HYBRID` (opcional)
- `call_link`: URL validada (opcional)
- `package`: id de um `Package` (§12), opcional — **bloqueia (400)** se o pacote estiver cancelado/concluído/expirado ou sem sessões restantes
- **Sobreposição de horário é bloqueada** pelo próprio banco (não só pela API) — dois agendamentos do mesmo profissional nunca se sobrepõem, nem sob concorrência

Campos de `AvailabilitySlot`: `id, professional, starts_at, ends_at, is_blocked`.

---

## 11. Prontuários clínicos — `clinical-records`

> ⚠️ **Acesso restrito.** Só o terapeuta responsável pelo `client` pode ler, criar, editar ou excluir um prontuário. **ADMIN recebe `403` em qualquer ação aqui** — não existe bypass, ao contrário de todo o resto da API.

| Método | Rota | Filtros/ordenação |
|---|---|---|
| GET/POST | `/api/v1/clinical-records` | `?client=<id>` (recomendado sempre filtrar), `?ordering=recorded_at\|created_at` |
| GET/PATCH/DELETE | `/api/v1/clinical-records/{id}` | — |

Campos: `id, client, professional, appointment, content, recorded_at, author, created_at, updated_at`.

- `appointment` é opcional — quando informado, só pode existir **um** prontuário por agendamento (400 se repetir)
- `author` e `professional` são sempre preenchidos pelo servidor, nunca aceitos do cliente da API
- `content` é texto livre — a Plataforma decide a UI (textarea, editor rico, etc.), o Back só guarda a string

---

## 12. Pacotes de sessão — `packages`

| Método | Rota | Filtros/ordenação |
|---|---|---|
| GET/POST | `/api/v1/packages` | `?client=<id>`, `?status=`, `?ordering=created_at\|start_date` |
| GET/PATCH/DELETE | `/api/v1/packages/{id}` | — |

Campos: `id, professional, client, name, total_sessions, total_value, status, start_date, expiration_date, notes, used_sessions, remaining_sessions, created_at, updated_at`.

- `status`: `ACTIVE` \| `COMPLETED` \| `CANCELLED`
- `used_sessions`/`remaining_sessions` são **calculados em tempo real** a partir dos agendamentos vinculados (`Appointment.package`, excluindo cancelados) — não são um contador que alguém precisa atualizar manualmente, sempre refletem a agenda de verdade
- Quando um agendamento vinculado a um pacote deixa `remaining_sessions <= 1`, o terapeuta recebe uma notificação automática ("Pacote quase no fim")

---

## 13. Pagamentos — `payments`

| Método | Rota | Filtros/ordenação |
|---|---|---|
| GET/POST | `/api/v1/payments` | `?client=<id>`, `?status=`, `?ordering=created_at\|due_date` |
| GET/PATCH/DELETE | `/api/v1/payments/{id}` | — |
| GET | `/api/v1/payments/balance?month=YYYY-MM` | **`month` é obrigatório** |

Campos: `id, professional, client, appointment, amount, status, due_date, paid_at, payment_method, description, receipt_number, created_at, updated_at`.

- `status`: `PENDING` \| `PAID` \| `CANCELLED`. Transições: `PENDING→PAID\|CANCELLED`; `PAID`/`CANCELLED` são finais
- `receipt_number` é **sempre gerado pelo servidor** (formato `REC-000123`) — qualquer valor enviado no corpo é ignorado
- Ao marcar `status: "PAID"`, `paid_at` é preenchido automaticamente com o momento atual se você não mandar um
- Criar um pagamento com `status` padrão (`PENDING`) notifica o terapeuta automaticamente

**`GET /payments/balance?month=2026-09`** responde:
```jsonc
{
  "month": "2026-09",
  "received_total": "1200.00",   // soma dos PAID com due_date nesse mes
  "received_count": 8,
  "pending_total": "350.00",     // soma dos PENDING com due_date nesse mes
  "pending_count": 3,
  "sessions_count": 11           // received_count + pending_count
}
```
THERAPIST vê só o próprio escopo; ADMIN vê a plataforma inteira.

---

## 14. Notificações

| Método | Rota | Filtros/ordenação |
|---|---|---|
| GET | `/api/v1/notifications` | sempre só as próprias, ADMIN incluso | `?read_at=`, `?ordering=created_at` |
| PATCH | `/api/v1/notifications/{id}/read` | — |
| PATCH | `/api/v1/notifications/read-all` | responde `{ "updated": N }` — idempotente |

Campos: `id, title, body, read_at, created_at`. Eventos que geram notificação hoje: novo lead público, pagamento pendente criado, pacote de sessão quase no fim.

---

## 15. Auditoria — `audit-logs` (somente ADMIN)

| Método | Rota | Filtros/ordenação |
|---|---|---|
| GET | `/api/v1/audit-logs` | `?action=`, `?resource=`, `?user=`, `?ordering=created_at` |
| GET | `/api/v1/audit-logs/{id}` | — |

THERAPIST recebe `403`. Campos: `id, user, action, resource, resource_id, metadata, created_at` — `metadata` nunca guarda dado sensível (email, telefone, conteúdo de prontuário etc.), só identificadores.

---

## 16. Dashboard

| Método | Rota |
|---|---|
| GET | `/api/v1/dashboard` \| `/api/v1/dashboard/metrics` (aliases, mesma resposta) |

```jsonc
{
  "new_leads": 3,
  "active_clients": 12,
  "sessions_this_month": 9,
  "appointments_today": 2,
  "upcoming_appointments": [
    { "id": 55, "client": 7, "starts_at": "2026-09-11T14:00:00Z", "status": "PENDING" }
  ],
  "pending_payments": { "count": 2, "total": "300.00" },
  "monthly_summary": { "received_total": "1200.00", "sessions_count": 9 },
  "recent_activity": [
    { "action": "create", "resource": "appointment", "resource_id": "55", "created_at": "..." }
  ]
}
```
`upcoming_appointments` traz os próximos 5. `recent_activity` traz as últimas 10 ações do **próprio usuário logado** (não da plataforma toda), sem conteúdo sensível. THERAPIST vê só o próprio escopo; ADMIN vê a plataforma inteira.

---

## 17. Health checks

Sem autenticação, usados por monitoramento — não fazem parte do fluxo de produto:

`GET /api/v1/health` · `GET /api/v1/health/database` · `GET /api/v1/ready`

---

## 18. Endpoints que a Loja/Plataforma NÃO chamam

- `POST /api/v1/dev/fake-token` — só existe em `DEBUG=True`, é um atalho de desenvolvimento
- `PUT/DELETE /api/v1/internal/identity/users/{firebase_uid}` — comunicação **interna** Oauth → Back (sincronização de usuário via JWT RS256 assinado pelo Oauth), nunca chamado por frontend nenhum
