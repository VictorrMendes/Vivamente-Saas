<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'text' | 'card' }>(), { variant: 'text' });
</script>

<template>
  <div
    aria-hidden="true"
    class="animate-pulse rounded-md bg-surface-sunken motion-reduce:animate-none"
    :class="variant === 'text' ? 'h-4 w-full' : 'h-24 w-full'"
  />
</template>
