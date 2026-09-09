<script setup lang="ts">
import { computed } from 'vue';
import { LogOut } from '@lucide/vue';
import { useAuthStore } from '@/stores/auth';

const emit = defineEmits<{ logout: [] }>();

const auth = useAuthStore();

const roleLabel = computed(() => (auth.role === 'ADMIN' ? 'Administrador' : auth.role === 'THERAPIST' ? 'Terapeuta' : ''));

const initials = computed(() => {
  const email = auth.user?.email ?? '';
  return email.slice(0, 2).toUpperCase() || '?';
});
</script>

<template>
  <div class="border-t border-primary-800 p-3">
    <div class="flex items-center gap-3 rounded-lg bg-primary-800 p-3">
      <div
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-primary-700 font-display text-body font-medium text-text-inverse"
        aria-hidden="true"
      >
        {{ initials }}
      </div>
      <div class="min-w-0 flex-1">
        <p class="truncate text-body-sm font-medium text-text-inverse">{{ auth.user?.email }}</p>
        <p class="truncate text-caption text-primary-300">{{ roleLabel }}</p>
      </div>
    </div>

    <button
      type="button"
      class="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-body-sm text-primary-200 transition-colors hover:bg-primary-800 hover:text-text-inverse"
      @click="emit('logout')"
    >
      <LogOut :size="18" aria-hidden="true" />
      Sair
    </button>
  </div>
</template>
