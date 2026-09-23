<script setup lang="ts">
import { LIMITS } from '@/lib/fieldLimits';
import FieldCount from '@/components/ui/FieldCount.vue';
import { computed, reactive, ref, useId, watch } from 'vue';
import type { Appointment, AppointmentModality, AppointmentRecurrence, NewAppointment } from '@/types/appointment';
import type { Client } from '@/types/client';
import type { Service } from '@/types/service';
import type { Package } from '@/types/package';
import type { Professional } from '@/types/professional';
import type { UserRole } from '@/types/auth';
import { APPOINTMENT_MODALITY_LABEL } from '@/constants/appointmentModality';
import { toDateOnly } from '@/lib/datetime';
import Button from '@/components/ui/Button.vue';

const props = defineProps<{
  initial?: Appointment;
  /** Pré-preenche cliente/pacote numa consulta nova (ex.: link "Nova consulta" a partir de um pacote). */
  presetClient?: number;
  presetPackage?: number;
  role: UserRole | null;
  clients: Client[];
  services: Service[];
  packages: Package[];
  /** Só usado quando role === 'ADMIN' — o Back exige professional explícito nesse caso. */
  professionals?: Professional[];
  saving: boolean;
}>();
const emit = defineEmits<{ submit: [appt: NewAppointment]; cancel: [] }>();

// Prefixo único por instância — o formulário pode aparecer mais de uma vez na mesma página
// (criação + edição simultânea na Agenda), então ids fixos colidiriam.
const uid = useId();
const fieldId = (name: string) => `${uid}-${name}`;

