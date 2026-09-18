# Tarefa: Loja (site público)

> Documento para o desenvolvedor responsável pelo projeto **Loja**. Leia do início ao fim antes de começar — ele foi escrito pra você não precisar perguntar nada a mais pra tocar o projeto sozinho.

## 1. O que é o VivaMente (contexto rápido)

A VivaMente é uma plataforma para uma empresa de terapias, dividida em **4 projetos separados**, cada um com um desenvolvedor diferente, que só se conversam por HTTP:

```
                              INTERNET
                                 │
                 ┌───────────────┴───────────────┐
                 │                               │
        vivamenteterapias.com.br      app.vivamenteterapias.com.br
           LOJA (Next.js) — você!         PLATAFORMA (Vue)
        [site público, sem login]     [painel interno, com login]
                 │                               │
                 │                    ┌──────────┴──────────┐
                 │                    │                     │
                 │              auth.vivamenteterapias   api.vivamenteterapias
                 │                    OAUTH                BACK (Django)
                 │                    │                     │
                 └────────────────────┼─────────────────────┘
                                      │
                          ┌───────────┴───────────┐
                          │                       │
                      Firebase                PostgreSQL
                    (identidade)               (Supabase)
```

**Você constrói a LOJA**: o site público que qualquer visitante da internet acessa, sem precisar de conta, para conhecer um terapeuta e pedir atendimento. Cada terapeuta tem sua própria página, tipo `vivamenteterapias.com.br/ana-silva`, que ele divulga nas redes sociais dele.

Repare que a Loja **não tem login** e **nunca fala com o Oauth**. Você só conversa com o **Back**.

---

## 2. Sua responsabilidade

- ✅ Páginas públicas (`/`, `/[slug]`, `/[slug]/agendar`, `/sobre`, `/contato`, `/privacidade`, `/termos`).
- ✅ SEO: cada página de terapeuta precisa rankear bem no Google e ficar bonita quando compartilhada no WhatsApp/Instagram.
- ✅ Formulário de solicitação de atendimento (transforma um visitante em Lead lá no Back).
- ✅ Um **BFF** (Backend for Frontend) — funções server-side do Next que conversam com o Back, escondendo a URL/detalhes internos da API do navegador do visitante.

O que você **NÃO** faz:

- ❌ Não tem login, não conhece o serviço Oauth.
- ❌ Não decide regra de negócio (ex: "esse horário é válido?"). Você só exibe o que o Back te devolve e envia o que o visitante preencheu — quem valida de verdade é sempre o Back.
- ❌ Não mostra nada que exija autenticação (agenda interna, clientes, dashboard) — isso é da Plataforma.

### O que é um BFF, e por que você precisa de um

**BFF (Backend For Frontend)** é uma camada de servidor que existe só para o seu frontend — no seu caso, são as Server Components e Server Actions do Next.js. Em vez do navegador do visitante chamar `api.vivamenteterapias.com.br` diretamente, ele fala com o próprio servidor Next, que por sua vez chama o Back. Isso existe por dois motivos práticos:

1. Você pode **agregar** várias chamadas ao Back em uma só ida do navegador (ex: buscar o perfil do terapeuta + os serviços dele numa única function, ao invés do browser fazer 2 requisições).
2. Fica mais fácil adicionar cache/revalidação (`revalidate` do Next) sem expor isso no cliente.

---

## 3. Stack

| Camada | Escolha |
|---|---|
| Framework | Next.js + TypeScript (App Router) |
| Estilo | Tailwind CSS + shadcn/ui (componentes headless) + Lucide Icons |
| Design system | `@vivamente/design` — pacote compartilhado com a Plataforma, **já existe** em `design/` na raiz do projeto |
| Dados | Server Components (para leitura) + Server Actions ou route handlers (para o formulário de agendamento/contato) |

Pasta do projeto: `frontend-loja` (já existe, vazia).

### Usando o design system compartilhado

Não invente cores, fontes ou espaçamentos — está tudo definido em `design/` na raiz do repositório, e é o **mesmo** usado pela Plataforma (identidade visual única entre os dois). Quando inicializar o projeto:

