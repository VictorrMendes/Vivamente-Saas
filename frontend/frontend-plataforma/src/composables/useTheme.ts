import { computed, ref } from 'vue';

/**
 * Preferência de tema — só client-side (não existe endpoint de preferências
 * no Back). O design system já suporta `[data-theme]` além do
 * `prefers-color-scheme` automático (ver tokens.css), então só aplicamos o
 * atributo e persistimos localmente.
 */
export type ThemePreference = 'light' | 'dark' | 'system';
const STORAGE_KEY = 'vivamente:theme';

const theme = ref<ThemePreference>('system');

// Só pra derivar isDark quando theme === 'system' — quem decide a aparência
// de verdade continua sendo o CSS (prefers-color-scheme/[data-theme] em
// tokens.css). Usado por componentes de terceiros (v-calendar) que não leem
// CSS vars e precisam de um boolean explícito pra escolher o skin certo.
const hasMatchMedia = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
const systemPrefersDark = ref(hasMatchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : false);
if (hasMatchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    systemPrefersDark.value = e.matches;
  });
}

const isDark = computed(() => theme.value === 'dark' || (theme.value === 'system' && systemPrefersDark.value));

function applyTheme(value: ThemePreference) {
  if (value === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.dataset.theme = value;
  }
}

/** Chamar uma vez no boot (main.ts), antes do mount, pra evitar flash do tema errado. */
export function initTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') theme.value = stored;
  } catch {
    // localStorage indisponível (modo privado etc.) — mantém o padrão do sistema.
  }
  applyTheme(theme.value);
}

export function useTheme() {
  function setTheme(next: ThemePreference) {
    theme.value = next;
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Preferência só não persiste entre sessões — não impede a troca agora.
    }
  }

  return { theme, isDark, setTheme };
}
