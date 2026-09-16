/**
 * VivaMente Terapias — preset Tailwind do Cadência.
 *
 * Um preset só estende `theme` e `plugins` — nunca `content`, porque os
 * arquivos a escanear são sempre do app consumidor, não deste pacote.
 * Cada app declara seu próprio `content` e adiciona este preset:
 *
 *   // tailwind.config.js do app (Next.js ou Vue)
 *   module.exports = {
 *     presets: [require("@vivamente/design/tailwind-preset")],
 *     content: ["./src/**\/*.{js,ts,jsx,tsx,vue}"],
 *   };
 *
 * Cor/raio/sombra/tipografia leem CSS vars de tokens.css — trocar tema é
 * trocar tokens.css, não recompilar o Tailwind. Breakpoints usam os padrões
 * do Tailwind (já batem com --bp-* em tokens.css), por isso não são
 * sobrescritos aqui.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: "var(--color-primary-50)",
          100: "var(--color-primary-100)",
          200: "var(--color-primary-200)",
          300: "var(--color-primary-300)",
          400: "var(--color-primary-400)",
          500: "var(--color-primary-500)",
          600: "var(--color-primary-600)",
          700: "var(--color-primary-700)",
          800: "var(--color-primary-800)",
          900: "var(--color-primary-900)",
        },
        secondary: {
          50: "var(--color-secondary-50)",
          100: "var(--color-secondary-100)",
          400: "var(--color-secondary-400)",
          500: "var(--color-secondary-500)",
          600: "var(--color-secondary-600)",
          700: "var(--color-secondary-700)",
        },
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        "surface-sunken": "var(--color-surface-sunken)",
        border: "var(--color-border)",
        "border-strong": "var(--color-border-strong)",
        text: "var(--color-text)",
        "text-muted": "var(--color-text-muted)",
        "text-inverse": "var(--color-text-inverse)",
        success: { DEFAULT: "var(--color-success)", bg: "var(--color-success-bg)" },
        warning: { DEFAULT: "var(--color-warning)", bg: "var(--color-warning-bg)" },
        error: { DEFAULT: "var(--color-error)", bg: "var(--color-error-bg)" },
        info: { DEFAULT: "var(--color-info)", bg: "var(--color-info-bg)" },
      },
      fontFamily: {
        display: ["Newsreader", "Georgia", "serif"],
        body: ["Public Sans", "Segoe UI", "system-ui", "sans-serif"],
      },
      fontSize: {
        h1: ["var(--text-h1)", { lineHeight: "var(--leading-display)", letterSpacing: "var(--tracking-display)" }],
        h2: ["var(--text-h2)", { lineHeight: "var(--leading-display)", letterSpacing: "var(--tracking-display)" }],
        h3: ["var(--text-h3)", { lineHeight: "var(--leading-heading)", letterSpacing: "var(--tracking-display)" }],
        h4: ["var(--text-h4)", { lineHeight: "var(--leading-heading)" }],
        h5: ["var(--text-h5)", { lineHeight: "var(--leading-heading)" }],
        h6: ["var(--text-h6)", { lineHeight: "var(--leading-heading)" }],
        body: ["var(--text-body)", { lineHeight: "var(--leading-body)" }],
        "body-sm": ["var(--text-body-sm)", { lineHeight: "var(--leading-body)" }],
        caption: ["var(--text-caption)", { lineHeight: "var(--leading-caption)" }],
        label: ["var(--text-label)", { letterSpacing: "var(--tracking-label)" }],
        button: ["var(--text-button)", { lineHeight: "1" }],
      },
      spacing: {
        1: "var(--space-1)",
        2: "var(--space-2)",
        3: "var(--space-3)",
        4: "var(--space-4)",
        6: "var(--space-6)",
        8: "var(--space-8)",
        12: "var(--space-12)",
        16: "var(--space-16)",
        24: "var(--space-24)",
        32: "var(--space-32)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        focus: "var(--focus-ring)",
      },
    },
  },
  plugins: [],
};
