<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { X } from '@lucide/vue';
import { useToast } from '@/composables/useToast';

const { toasts, dismiss } = useToast();
const KIND_CLASS = {
  error: 'border-error bg-error-bg text-error',
  success: 'border-success bg-success-bg text-success',
  info: 'border-info bg-info-bg text-info',
} as const;
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6" aria-live="polite">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      :role="toast.kind === 'error' ? 'alert' : 'status'"
      class="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-lg"
      :class="KIND_CLASS[toast.kind]"
    >
      <div class="min-w-0 flex-1 space-y-1">
        <p class="text-body-sm">{{ toast.message }}</p>
        <RouterLink v-if="toast.action" :to="toast.action.to" class="text-body-sm font-medium underline" @click="dismiss(toast.id)">
          {{ toast.action.label }}
        </RouterLink>
      </div>
      <button type="button" class="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100" aria-label="Fechar aviso" @click="dismiss(toast.id)">
        <X :size="16" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>
