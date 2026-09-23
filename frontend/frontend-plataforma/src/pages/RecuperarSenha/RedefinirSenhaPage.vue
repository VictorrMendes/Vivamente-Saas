<script setup lang="ts">
import { LIMITS } from '@/lib/fieldLimits';
import { computed, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { confirmPasswordReset } from '@/services/api/oauth';
import { ApiError } from '@/services/api/errors';
import Button from '@/components/ui/Button.vue';

const route = useRoute();
// Link gerado pelo Firebase (generate_password_reset_link) vem com
// ?mode=resetPassword&oobCode=...&apiKey=... — o Back chama esse código de
// "token" (PasswordResetSerializer), não de oobCode.
const token = computed(() => {
  const raw = route.query.oobCode;
  return typeof raw === 'string' ? raw : '';
});

const newPassword = ref('');
const loading = ref(false);
const error = ref<string | null>(null);
const done = ref(false);

async function handleSubmit() {
  if (loading.value) return;
  error.value = null;
  if (newPassword.value.length < 6) {
    error.value = 'A senha precisa ter pelo menos 6 caracteres.';
    return;
  }
  loading.value = true;
  try {
    await confirmPasswordReset({ token: token.value, newPassword: newPassword.value });
    done.value = true;
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Não foi possível redefinir a senha agora. Tente novamente.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-light flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-8">
    <div class="w-full max-w-sm rounded-lg border border-border bg-surface p-8 shadow-sm">
      <p class="text-label uppercase tracking-label text-primary-600">Recuperar acesso</p>
      <h1 class="mt-1 mb-1 font-display text-h4 text-text">Redefinir senha</h1>

      <template v-if="done">
        <p class="mt-4 text-body-sm text-text-muted">Senha redefinida. Você já pode entrar com a nova senha.</p>
        <RouterLink to="/login" class="mt-6 inline-block text-body-sm text-primary-600 underline">Ir para o login</RouterLink>
      </template>
      <template v-else-if="!token">
        <p class="mt-4 rounded-md bg-error-bg px-3 py-2 text-body-sm text-error">
          Este link de redefinição é inválido. Peça um novo link.
        </p>
        <RouterLink to="/esqueci-senha" class="mt-6 inline-block text-body-sm text-primary-600 underline">Pedir novo link</RouterLink>
      </template>
      <template v-else>
        <p class="mb-6 text-body-sm text-text-muted">Escolha uma nova senha para sua conta.</p>

        <form class="space-y-4" :aria-busy="loading" @submit.prevent="handleSubmit">
          <div>
            <label for="reset-password" class="mb-1 block text-label uppercase tracking-label text-text-muted">Nova senha</label>
            <input
              :maxlength="LIMITS.password"
              id="reset-password"
              v-model="newPassword"
              type="password"
              autocomplete="new-password"
              required
              minlength="6"
              :aria-describedby="error ? 'reset-error' : undefined"
              class="h-10 w-full rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
            />
          </div>

          <p v-if="error" id="reset-error" role="alert" class="rounded-md bg-error-bg px-3 py-2 text-body-sm text-error">
            {{ error }}
          </p>

          <Button type="submit" :loading="loading" class="w-full">
            {{ loading ? 'Salvando…' : 'Redefinir senha' }}
          </Button>
        </form>
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
