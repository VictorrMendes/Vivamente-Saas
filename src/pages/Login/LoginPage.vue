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
  <div class="flex min-h-screen items-center justify-center bg-background px-4">
    <div class="w-full max-w-sm rounded-lg border border-border bg-surface p-8 shadow-sm">
      <h1 class="mb-1 font-display text-h4 text-text">Plataforma</h1>
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
</template>
