<script setup lang="ts">
import { computed } from 'vue';

// Contador "n/máx" para campos longos: o maxlength do navegador corta em
// silêncio (principalmente ao colar), o contador mostra quanto falta.
const props = defineProps<{ value: string; max: number }>();
const near = computed(() => props.value.length >= props.max * 0.9);
</script>

<template>
  <p class="mt-1 text-right text-caption" :class="near ? 'text-warning' : 'text-text-muted'" :aria-live="near ? 'polite' : 'off'">
    {{ value.length }}/{{ max }}
  </p>
</template>
