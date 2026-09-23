<script setup lang="ts">
import { onMounted } from 'vue';
import { Settings } from '@lucide/vue';
import { useMe } from '@/composables/useMe';
import { useTheme } from '@/composables/useTheme';
import type { ThemePreference } from '@/composables/useTheme';
import Badge from '@/components/ui/Badge.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import ModuleBanner from '@/components/layout/ModuleBanner.vue';

const { me, loading, error, load } = useMe();
const { theme, setTheme } = useTheme();

const THEME_LABEL: Record<ThemePreference, string> = { system: 'Automático (sistema)', light: 'Claro', dark: 'Escuro' };

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
          </div>

          <dl class="space-y-2 text-body-sm">
            <div class="flex justify-between gap-4">
              <dt class="text-text-muted">E-mail de acesso</dt>
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
          <p class="mt-3 text-caption text-text-muted">A alteração do e-mail de acesso ainda não está disponível nesta tela.</p>
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
    </template>
  </div>
</template>
