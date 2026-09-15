<script setup lang="ts">
import type { LucideIcon } from '@lucide/vue';

defineProps<{
  label: string;
  value: string | number;
  icon: LucideIcon;
  /** Quando presente, o card vira um link — métricas devem levar a telas reais. */
  to?: string;
}>();
</script>

<template>
  <component
    :is="to ? 'RouterLink' : 'div'"
    :to="to"
    class="block rounded-lg border border-border bg-surface p-4"
    :class="to ? 'transition-colors hover:border-border-strong' : ''"
  >
    <div class="flex items-center gap-3">
      <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-700">
        <component :is="icon" :size="18" aria-hidden="true" />
      </div>
      <div class="min-w-0">
        <p class="truncate text-label uppercase tracking-label text-text-muted">{{ label }}</p>
        <p class="font-display text-h4 text-text">{{ value }}</p>
      </div>
    </div>
  </component>
</template>
