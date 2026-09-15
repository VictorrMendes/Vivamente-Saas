<script setup lang="ts">
import { computed, reactive, ref, useId } from 'vue';
import type { NewService, Service, ServiceModality } from '@/types/service';
import Button from '@/components/ui/Button.vue';

const MODALITY_LABEL: Record<ServiceModality, string> = {
  ONLINE: 'Online',
  IN_PERSON: 'Presencial',
  BOTH: 'Online ou presencial',
};

const props = defineProps<{ initial?: Service; saving: boolean }>();
const emit = defineEmits<{ submit: [service: NewService]; cancel: [] }>();

const uid = useId();
const fieldId = (name: string) => `${uid}-${name}`;

const form = reactive<NewService>({
  name: props.initial?.name ?? '',
  description: props.initial?.description ?? '',
  durationMinutes: props.initial?.durationMinutes ?? 60,
  price: props.initial?.price ?? 0,
  modality: props.initial?.modality ?? 'ONLINE',
});

const submitted = ref(false);
const validationError = computed(() => {
  if (!form.name.trim()) return 'Informe o nome do serviço.';
  if (!Number.isFinite(form.durationMinutes) || form.durationMinutes < 1) return 'Duração deve ser pelo menos 1 minuto.';
  if (!Number.isFinite(form.price) || form.price < 0) return 'Preço não pode ser negativo.';
  return null;
});
const formError = computed(() => (submitted.value ? validationError.value : null));

function handleSubmit() {
  submitted.value = true;
  if (validationError.value) return;
  emit('submit', { ...form });
}
</script>

<template>
  <form class="space-y-3" novalidate @submit.prevent="handleSubmit">
    <div class="flex flex-wrap items-end gap-3">
      <div>
        <label :for="fieldId('name')" class="mb-1 block text-label uppercase tracking-label text-text-muted">Nome</label>
        <input
          :id="fieldId('name')"
          v-model="form.name"
          type="text"
          required
          class="h-10 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
        />
      </div>
      <div>
        <label :for="fieldId('duration')" class="mb-1 block text-label uppercase tracking-label text-text-muted">Duração (min)</label>
        <input
          :id="fieldId('duration')"
          v-model.number="form.durationMinutes"
          type="number"
          min="1"
          required
          class="h-10 w-28 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
        />
      </div>
      <div>
        <label :for="fieldId('price')" class="mb-1 block text-label uppercase tracking-label text-text-muted">Preço (R$)</label>
        <input
          :id="fieldId('price')"
          v-model.number="form.price"
          type="number"
          min="0"
          step="0.01"
          required
          class="h-10 w-32 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
        />
      </div>
      <div>
        <label :for="fieldId('modality')" class="mb-1 block text-label uppercase tracking-label text-text-muted">Modalidade</label>
        <select
          :id="fieldId('modality')"
          v-model="form.modality"
          class="h-10 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
        >
          <option v-for="(label, value) in MODALITY_LABEL" :key="value" :value="value">{{ label }}</option>
        </select>
      </div>
      <div class="min-w-[200px] flex-1">
        <label :for="fieldId('description')" class="mb-1 block text-label uppercase tracking-label text-text-muted">Descrição</label>
        <input
          :id="fieldId('description')"
          v-model="form.description"
          type="text"
          class="h-10 w-full rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
        />
      </div>
      <Button type="submit" size="md" :loading="saving">Salvar</Button>
      <Button type="button" size="md" variant="ghost" @click="emit('cancel')">Cancelar</Button>
    </div>
    <p v-if="formError" role="alert" class="text-body-sm text-error">{{ formError }}</p>
  </form>
</template>
