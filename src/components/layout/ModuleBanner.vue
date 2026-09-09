<script setup lang="ts">
import type { LucideIcon } from '@lucide/vue';

defineProps<{ icon: LucideIcon; title: string; subtitle?: string }>();
</script>

<template>
  <div class="flex items-center justify-between gap-6 rounded-2xl border border-border bg-surface px-6 py-6 lg:px-8">
    <div class="min-w-0">
      <h1 class="font-display text-h3 text-text">{{ title }}</h1>
      <p v-if="subtitle" class="mt-1 max-w-xl text-body-sm text-text-muted">{{ subtitle }}</p>
    </div>
    <div class="hidden h-16 w-16 shrink-0 items-center justify-center rounded-pill bg-primary-50 text-primary-700 sm:flex">
      <component :is="icon" :size="30" aria-hidden="true" />
    </div>
  </div>
</template>
