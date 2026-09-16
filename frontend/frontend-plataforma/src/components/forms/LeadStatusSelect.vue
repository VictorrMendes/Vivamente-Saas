<script setup lang="ts">
import { LEAD_STATUS_LABEL, LEAD_STATUS_ORDER } from '@/constants/leadStatus';
import type { LeadStatus } from '@/types/lead';

defineProps<{ modelValue: LeadStatus; disabled?: boolean }>();
defineEmits<{ 'update:modelValue': [value: LeadStatus] }>();
</script>

<template>
  <select
    :value="modelValue"
    :disabled="disabled"
    class="h-10 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
    @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value as LeadStatus)"
  >
    <option v-for="status in LEAD_STATUS_ORDER" :key="status" :value="status">
      {{ LEAD_STATUS_LABEL[status] }}
    </option>
  </select>
</template>
