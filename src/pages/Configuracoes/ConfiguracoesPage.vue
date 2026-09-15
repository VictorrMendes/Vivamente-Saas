<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Settings } from '@lucide/vue';
import { useMe } from '@/composables/useMe';
import { useTheme } from '@/composables/useTheme';
import { useAuthStore } from '@/stores/auth';
import type { ThemePreference } from '@/composables/useTheme';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import ModuleBanner from '@/components/layout/ModuleBanner.vue';

const router = useRouter();
const auth = useAuthStore();
const { me, loading, error, saving, saveError, saved, revoking, revokeError, load, updateEmail, revokeAllSessions } = useMe();
const { theme, setTheme } = useTheme();

const THEME_LABEL: Record<ThemePreference, string> = { system: 'Automático (sistema)', light: 'Claro', dark: 'Escuro' };

const editingEmail = ref(false);
const emailForm = reactive({ email: '' });
const emailFormError = ref<string | null>(null);

function startEditEmail() {
  if (!me.value) return;
  emailForm.email = me.value.email;
  emailFormError.value = null;
  editingEmail.value = true;
}

async function handleSaveEmail() {
  emailFormError.value = null;
  if (!emailForm.email.trim() || !emailForm.email.includes('@')) {
    emailFormError.value = 'Informe um e-mail válido.';
    return;
  }
  const ok = await updateEmail(emailForm.email.trim());
  if (ok) editingEmail.value = false;
}

const revokeConfirmOpen = ref(false);
async function handleRevokeConfirmed() {
  revokeConfirmOpen.value = false;
  const ok = await revokeAllSessions();
  if (ok) {
    await auth.logout();
    router.push({ name: 'login' });
  }
}

onMounted(load);
</script>

<template>
  <div>
    <ModuleBanner :icon="Settings" title="Configurações" subtitle="Perfil, segurança e preferências da sua conta." />

    <p v-if="error" role="alert" class="mt-4 rounded-md bg-error-bg px-4 py-3 text-body-sm text-error">{{ error }}</p>

    <div v-else-if="loading" class="mt-6 space-y-4">
      <Skeleton variant="card" />
      <Skeleton variant="card" />
    </div>

    <template v-else-if="me">
      <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div class="rounded-lg border border-border bg-surface p-4">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="font-display text-h6 text-text">Perfil</h2>
            <button v-if="!editingEmail" type="button" class="text-body-sm text-primary-700 hover:underline" @click="startEditEmail">
              Editar e-mail
            </button>
          </div>

          <form v-if="editingEmail" class="space-y-3" novalidate @submit.prevent="handleSaveEmail">
            <div>
              <label for="settings-email" class="mb-1 block text-label uppercase tracking-label text-text-muted">E-mail</label>
              <input
                id="settings-email"
                v-model="emailForm.email"
                type="email"
                required
                class="h-10 w-full rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
              />
            </div>
            <p v-if="emailFormError || saveError" role="alert" class="text-body-sm text-error">{{ emailFormError || saveError }}</p>
            <div class="flex gap-2">
              <Button type="submit" size="sm" :loading="saving">Salvar</Button>
              <Button type="button" size="sm" variant="ghost" @click="editingEmail = false">Cancelar</Button>
            </div>
          </form>
          <dl v-else class="space-y-2 text-body-sm">
            <div class="flex justify-between gap-4">
              <dt class="text-text-muted">E-mail</dt>
              <dd class="text-text">{{ me.email }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-text-muted">Papel</dt>
              <dd class="text-text">{{ me.role === 'ADMIN' ? 'Administrador' : 'Terapeuta' }}</dd>
            </div>
            <div class="flex items-center justify-between gap-4">
              <dt class="text-text-muted">Situação</dt>
              <dd><Badge :variant="me.active ? 'success' : 'neutral'" size="sm">{{ me.active ? 'Ativa' : 'Inativa' }}</Badge></dd>
            </div>
          </dl>
          <p v-if="saved && !editingEmail" role="status" class="mt-2 text-body-sm text-success">E-mail atualizado.</p>
        </div>

        <div class="rounded-lg border border-border bg-surface p-4">
          <h2 class="mb-3 font-display text-h6 text-text">Preferências</h2>
          <label for="settings-theme" class="mb-1 block text-label uppercase tracking-label text-text-muted">Tema</label>
          <select
            id="settings-theme"
            :value="theme"
            class="h-10 w-full max-w-xs rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
            @change="setTheme(($event.target as HTMLSelectElement).value as ThemePreference)"
          >
            <option v-for="(label, value) in THEME_LABEL" :key="value" :value="value">{{ label }}</option>
          </select>
          <p class="mt-2 text-caption text-text-muted">
            Só afeta este navegador — o Back não guarda preferências de conta ainda.
          </p>
        </div>
      </div>

      <div class="mt-6 rounded-lg border border-border bg-surface p-4">
        <h2 class="mb-1 font-display text-h6 text-text">Segurança</h2>
        <p class="mb-3 text-body-sm text-text-muted">
          Encerra sua sessão neste e em qualquer outro dispositivo conectado com esta conta.
        </p>
        <Button variant="destructive" size="sm" :loading="revoking" @click="revokeConfirmOpen = true">
          Encerrar todas as sessões
        </Button>
        <p v-if="revokeError" role="alert" class="mt-2 text-body-sm text-error">{{ revokeError }}</p>
      </div>
    </template>

    <ConfirmDialog
      :open="revokeConfirmOpen"
      title="Encerrar todas as sessões"
      description="Você será desconectado deste e de todos os outros dispositivos. Será preciso entrar novamente."
      confirm-label="Encerrar sessões"
      @update:open="(v) => { revokeConfirmOpen = v; }"
      @confirm="handleRevokeConfirmed"
    />
  </div>
</template>
