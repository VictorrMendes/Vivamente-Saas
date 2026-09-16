<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { ApiError } from '@/services/api/errors';
import { safeLoginRedirect } from '@/router/redirect';
import Button from '@/components/ui/Button.vue';
import type { UserRole } from '@/types/auth';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const form = reactive({ email: '', password: '' });
const loading = ref(false);
const error = ref<string | null>(null);

// Import dinâmico atrás de `if (import.meta.env.DEV)` — o Vite elimina o
// módulo inteiro (e as senhas de teste) do bundle de produção. Carregado uma
// vez no mount (não no submit) pra não atrasar o login normal esperando essa
// promise: se ainda não resolveu quando o usuário envia o form, o atalho
// simplesmente não se aplica e cai direto no login de verdade.
const devAccounts = ref<Record<string, { password: string; role: UserRole }> | null>(null);
const devHint = ref<string[] | null>(null);
onMounted(() => {
  if (import.meta.env.DEV) {
    import('@/dev/devAccounts').then(({ DEV_ACCOUNTS }) => {
      devAccounts.value = DEV_ACCOUNTS;
      devHint.value = Object.entries(DEV_ACCOUNTS).map(
        ([email, { password, role }]) => `${email} / ${password} — ${role}`,
      );
    });
  }
});

function goToRedirect() {
  return router.replace(safeLoginRedirect(route.query.redirect));
}

async function handleSubmit() {
  if (loading.value) return;
  error.value = null;
  loading.value = true;
  try {
    const devAccount = devAccounts.value?.[form.email];
    if (devAccount && devAccount.password === form.password) {
      auth.mockLogin(devAccount.role);
      await goToRedirect();
      return;
    }
    await auth.login(form.email, form.password);
    await goToRedirect();
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Não foi possível entrar. Tente novamente.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-light flex min-h-screen bg-surface">
    <div class="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-primary-900 px-12 py-12 lg:flex">
      <div class="absolute -left-20 -top-20 h-72 w-72 rounded-pill bg-primary-700 blur-3xl" aria-hidden="true" />
      <div class="absolute bottom-16 right-0 h-56 w-56 translate-x-1/3 rounded-pill bg-secondary-600 blur-3xl" aria-hidden="true" />

      <div class="relative z-10">
        <p class="text-label uppercase tracking-label text-primary-300">Gestão de terapia</p>
        <p class="mt-1 font-display text-h6 tracking-tight text-text-inverse">VivaMente</p>
      </div>

      <blockquote class="relative z-10 font-display text-h3 italic leading-snug text-text-inverse">
        “Presença, cuidado e organização para a sua prática clínica.”
      </blockquote>
    </div>

    <div class="flex flex-1 flex-col items-center justify-center bg-background px-4 py-12 sm:px-8">
      <div class="mb-8 text-center lg:hidden">
        <p class="text-label uppercase tracking-label text-text-muted">Gestão de terapia</p>
        <p class="mt-1 font-display text-h6 text-primary-700">VivaMente</p>
      </div>

      <div class="w-full max-w-sm rounded-lg border border-border bg-surface p-8 shadow-sm">
      <p class="text-label uppercase tracking-label text-primary-600">Bem-vindo de volta</p>
      <h1 class="mt-1 mb-1 font-display text-h4 text-text">Entrar na Plataforma</h1>
      <p class="mb-6 text-body-sm text-text-muted">Entre com sua conta VivaMente.</p>

      <form class="space-y-4" :aria-busy="loading" @submit.prevent="handleSubmit">
        <div>
          <label for="email" class="mb-1 block text-label uppercase tracking-label text-text-muted">E-mail</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            autocomplete="username"
            required
            :aria-describedby="error ? 'login-error' : undefined"
            class="h-10 w-full rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
          />
        </div>
        <div>
          <label for="password" class="mb-1 block text-label uppercase tracking-label text-text-muted">Senha</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            autocomplete="current-password"
            required
            :aria-describedby="error ? 'login-error' : undefined"
            class="h-10 w-full rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
          />
        </div>

        <p v-if="error" id="login-error" role="alert" class="rounded-md bg-error-bg px-3 py-2 text-body-sm text-error">
          {{ error }}
        </p>

        <Button type="submit" :loading="loading" class="w-full">
          {{ loading ? 'Entrando…' : 'Entrar' }}
        </Button>
      </form>

      <div v-if="devHint" class="mt-6 rounded-md bg-surface-sunken p-3 text-caption text-text-muted">
        <p class="mb-1 font-medium text-text">Contas de teste (dev, sem backend):</p>
        <p v-for="line in devHint" :key="line">{{ line }}</p>
      </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * A página de login tem identidade fixa (painel escuro de marca + painel
 * claro de formulário) que não deve trocar com o tema do sistema — em dark
 * mode, --color-primary-700/--color-secondary-600 viram tons claros e
 * --color-background/--color-surface escurecem, colapsando o contraste entre
 * os dois painéis e deixando os inputs ilegíveis. Fixamos aqui os mesmos
 * tokens no valor de tema claro (copiados de tokens.css) pra esta página
 * sempre renderizar como desenhada, sem inventar cor fora dos tokens.
 */
.login-light {
  --color-primary-300: #74a599;
  --color-primary-600: #1f5548;
  --color-primary-700: #17423a;
  --color-secondary-600: #a16f2a;
  --color-background: #f1f3f1;
  --color-surface: #ffffff;
  --color-surface-sunken: #e9ece9;
  --color-border: #dce1dd;
  --color-text: #16211d;
  --color-text-muted: #5b6b63;
  --color-text-inverse: #f3f6f4;
  --color-error: #b23a3a;
  --color-error-bg: #fbeaea;
  --focus-ring: 0 0 0 3px rgba(31, 85, 72, 0.35);
}
</style>
