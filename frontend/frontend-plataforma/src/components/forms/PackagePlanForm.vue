<script setup lang="ts">
import { LIMITS } from '@/lib/fieldLimits';
import { computed, reactive, ref, useId } from 'vue';
import type { NewPackagePlan, PackagePlan } from '@/types/package';
import type { Service } from '@/types/service';
import { formatCurrency } from '@/lib/currency';
import Button from '@/components/ui/Button.vue';

// Formulário do catálogo: um pacote é só um modelo (serviço, sessões, valor,
// validade) — sem cliente. Usado na página Pacotes e no modal do cliente.
const props = defineProps<{ services: Service[]; saving: boolean; submitLabel?: string; initial?: PackagePlan }>();
const emit = defineEmits<{ submit: [plan: NewPackagePlan]; cancel: [] }>();

const uid = useId();
const fieldId = (name: string) => `${uid}-${name}`;
const form = reactive({
  name: props.initial?.name ?? '',
  service: (props.initial?.service ?? '') as number | '',
  totalSessions: props.initial?.totalSessions ?? 4,
  totalValue: props.initial?.totalValue ?? 0,
  validityDays: (props.initial?.validityDays ?? '') as number | '',
  description: props.initial?.description ?? '',
});
const error = ref<string | null>(null);

const perSession = computed(() => (form.totalSessions > 0 ? form.totalValue / form.totalSessions : 0));

function handleSubmit() {
  error.value = null;
  if (!form.name.trim()) { error.value = 'Informe o nome do pacote.'; return; }
  if (!Number.isInteger(form.totalSessions) || form.totalSessions < 1) { error.value = 'O total de sessões deve ser pelo menos 1.'; return; }
  if (!(form.totalValue >= 0)) { error.value = 'O valor total não pode ser negativo.'; return; }
  if (form.validityDays !== '' && !(Number.isInteger(form.validityDays) && form.validityDays > 0)) {
    error.value = 'A validade deve ser um número de dias maior que zero.';
    return;
  }
  emit('submit', {
    name: form.name.trim(),
    service: form.service || null,
    totalSessions: form.totalSessions,
    totalValue: Number(form.totalValue),
    validityDays: form.validityDays === '' ? null : form.validityDays,
    description: form.description.trim(),
  });
}

const inputClass = 'h-10 w-full rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600';
const labelClass = 'mb-1 block text-label uppercase tracking-label text-text-muted';
</script>

<template>
  <form class="grid gap-3 sm:grid-cols-6" novalidate @submit.prevent="handleSubmit">
    <div class="sm:col-span-3">
      <label :for="fieldId('name')" :class="labelClass">Nome do pacote</label>
      <input :id="fieldId('name')" v-model="form.name" type="text" required maxlength="200" placeholder="Ex.: Pacote mensal 4 sessões" :class="inputClass" />
    </div>
    <div class="sm:col-span-3">
      <label :for="fieldId('service')" :class="labelClass">Serviço</label>
      <select :id="fieldId('service')" v-model="form.service" :class="inputClass">
        <option value="">Nenhum</option>
        <option v-for="s in services" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
    </div>
    <div class="sm:col-span-2">
      <label :for="fieldId('sessions')" :class="labelClass">Sessões</label>
      <input :id="fieldId('sessions')" v-model.number="form.totalSessions" type="number" min="1" required :class="inputClass" />
    </div>
    <div class="sm:col-span-2">
      <label :for="fieldId('value')" :class="labelClass">Valor total (R$)</label>
      <input :id="fieldId('value')" v-model.number="form.totalValue" type="number" min="0" step="0.01" required :class="inputClass" />
    </div>
    <div class="sm:col-span-2">
      <label :for="fieldId('validity')" :class="labelClass">Validade (dias)</label>
      <input :id="fieldId('validity')" v-model.number="form.validityDays" type="number" min="1" placeholder="Sem prazo" :class="inputClass" />
    </div>
    <div class="sm:col-span-6">
      <label :for="fieldId('description')" :class="labelClass">Descrição (opcional)</label>
      <input :maxlength="LIMITS.description" :id="fieldId('description')" v-model="form.description" type="text" :class="inputClass" />
    </div>
    <p v-if="perSession > 0" class="text-body-sm text-text-muted sm:col-span-6">
      Equivale a {{ formatCurrency(perSession) }} por sessão.
    </p>
    <p v-if="error" role="alert" class="text-body-sm text-error sm:col-span-6">{{ error }}</p>
    <div class="flex gap-2 sm:col-span-6">
      <Button type="submit" size="sm" :loading="saving">{{ submitLabel ?? 'Salvar pacote' }}</Button>
      <Button type="button" size="sm" variant="ghost" @click="emit('cancel')">Cancelar</Button>
    </div>
  </form>
</template>
