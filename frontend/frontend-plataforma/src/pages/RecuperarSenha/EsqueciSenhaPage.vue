<script setup lang="ts">
import { LIMITS } from '@/lib/fieldLimits';
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import { requestPasswordForgot } from '@/services/api/oauth';
import { ApiError } from '@/services/api/errors';
import Button from '@/components/ui/Button.vue';

const email = ref('');
const loading = ref(false);
const error = ref<string | null>(null);
const sent = ref(false);

async function handleSubmit() {
  if (loading.value) return;
  error.value = null;
  loading.value = true;
  try {
    await requestPasswordForgot({ email: email.value });
    // O backend nunca revela se o e-mail existe (anti-enumeração) — a tela
    // sempre mostra a mesma mensagem de sucesso, mesmo pra um e-mail inexistente.
    sent.value = true;
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Não foi possível processar o pedido agora. Tente novamente.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-light flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-8">
    <div class="w-full max-w-sm rounded-lg border border-border bg-surface p-8 shadow-sm">
      <p class="text-label uppercase tracking-label text-primary-600">Recuperar acesso</p>
      <h1 class="mt-1 mb-1 font-display text-h4 text-text">Esqueci minha senha</h1>

      <template v-if="sent">
        <p class="mt-4 text-body-sm text-text-muted">
          Se esse e-mail tiver uma conta na Plataforma, você vai receber um link para redefinir a senha em instantes.
        </p>
        <RouterLink to="/login" class="mt-6 inline-block text-body-sm text-primary-600 underline">Voltar para o login</RouterLink>
      </template>
      <template v-else>
        <p class="mb-6 text-body-sm text-text-muted">Informe seu e-mail e enviaremos um link para redefinir a senha.</p>

        <form class="space-y-4" :aria-busy="loading" @submit.prevent="handleSubmit">
          <div>
            <label for="forgot-email" class="mb-1 block text-label uppercase tracking-label text-text-muted">E-mail</label>
            <input
              :maxlength="LIMITS.email"
              id="forgot-email"
              v-model="email"
              type="email"
              autocomplete="username"
              required
              :aria-describedby="error ? 'forgot-error' : undefined"
              class="h-10 w-full rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
            />
          </div>

          <p v-if="error" id="forgot-error" role="alert" class="rounded-md bg-error-bg px-3 py-2 text-body-sm text-error">
            {{ error }}
          </p>

          <Button type="submit" :loading="loading" class="w-full">
            {{ loading ? 'Enviando…' : 'Enviar link' }}
          </Button>
        </form>

        <RouterLink to="/login" class="mt-6 inline-block text-body-sm text-text-muted underline">Voltar para o login</RouterLink>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* Mesmos tokens fixos de LoginPage.vue — identidade de marca não deve trocar com o tema do sistema. */
.login-light {
  --color-primary-600: #1f5548;
  --color-background: #f1f3f1;
  --color-surface: #ffffff;
  --color-border: #dce1dd;
  --color-text: #16211d;
  --color-text-muted: #5b6b63;
  --color-error: #b23a3a;
  --color-error-bg: #fbeaea;
  --focus-ring: 0 0 0 3px rgba(31, 85, 72, 0.35);
}
</style>
