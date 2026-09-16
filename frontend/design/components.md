# VivaMente Terapias — Biblioteca de Componentes

Especificação de variantes, tamanhos, estados, comportamento, acessibilidade e
responsividade para cada componente. Base visual em [tokens.css](./tokens.css);
mapeamento Tailwind em [tailwind-preset.js](./tailwind-preset.js). Prévia
visual offline em [preview.html](./preview.html).

Bibliotecas de base (conforme `doc/front/design system.txt`): Next.js usa
Tailwind + shadcn/ui + Lucide Icons como fundação headless/estilizável; Vue usa
Tailwind + Reka UI (headless, sucessor do Radix Vue) + Lucide + `v-calendar` para
Calendar/DatePicker. Os tokens acima sobrescrevem os defaults dessas libs — a
identidade visual não fica presa a elas.

Convenção de estados em toda a biblioteca: `default`, `hover`, `active`,
`focus-visible` (anel `--focus-ring`, nunca suprimido), `disabled` (opacidade
0.5, `cursor: not-allowed`), e onde aplicável `loading`, `error`, `readonly`.

---

## Formulário

| Componente | Variantes | Tamanhos | Estados | Comportamento | A11y | Responsivo |
|---|---|---|---|---|---|---|
| **Button** | Primary, Secondary, Ghost, Destructive, Link | sm (32px), md (40px), lg (48px) | default/hover/active/focus/disabled/loading (spinner substitui label, mantém largura) | `type` explícito sempre; loading bloqueia re-clique (debounce implícito) | `aria-busy` em loading; alvo de toque ≥40px | Full-width abaixo de `sm` em formulários de 1 coluna |
| **Input** | Text, com ícone leading/trailing, com botão embutido (ex. mostrar senha) | sm, md, lg (mesma altura do Button correspondente) | default/hover/focus/disabled/readonly/error | Máscara opcional (telefone); debounce em busca | `label` associado via `for`/`id`; erro linkado por `aria-describedby` | Largura 100% do container por padrão |
| **Textarea** | Default, auto-resize | min 3 linhas | igual Input | Contador de caracteres opcional (ex. "Motivo do contato") | mesma regra de `label`/erro do Input | Altura mínima preservada em mobile |
| **Select** | Single, com busca (combobox) | sm, md, lg | igual Input + `open` | Fecha em `Esc`/clique fora; navegação por teclado nas opções | `role="listbox"`, `aria-expanded`, roving `aria-activedescendant` | Menu vira sheet inferior em mobile quando >6 opções |
| **Checkbox** | Default, indeterminate | 16px, 20px | default/hover/focus/disabled/checked/indeterminate | Clique no label ativa o input | `aria-checked` reflete indeterminate | — |
| **Radio** | Default (em grupo) | 16px, 20px | igual Checkbox | Navegação por seta dentro do grupo (`role="radiogroup"`) | `aria-checked`, grupo com `fieldset`/`legend` | Empilha vertical em mobile, pode ser inline em desktop |
| **Switch** | Default | 20px altura (toque 40px) | default/hover/focus/disabled/checked | Transição de 150ms; sem duplo estado transitório | `role="switch"`, `aria-checked` | — |

## Feedback

| Componente | Variantes | Tamanhos | Estados | Comportamento | A11y | Responsivo |
|---|---|---|---|---|---|---|
| **Badge** | Neutral, Primary, Success, Warning, Error, Info — usado para status de lead (Novo, Em contato, Aguardando resposta, Agendamento, Cliente) | sm, md | default (estático, sem hover) | Cor é só reforço — texto do status sempre explícito, nunca só cor | Contraste AA mínimo em todas as variantes | — |
| **Alert** | Success, Warning, Error, Info | — | default, com ação, dismissible | Não fecha sozinho quando há ação pendente | `role="alert"` (erro/warning) ou `role="status"` (info/success) | Ícone + texto empilham em telas <360px |
| **Toast** | Success, Warning, Error, Info | — | entering/visible/exiting | Auto-dismiss 5s (erro: manual), pilha máx. 3, pausa no hover | `aria-live="polite"` (`assertive` para erro) | Ancorado no canto inferior; full-width em mobile |
| **Loading** | Spinner, inline, full-section | 16/24/32px | — | Só aparece após 300ms (evita flash em respostas rápidas) | `aria-busy` no container pai | — |
| **Skeleton** | Text line, avatar, card, table row | — | shimmer sutil (respeita `prefers-reduced-motion`) | Reflete a forma real do conteúdo final | `aria-hidden="true"` (conteúdo ainda não tem significado) | Mesma grade do conteúdo real |
| **EmptyState** | Sem leads, sem clientes, sem resultados de busca, erro | — | default, com CTA | Sempre com próxima ação sugerida (nunca só "nada aqui") | Título como heading real, não `<div>` estilizado | Ilustração/ícone opcional em telas ≥`md` |

## Exibição de dados

