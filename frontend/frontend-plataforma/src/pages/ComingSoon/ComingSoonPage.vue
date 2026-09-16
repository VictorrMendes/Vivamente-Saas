<script setup lang="ts">
import type { LucideIcon } from '@lucide/vue';

defineProps<{ title: string; description: string; icon: LucideIcon }>();
</script>

<template>
  <div class="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface px-6 py-24 text-center">
    <div class="flex h-14 w-14 items-center justify-center rounded-pill bg-primary-50 text-primary-700">
      <component :is="icon" :size="26" aria-hidden="true" />
    </div>
    <h1 class="mt-4 font-display text-h4 text-text">{{ title }}</h1>
    <p class="mt-2 max-w-md text-body-sm text-text-muted">{{ description }}</p>
    <p class="mt-4 text-caption uppercase tracking-label text-text-muted">
      Aguardando disponibilização pelo Back
    </p>
  </div>
</template>