```jsonc
// frontend-loja/package.json
{ "dependencies": { "@vivamente/design": "file:../design" } }
```

```css
/* app/globals.css */
@import "@vivamente/design/tokens.css";
```

```js
// tailwind.config.js
module.exports = {
  presets: [require("@vivamente/design/tailwind-preset")],
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
};
```

Antes de criar qualquer componente (Button, Input, Card, etc.), **consulte `design/components.md`** — lá estão definidas as variantes, tamanhos, estados e regras de acessibilidade de cada um. Não reinvente um componente que já está especificado ali.

---

## 4. Estrutura de rotas

```
/                          → home
/[slug]                    → página pública do terapeuta
/[slug]/agendar            → fluxo de solicitação de atendimento
/[slug]/agendar/sucesso    → confirmação
/terapeutas                → catálogo público (busca + paginação)
/sobre
/contato                   → paciente sem terapeuta escolhido OU terapeuta interessado (?interesse=atendimento|terapeuta)
/privacidade
/termos
```

> Atualizado 2026-09-17: `/terapeutas` e `/contato` (envio real, não mais só demonstração)
> foram implementados. Ver seção 5.4.

---

## 5. Contrato de API que você consome

Você só fala com o **Back**, e só com os endpoints **públicos** dele (prefixo `/api/v1/public/...`) — eles não exigem token. Envelope de resposta padrão:

```json
{ "data": { ... }, "meta": { "request_id": "req_abc123", "timestamp": "2026-09-02T10:30:00Z" } }
```

Erros seguem RFC 9457:
```json
{ "type": "https://api.vivamenteterapias.com.br/errors/not-found", "title": "Not Found", "status": 404, "detail": "Terapeuta não encontrado." }
```

### 5.1 Página do terapeuta

```
GET /api/v1/public/professionals/{slug}
```
```json
{
  "data": {
    "slug": "ana-silva",
    "fullName": "Ana Silva",
    "registration": "CRP 06/12345",
    "bio": "Psicóloga clínica há 10 anos...",
    "photoUrl": "https://...",
    "specialties": ["Ansiedade", "Terapia de casal"],
    "services": [
      { "id": "svc_1", "name": "Sessão individual", "durationMinutes": 50, "price": 180.0, "modality": "BOTH" }
    ]
  }
}
```
`404` se o slug não existe — trate como página não encontrada (ver seção 7).

### 5.2 Horários disponíveis

```
GET /api/v1/public/professionals/{slug}/available-slots
```
```json
{ "data": [ { "startsAt": "2026-09-10T14:00:00Z", "endsAt": "2026-09-10T14:50:00Z" } ] }
```

### 5.3 Solicitação de atendimento / formulário de contato

Um único endpoint cobre os dois casos (agendamento com horário escolhido, ou contato genérico):

```
POST /api/v1/public/appointment-requests
```
```json
{
  "professionalSlug": "ana-silva",
  "name": "João Silva",
  "email": "joao@email.com",
  "phone": "+55 11 99999-9999",
  "message": "Gostaria de agendar uma sessão",
  "service": "svc_1",               // opcional
  "preferredSlot": "2026-09-10T14:00:00Z"  // opcional
}
```

Resposta `201` em caso de sucesso, `422` com `errors` por campo em caso de validação, `429` se o Back detectar abuso (rate limit em endpoint público).

Isso é só pra pedido **dirigido a um terapeuta específico** (`professionalSlug` sempre presente). Contato institucional sem terapeuta escolhido é outro endpoint — ver 5.4.

### 5.4 Catálogo e contato institucional (implementado 2026-09-17)

```
GET /api/v1/public/professionals?search=&specialties=&page=
```
Paginado (`{data, pagination}`), mesmos campos do perfil individual **sem** `services`. Alimenta `/terapeutas` e o `sitemap.ts` (não existe mais listagem de slugs "chumbada" — o sitemap busca aqui).

```
POST /api/v1/public/institutional-requests
```
```json
{ "kind": "PATIENT", "name": "Maria", "email": "maria@email.com", "phone": "", "message": "Preciso de indicação" }
```
`kind` é `"PATIENT"` (pedido de indicação, sem terapeuta escolhido) ou `"THERAPIST_INTEREST"` (terapeuta manifestando interesse em entrar na rede — **nunca** cria conta/perfil automaticamente, só fica numa fila pra equipe avaliar). Resposta mínima `{ "id", "status" }`, mesmo padrão de `appointment-requests`.

