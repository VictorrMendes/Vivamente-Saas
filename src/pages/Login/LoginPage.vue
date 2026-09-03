<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { ApiError } from '@/services/api/errors';
import Button from '@/components/ui/Button.vue';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const form = reactive({ email: '', password: '' });
const loading = ref(false);
const error = ref<string | null>(null);

async function handleSubmit() {
  error.value = null;
  loading.value = true;
  try {
    await auth.login(form.email, form.password);
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard';
    router.push(redirect);
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

      <form class="space-y-4" novalidate @submit.prevent="handleSubmit">
        <div>
          <label for="email" class="mb-1 block text-label uppercase tracking-label text-text-muted">E-mail</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            autocomplete="username"
            required
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
            class="h-10 w-full rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
          />
        </div>

        <p v-if="error" role="alert" class="rounded-md bg-error-bg px-3 py-2 text-body-sm text-error">
          {{ error }}
        </p>

        <Button type="submit" :loading="loading" class="w-full">
          {{ loading ? 'Entrando…' : 'Entrar' }}
        </Button>
      </form>
    </div>
  </div>
</template>