| Componente | Variantes | Tamanhos | Estados | Comportamento | A11y | Responsivo |
|---|---|---|---|---|---|---|
| **Card** | Default, interactive (clicável), com header/footer | — | default/hover(só se interactive)/focus | Radius `lg`; sombra só em elevação real (modal, dropdown) — cards em grade usam borda, não sombra duplicada | Se interactive, é `<button>`/`<a>`, não `<div onClick>` | 1 coluna mobile → grade `md`+ |
| **Avatar** | Foto, iniciais (fallback), com indicador de status | 24/32/40/56px | loading (skeleton), erro (fallback iniciais) | Fallback determinístico por nome (iniciais + cor consistente) | `alt` com nome da pessoa | — |
| **Table** | Default, com seleção de linha, com ações inline | — | row hover, row selected, sorting ativo | Ordenação por coluna; paginação externa (ver Pagination) | `<thead>`/`<th scope="col">` reais; sort state em `aria-sort` | Vira lista de cards empilhados abaixo de `sm` |
| **Pagination** | Numérica, "carregar mais" | — | default/hover/active(página atual)/disabled(extremos) | Mantém posição de scroll ao trocar página | `aria-current="page"` na atual; `nav` com `aria-label` | Compacta para prev/next + "3 de 12" em mobile |

## Navegação

| Componente | Variantes | Tamanhos | Estados | Comportamento | A11y | Responsivo |
|---|---|---|---|---|---|---|
| **Navbar** | Público (loja), autenticado (plataforma) | altura 64px | default, com scroll (sombra sutil ao rolar) | Sticky no topo | Landmark `<header>`/`nav` com `aria-label` | Menu vira drawer/hambúrguer abaixo de `md` |
| **Sidebar** | Expandida, colapsada (ícones only) | 240px / 72px | item default/hover/active(rota atual) | Estado colapsado persiste (preferência local) | `nav` com `aria-current="page"` no item ativo | Vira drawer sobreposto abaixo de `lg` |
| **Breadcrumb** | Default | — | link hover, item atual (não clicável) | Trunca itens intermediários em telas estreitas (`…`) | `nav aria-label="breadcrumb"`, `aria-current="page"` no último | Some abaixo de `sm`, mantém só botão "voltar" |
| **Tabs** | Line (sublinhado), Pill | md, lg | default/hover/active/focus/disabled | Navegação por seta esquerda/direita quando focado | `role="tablist"`/`tab`/`tabpanel`, `aria-selected` | Scroll horizontal com fade nas bordas se não couber |

## Overlay

| Componente | Variantes | Tamanhos | Estados | Comportamento | A11y | Responsivo |
|---|---|---|---|---|---|---|
| **Modal** | Default, confirmação (destrutiva) | sm/md/lg/full | entering/open/exiting | Foco preso dentro do modal; `Esc` fecha; scroll do body travado | `role="dialog"`, `aria-modal="true"`, foco inicial no primeiro elemento interativo, retorna foco ao trigger ao fechar | Vira sheet de baixo para cima em mobile |
| **Dialog** | Alerta simples (confirmar/cancelar) | sm | igual Modal | Ação destrutiva sempre exige confirmação explícita (nunca 1 clique) | igual Modal | — |
| **Dropdown** | Menu de ações, menu de seleção | — | open/closed, item hover/focus/disabled | Fecha em `Esc`/clique fora/seleção; reabre no mesmo item ao reabrir | `role="menu"`/`menuitem`, navegação por seta | Vira sheet inferior em mobile quando o menu é longo |
| **Tooltip** | Default | — | hidden/visible (delay 400ms entrada, 0ms saída) | Nunca contém a única cópia de uma informação crítica | `role="tooltip"`, disparado também por foco de teclado, não só hover | Desabilitado em touch (sem hover) — usar `title`/texto visível |
| **Calendar** | Mês, com slots de disponibilidade | — | dia default/hoje/selecionado/indisponível/passado | Navegação por mês; slots gerados a partir da agenda do terapeuta | `grid` com `role="grid"`, navegação por seta entre dias | Semana única com scroll horizontal abaixo de `sm` |
| **DatePicker** | Input + Calendar acoplado | md | igual Input + Calendar | Digitação manual valida contra formato `dd/mm/aaaa` | Anuncia mês/ano ao navegar (`aria-live`) | Calendar abre como sheet inferior em mobile |

---

## Notas de implementação

- **Nunca reimplementar o que a lib headless já resolve** (foco, `Esc`, clique
  fora, roving tabindex) — Reka UI / shadcn primitives já cobrem isso; os
  tokens acima só trocam a pele visual.
- Todo estado de erro em formulário público (formulário de solicitação de
  atendimento) precisa de mensagem de erro em texto, nunca só borda vermelha —
  ver `--color-error` no briefing de acessibilidade/segurança (validação de
  entrada, LGPD).
- `Badge` de status de lead é o único componente com paleta fixa por valor
  (Novo → Info, Em contato → Warning, Aguardando resposta → Secondary,
  Agendamento → Primary, Cliente → Success) — manter essa correspondência em
  toda a plataforma para não sobrecarregar o usuário com um novo código de
  cores por tela.
