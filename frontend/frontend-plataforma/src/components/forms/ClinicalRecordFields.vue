<script setup lang="ts">
import { computed, useId } from 'vue';
import { clinicalFields, parseClinicalContent } from '@/lib/clinicalContent';
const props = defineProps<{ modelValue: string; disabled?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const content = computed(() => parseClinicalContent(props.modelValue));
const id = useId();
function update(key: string, event: Event) {
  emit('update:modelValue', JSON.stringify({ ...content.value, [key]: (event.target as HTMLTextAreaElement).value }));
}
</script>

<template>
  <div class="grid min-w-0 gap-4 lg:grid-cols-2">
    <div v-for="(field, index) in clinicalFields" :key="field.key" :class="index === 0 ? 'lg:col-span-2' : ''">
      <label :for="`${id}-${field.key}`" class="mb-2 block text-body-sm font-medium text-text">{{ field.label }}</label>
      <textarea :id="`${id}-${field.key}`" :value="content[field.key]" :rows="field.rows" :disabled="disabled"
        :required="index === 0" :maxlength="50000"
        class="w-full rounded-xl border border-border bg-surface px-4 py-3 text-body-sm text-text focus:border-primary-600"
        @input="update(field.key, $event)" />
    </div>
  </div>
</template>