Cliente em `src/lib/api/institutional-requests.ts` e `professionals-catalog.ts` — mesmo padrão `isMockEnabled()`/`mockX()` de `professionals.ts`/`mocks.ts`, nada de reinventar.

---

## 6. SEO — obrigatório, não opcional

Cada `/[slug]` precisa gerar, usando os metadados do Next.js App Router:

- `title` e `description` únicos por terapeuta (usando os dados vindos do Back)
- Open Graph (`og:title`, `og:image`, `og:description`) — importante porque terapeutas vão compartilhar o link no Instagram/WhatsApp
- Twitter/X card
- `canonical`
- `sitemap.xml` dinâmico, listando todos os slugs públicos
- `robots.txt`
- Schema.org/JSON-LD do tipo `Person` ou `ProfessionalService`

```tsx
// app/[slug]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const professional = await getProfessional(params.slug); // Server Component, chama o Back
  return {
    title: `${professional.fullName} — VivaMente Terapias`,
    description: professional.bio,
    openGraph: { images: [professional.photoUrl] },
  };
}
```

---

## 7. Componentes principais

```
components/
├── Header, Footer
├── ProfessionalHero, ProfessionalBio, Specialties, Services, ServiceCard
├── AvailabilityCalendar, AppointmentForm, ContactForm
├── Location, CTA, Testimonials, FAQ
├── Modal, Button, Input, Select, Dialog, Toast, Skeleton, ErrorState
```

Os componentes de UI genéricos (`Button`, `Input`, `Select`, `Modal`, `Toast`, `Skeleton`) **já estão especificados** em `design/components.md` — siga as variantes/estados de lá.

---

## 8. Estados que você precisa tratar

| Situação | O que mostrar |
|---|---|
| `/[slug]` que não existe | Página 404 real (não redirecionar silenciosamente) |
| Sem horários disponíveis | "Não há horários disponíveis" — nunca uma tela em branco |
| Erro ao carregar dados do Back | "Não foi possível carregar..." + opção de tentar de novo |
| Formulário enviando | Estado de loading no botão (usar o componente `Button` com `loading`, já especificado no design system) |
| Rate limit (`429`) no formulário | Mensagem clara pedindo para aguardar, sem termos técnicos |

Loading, Empty, Error, Success, Not Found, Unavailable, Submitting, Rate Limited — todos precisam de um estado visual pensado, não deixe nenhum "quebrando" em branco.

---

## 9. Variáveis de ambiente (`.env.local` / `.env.example`)

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
BACK_API_URL=http://localhost:8000       # usado só no servidor (Server Components/Actions), nunca exposto ao browser
MOCK_BACK=1                              # 1 = usa lib/api/mocks.ts (sem Back real); nunca ativa em produção (checado 2x em isMockEnabled())
```

Note que a URL do Back **não** tem o prefixo `NEXT_PUBLIC_` — ela só é usada no lado servidor (BFF), o navegador do visitante nunca fala direto com `api.vivamenteterapias.com.br`.

---

## 10. Como testar sem o Back pronto

Não espere o Back estar 100% pronto para começar a codar a UI:

1. Peça ao dev do Back a URL do Swagger (`/api/schema/swagger-ui/`) assim que os primeiros endpoints públicos existirem — ele consegue subir isso bem cedo.
2. Enquanto isso, crie funções mock com os exemplos de JSON desta seção (5.1, 5.2, 5.3) num arquivo `lib/mock-data.ts`, e troque pela chamada real ao Back quando ela existir — sem mudar a assinatura da função que os componentes usam.
3. Rode contra o Back local (`http://localhost:8000`) assim que o outro dev tiver os endpoints públicos no ar — combine com ele para avisar no grupo quando isso acontecer.

---

## 11. Skills recomendadas (Claude Code)

### Comece pelo design system interno, antes de qualquer skill externa de UI

