<script setup lang="ts">
import type { LucideIcon } from '@lucide/vue';

defineProps<{
  label: string;
  value: string | number;
  icon: LucideIcon;
}>();
</script>

<template>
  <div class="rounded-lg border border-border bg-surface p-4">
    <div class="flex items-center gap-3">
      <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-700">
        <component :is="icon" :size="18" aria-hidden="true" />
      </div>
      <div class="min-w-0">
        <p class="truncate text-label uppercase tracking-label text-text-muted">{{ label }}</p>
        <p class="font-display text-h4 text-text">{{ value }}</p>
      </div>
    </div>
  </div>
</template>
