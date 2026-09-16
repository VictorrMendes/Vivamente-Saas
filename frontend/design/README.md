# @vivamente/design — Cadência

Sistema de design compartilhado da VivaMente Terapias: tokens, preset
Tailwind e especificação de componentes. Módulo externo consumido tanto por
`frontend-loja` (Next.js) quanto por `frontend-plataforma` (Vue) — a
identidade visual vive em um lugar só.

- [`tokens.css`](./tokens.css) — cor, tipografia, espaçamento, raio, sombra,
  claro/escuro. Fonte única de verdade.
- [`tailwind-preset.js`](./tailwind-preset.js) — mapeia o Tailwind dos tokens
  acima (`bg-primary-600`, `rounded-lg`, `font-display`, etc.).
- [`components.md`](./components.md) — variantes, tamanhos, estados,
  comportamento, acessibilidade e responsividade de cada componente.
- [`preview.html`](./preview.html) — prévia visual estática, abrir direto no
  navegador (sem build).

Este pacote **não** inclui o Tailwind CSS em si (peer dependency de cada app)
nem implementações de componente — cada app renderiza sua própria UI (React
no Next.js, SFC no Vue) seguindo `components.md`, porque componentes React e
Vue não são compartilháveis como código, só a especificação e os tokens são.

## Como consumir

Os dois apps ainda não foram inicializados. Quando forem (`npm create
next-app` em `frontend-loja`, scaffold Vue em `frontend-plataforma`), aponte
para este pacote por caminho relativo — sem precisar de workspace/monorepo:

```jsonc
// frontend-loja/package.json ou frontend-plataforma/package.json
{
  "dependencies": {
    "@vivamente/design": "file:../design"
  }
}
```

**1. Tokens** — importar `tokens.css` uma vez, no ponto de entrada global do
app (`app/globals.css` no Next.js, `main.ts`/`App.vue` no Vue):

```css
@import "@vivamente/design/tokens.css";
```

**2. Preset Tailwind** — cada app mantém seu próprio `content` (globs mudam
por projeto); só o `theme` vem do preset:

```js
// tailwind.config.js do app
module.exports = {
  presets: [require("@vivamente/design/tailwind-preset")],
  content: ["./src/**/*.{js,ts,jsx,tsx,vue}"],
};
```

**3. Fontes** — Newsreader e Public Sans via Google Fonts (`next/font` no
Next.js, `<link>` no `index.html` do Vue); não estão embutidas neste pacote
para não duplicar o carregamento entre os dois apps.

## Alterar um token

Editar `tokens.css` (ou `tailwind-preset.js` para novos utilitários) neste
pacote — os dois apps refletem a mudança na próxima instalação/build, sem
precisar tocar em código de UI.