O projeto já tem um design system pronto em `D:\projetos\VivaMente\design` (pasta `design/` na raiz do repositório) — ele já foi citado na seção 3, mas vale reforçar aqui: **é a primeira coisa a consultar antes de instalar qualquer skill de UI/componentes**, porque cores, tipografia, espaçamento e a especificação de cada componente (variantes, estados, acessibilidade) já estão decididos ali, e é o mesmo sistema que a Plataforma (Vue) usa. Não peça pro agente "criar um design system" ou "escolher uma paleta de cores" — aponte ele para:

- `design/README.md` — como consumir o pacote (`@vivamente/design`)
- `design/tokens.css` — cores, tipografia, espaçamento (fonte única de verdade)
- `design/components.md` — variantes/estados/acessibilidade de cada componente
- `design/preview.html` — prévia visual, abre direto no navegador

Se estiver usando Claude Code, vale colar o conteúdo de `design/components.md` no contexto (ou apontar o arquivo) antes de pedir para o agente construir uma tela nova.

### Ponytail — evita que o agente te entregue código inchado

[github.com/dietrichgebert/ponytail](https://github.com/dietrichgebert/ponytail) ensina o agente a se comportar como um "dev sênior preguiçoso": antes de escrever qualquer código, ele passa por uma escada de perguntas — "isso precisa existir?", "já existe no projeto?", "a stdlib/lib já instalada resolve?" — e só escreve código novo depois de esgotar essas opções. Útil aqui porque é fácil o agente sugerir instalar uma lib nova pra algo que o Next.js, o Tailwind ou o `@vivamente/design` já resolvem.

```
/plugin marketplace add DietrichGebert/ponytail
/plugin install ponytail@ponytail
```

### skills.sh — skills específicas da sua stack

[skills.sh](https://www.skills.sh/) é um diretório de skills reutilizáveis para agentes de IA. Instala-se com `npx skills add <url-do-repo> --skill <nome-da-skill>`. Recomendadas para este projeto (Next.js + SEO):

| Skill | O que ensina | Instalar |
|---|---|---|
| `nextjs-app-router-patterns` | Padrões do App Router (Server Components, metadata) — exatamente o que as seções 2 (BFF) e 6 (SEO) usam | `npx skills add https://github.com/wshobson/agents --skill nextjs-app-router-patterns` |
| `vercel-react-best-practices` | Boas práticas de React/Next mantidas pelo próprio time da Vercel | `npx skills add https://github.com/vercel-labs/agent-skills --skill vercel-react-best-practices` |
| `seo` | Checklist de SEO técnico — reforça a seção 6 | `npx skills add https://github.com/addyosmani/web-quality-skills --skill seo` |
| `a11y-audit` | Auditoria de acessibilidade | `npx skills add https://github.com/alirezarezvani/claude-skills --skill a11y-audit` |

Não precisa instalar todas de uma vez — comece pela `nextjs-app-router-patterns`.

---

## 12. Checklist de "pronto" (Definition of Done)

- [ ] Todas as páginas da seção 4
- [ ] Design system (`@vivamente/design`) integrado, sem cores/tipografia hardcoded
- [ ] Responsividade (mobile-first)
- [ ] Acessibilidade (seguindo `design/components.md`)
- [ ] SEO completo (metadata, OG, sitemap, robots.txt, JSON-LD)
- [ ] BFF implementado (Server Components/Actions, URL do Back nunca exposta ao browser)
- [ ] Perfil dinâmico por slug funcionando
- [ ] Consulta de horários disponíveis
- [ ] Solicitação de atendimento (formulário completo, com todos os estados da seção 8)
- [ ] 404 real para slug inexistente
- [ ] Performance (Core Web Vitals — Lighthouse verde)
- [ ] Testes (pelo menos: página renderiza com dados válidos, 404 com slug inválido, formulário valida campos obrigatórios)

---

## 13. Fora de escopo (não faça isso aqui)

- Login, dashboard, agenda interna, clientes → é da **Plataforma**.
- Regra de negócio (ex: validar se um horário realmente está livre) → é do **Back**, você só exibe o que ele responde.
- Falar diretamente com o Firebase/Oauth → você não tem conceito de usuário autenticado.