function toTimeOnly(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

const now = new Date();
const form = reactive({
  client: props.initial?.client ?? props.presetClient ?? ('' as number | ''),
  service: props.initial?.service ?? ('' as number | ''),
  package: props.initial?.package ?? props.presetPackage ?? ('' as number | ''),
  professional: '' as number | '',
  date: props.initial ? toDateOnly(new Date(props.initial.startsAt)) : toDateOnly(now),
  startTime: props.initial ? toTimeOnly(new Date(props.initial.startsAt)) : '09:00',
  endTime: props.initial ? toTimeOnly(new Date(props.initial.endsAt)) : '10:00',
  modality: props.initial?.modality ?? ('ONLINE' as AppointmentModality),
  callLink: props.initial?.callLink ?? '',
  price: props.initial?.price ?? 0,
  notes: props.initial?.notes ?? '',
  recurrence: '' as AppointmentRecurrence | '',
  occurrences: 4,
});

const RECURRENCE_LABEL: Record<AppointmentRecurrence, string> = {
  WEEKLY: 'Toda semana',
  BIWEEKLY: 'A cada 2 semanas (quinzenal)',
  MONTHLY: 'Todo mês',
};


// Pacote só faz sentido pro cliente selecionado — reduz erro de "pacote não pertence a este cliente" (validado no Back).
const clientPackages = computed(() => props.packages.filter((p) => p.client === form.client));

// Trocar o cliente invalida o pacote selecionado — nunca manda um pacote que não é mais elegível.
// Em consulta nova, o terapeuta só escolhe o cliente: o pacote ativo dele traz o serviço e o
// valor por sessão (total ÷ sessões); sem pacote, serviço e valor voltam ao vazio.
const autofilledFrom = ref<Package | null>(null);

function usablePackage(clientId: number | '') {
  return props.packages.find(
    (p) => p.client === clientId && p.status === 'ACTIVE' && p.remainingSessions > 0
      && !(p.expirationDate && p.expirationDate < toDateOnly(new Date())),
  );
}

function applyPackage(pkg: Package | undefined) {
  form.package = pkg?.id ?? '';
  form.service = pkg?.service ?? '';
  form.price = pkg && pkg.totalSessions > 0 ? Math.round((pkg.totalValue / pkg.totalSessions) * 100) / 100 : 0;
  autofilledFrom.value = pkg ?? null;
}

watch(
  () => form.client,
  () => {
    if (form.package && !clientPackages.value.some((p) => p.id === form.package)) {
      form.package = '';
    }
    if (!props.initial) applyPackage(usablePackage(form.client));
  },
);

// Escolher outro pacote na mão refaz o preenchimento; escolher só o serviço (sem pacote) puxa o preço dele.
watch(
  () => form.package,
  (id) => {
    if (props.initial) return;
    const pkg = props.packages.find((p) => p.id === id);
    if (pkg && autofilledFrom.value?.id !== pkg.id) applyPackage(pkg);
  },
);
watch(
  () => form.service,
  (id) => {
    if (props.initial || form.package) return;
    const service = props.services.find((s) => s.id === id);
    if (service) form.price = service.price;
  },
);

// Cliente/pacote vindos por link (ou pacotes que chegam depois do formulário abrir).
watch(
  () => props.packages,
  () => {
    if (props.initial || !form.client) return;
    applyPackage(props.packages.find((p) => p.id === form.package) ?? usablePackage(form.client));
  },
  { immediate: true },
);

const recurrenceMax = computed(() => {
  const pkg = props.packages.find((p) => p.id === form.package);
  return Math.min(52, pkg ? pkg.remainingSessions : 52);
});

// Link da chamada só se aplica a ONLINE/HYBRID — some ao trocar a modalidade,
// senão um valor digitado antes ficaria escondido mas ainda seria enviado.
watch(
  () => form.modality,
  (modality) => {
    if (modality !== 'ONLINE' && modality !== 'HYBRID') form.callLink = '';
  },
);

const showProfessionalField = computed(() => !props.initial && props.role === 'ADMIN');

const todayDateOnly = toDateOnly(now);
const submitted = ref(false);
const validationError = computed(() => {
  if (!form.client) return 'Selecione um cliente.';
  if (showProfessionalField.value && !form.professional) return 'Selecione o profissional.';
  if (!form.date) return 'Informe a data da consulta.';
  if (!form.startTime || !form.endTime) return 'Informe o horário de início e fim.';
  if (form.endTime <= form.startTime) return 'O horário final precisa ser depois do inicial.';
  if (!props.initial && form.date < todayDateOnly) return 'A data não pode estar no passado.';
  if (form.price < 0) return 'O valor não pode ser negativo.';
  if (form.recurrence && (!Number.isInteger(form.occurrences) || form.occurrences < 2 || form.occurrences > recurrenceMax.value)) {
    return `O total de consultas deve ficar entre 2 e ${recurrenceMax.value}.`;
  }
  if (form.callLink && !/^https?:\/\//i.test(form.callLink)) return 'O link da chamada precisa começar com http:// ou https://.';
  return null;
});

const formError = computed(() => (submitted.value ? validationError.value : null));

function handleSubmit() {
  submitted.value = true;
  if (validationError.value) return;

  const payload: NewAppointment = {
    client: form.client as number,
    service: form.service || null,
    startsAt: new Date(`${form.date}T${form.startTime}:00`).toISOString(),
    endsAt: new Date(`${form.date}T${form.endTime}:00`).toISOString(),
    modality: form.modality,
    callLink: form.callLink,
    price: form.price,
    notes: form.notes,
  };

  if (!props.initial && form.recurrence) {
    payload.recurrence = form.recurrence;
    payload.occurrences = form.occurrences;
  }

  // Só reenvia o pacote se ele realmente mudou. Em edição, incluir a chave mesmo sem
  // mudança faz o Back revalidar contra o pacote já vinculado (apps/appointments/
  // services.py::update_appointment usa `"package" in serializer.validated_data`),
  // o que falha se esse pacote esgotou depois que a consulta foi criada.
  const initialPackage = props.initial?.package ?? '';
  if (!props.initial || form.package !== initialPackage) {
    payload.package = form.package || null;
  }

  if (showProfessionalField.value) {
    payload.professional = form.professional as number;
  }

  emit('submit', payload);
}
</script>

<template>
  <form class="space-y-3" novalidate @submit.prevent="handleSubmit">
    <div class="flex flex-wrap gap-3">
      <div>
        <label :for="fieldId('client')" class="mb-1 block text-label uppercase tracking-label text-text-muted">Cliente</label>
        <select
          :id="fieldId('client')"
          v-model="form.client"
          required
          class="h-10 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
        >
          <option value="" disabled>Selecione…</option>
          <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
      <div>
        <label :for="fieldId('service')" class="mb-1 block text-label uppercase tracking-label text-text-muted">Serviço (opcional)</label>
        <select
          :id="fieldId('service')"
          v-model="form.service"
          class="h-10 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
        >
          <option value="">Nenhum</option>
          <option v-for="s in services" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
      </div>
      <div>
        <label :for="fieldId('package')" class="mb-1 block text-label uppercase tracking-label text-text-muted">Pacote (opcional)</label>
        <select
          :id="fieldId('package')"
          v-model="form.package"
          :disabled="!form.client"
          class="h-10 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Nenhum</option>
          <option v-for="p in clientPackages" :key="p.id" :value="p.id">{{ p.name }} ({{ p.remainingSessions }} restantes)</option>
        </select>
      </div>
      <div v-if="showProfessionalField">
        <label :for="fieldId('professional')" class="mb-1 block text-label uppercase tracking-label text-text-muted">Profissional</label>
        <select
          :id="fieldId('professional')"
          v-model="form.professional"
          required
          class="h-10 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
        >
          <option value="" disabled>Selecione…</option>
          <option v-for="p in professionals" :key="p.id" :value="p.id">{{ p.fullName }}</option>
        </select>
      </div>
      <div>
        <label :for="fieldId('modality')" class="mb-1 block text-label uppercase tracking-label text-text-muted">Modalidade</label>
        <select
          :id="fieldId('modality')"
          v-model="form.modality"
          class="h-10 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
        >
          <option v-for="(label, value) in APPOINTMENT_MODALITY_LABEL" :key="value" :value="value">{{ label }}</option>
        </select>
      </div>
    </div>

    <div class="flex flex-wrap gap-3">
      <div>
        <label :for="fieldId('date')" class="mb-1 block text-label uppercase tracking-label text-text-muted">Data</label>
        <input
          :id="fieldId('date')"
          v-model="form.date"
          type="date"
          :min="!initial ? todayDateOnly : undefined"
          required
          class="h-10 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
        />
      </div>
      <div>
        <label :for="fieldId('start')" class="mb-1 block text-label uppercase tracking-label text-text-muted">Início</label>
        <input
          :id="fieldId('start')"
          v-model="form.startTime"
          type="time"
          required
          class="h-10 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
        />
      </div>
      <div>
        <label :for="fieldId('end')" class="mb-1 block text-label uppercase tracking-label text-text-muted">Fim</label>
        <input
          :id="fieldId('end')"
          v-model="form.endTime"
          type="time"
          required
          class="h-10 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
        />
      </div>
      <div>
        <label :for="fieldId('price')" class="mb-1 block text-label uppercase tracking-label text-text-muted">Valor (R$)</label>
        <input
          :id="fieldId('price')"
          v-model.number="form.price"
          type="number"
          min="0"
          step="0.01"
          class="h-10 w-32 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
        />
      </div>
    </div>

    <div v-if="!initial" class="flex flex-wrap items-end gap-3">
      <div>
        <label :for="fieldId('recurrence')" class="mb-1 block text-label uppercase tracking-label text-text-muted">Repetir</label>
        <select
          :id="fieldId('recurrence')"
          v-model="form.recurrence"
          class="h-10 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
        >
          <option value="">Não repete</option>
          <option v-for="(label, value) in RECURRENCE_LABEL" :key="value" :value="value">{{ label }}</option>
        </select>
      </div>
      <div v-if="form.recurrence">
        <label :for="fieldId('occurrences')" class="mb-1 block text-label uppercase tracking-label text-text-muted">Total de consultas</label>
        <input
          :id="fieldId('occurrences')"
          v-model.number="form.occurrences"
          type="number"
          min="2"
          :max="recurrenceMax"
          class="h-10 w-28 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
        />
      </div>
      <p v-if="form.recurrence" class="pb-2 text-body-sm text-text-muted">
        Mesmo dia da semana e horário, contando esta consulta.
      </p>
    </div>
    <p v-if="!initial && autofilledFrom" class="text-body-sm text-text-muted">
      Serviço e valor preenchidos pelo pacote “{{ autofilledFrom.name }}” — pode ajustar.
    </p>

    <div v-if="form.modality === 'ONLINE' || form.modality === 'HYBRID'">
      <label :for="fieldId('call-link')" class="mb-1 block text-label uppercase tracking-label text-text-muted">Link da chamada</label>
      <input
        :maxlength="LIMITS.url"
        :id="fieldId('call-link')"
        v-model="form.callLink"
        type="url"
        placeholder="https://..."
        class="h-10 w-full rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
      />
    </div>

    <div>
      <label :for="fieldId('notes')" class="mb-1 block text-label uppercase tracking-label text-text-muted">Observações operacionais</label>
      <textarea
        :maxlength="LIMITS.notes"
        :id="fieldId('notes')"
        v-model="form.notes"
        rows="2"
        class="w-full rounded-md border border-border bg-surface px-3 py-2 text-body text-text focus-visible:border-primary-600"
      />
      <FieldCount :value="form.notes" :max="LIMITS.notes" />
    </div>

    <p v-if="formError" role="alert" class="text-body-sm text-error">{{ formError }}</p>

    <div class="flex gap-2">
      <Button type="submit" size="md" :loading="saving">Salvar</Button>
      <Button type="button" size="md" variant="ghost" @click="emit('cancel')">Cancelar</Button>
    </div>
  </form>
</template>
