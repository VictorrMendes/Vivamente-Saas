<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { backApi } from '@/services/api/client';
import type { ApiEnvelope, PaginatedEnvelope } from '@/types/api';
import type { Appointment } from '@/types/appointment';
import type { ClinicalRecord } from '@/types/clinicalRecord';
import type { Client } from '@/types/client';
import ClinicalRecordFields from '@/components/forms/ClinicalRecordFields.vue';
import Button from '@/components/ui/Button.vue';
import Badge from '@/components/ui/Badge.vue';
import { parseClinicalContent } from '@/lib/clinicalContent';
import { formatDateTime } from '@/lib/datetime';
import { APPOINTMENT_STATUS_LABEL, APPOINTMENT_STATUS_VARIANT } from '@/constants/appointmentStatus';

const props = defineProps<{ id: string }>();
const appointment = ref<Appointment | null>(null);
const patient = ref<Client | null>(null);
const record = ref<ClinicalRecord | null>(null);
const content = ref('');
const savedContent = ref('');
const loading = ref(true);
const busy = ref(false);
const error = ref('');
const notice = ref('');
const now = ref(Date.now());
const timer = setInterval(() => { now.value = Date.now(); }, 1000);
const dirty = computed(() => content.value !== savedContent.value);
const inProgress = computed(() => appointment.value?.status === 'IN_PROGRESS');
const elapsed = computed(() => {
  if (!appointment.value?.startedAt) return '00:00:00';
  const end = appointment.value.finishedAt ? Date.parse(appointment.value.finishedAt) : now.value;
  const seconds = Math.max(0, Math.floor((end - Date.parse(appointment.value.startedAt)) / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map((part) => String(part).padStart(2, '0')).join(':');
});
function beforeUnload(event: BeforeUnloadEvent) {
  if (dirty.value) { event.preventDefault(); event.returnValue = ''; }
}
onBeforeRouteLeave(() => !busy.value && (!dirty.value || window.confirm('Há anotações não salvas. Deseja sair sem salvar?')));
onMounted(async () => {
  window.addEventListener('beforeunload', beforeUnload);
  try {
    appointment.value = (await backApi<ApiEnvelope<Appointment>>(`/api/v1/appointments/${props.id}`)).data;
    const [clientResponse, recordsResponse] = await Promise.all([
      backApi<ApiEnvelope<Client>>(`/api/v1/clients/${appointment.value.client}`),
      backApi<PaginatedEnvelope<ClinicalRecord>>(`/api/v1/clinical-records?appointment=${props.id}&per_page=1`),
    ]);
    patient.value = clientResponse.data;
    record.value = recordsResponse.data[0] ?? null;
    content.value = record.value?.content ?? '';
    savedContent.value = content.value;
  } catch { error.value = 'Não foi possível abrir este atendimento. Volte à agenda e tente novamente.'; }
  finally { loading.value = false; }
});
onUnmounted(() => { clearInterval(timer); window.removeEventListener('beforeunload', beforeUnload); });

async function persist() {
  if (!appointment.value || !patient.value) return false;
  if (!parseClinicalContent(content.value).evolucao.trim()) {
    error.value = 'Preencha a evolução da sessão antes de salvar ou concluir.';
    return false;
  }
  const payload = record.value ? { content: content.value } : {
    content: content.value, client: patient.value.id, appointment: appointment.value.id,
  };
  const response = await backApi<ApiEnvelope<ClinicalRecord>>(
    record.value ? `/api/v1/clinical-records/${record.value.id}` : '/api/v1/clinical-records',
    { method: record.value ? 'PATCH' : 'POST', body: JSON.stringify(payload) },
  );
  record.value = response.data;
  savedContent.value = content.value;
  notice.value = 'Anotações salvas no prontuário.';
  return true;
}
async function save(finish = false) {
  if (busy.value || !inProgress.value) return;
  busy.value = true;
  error.value = '';
  notice.value = '';
  try {
    if (await persist() && finish) {
      appointment.value = (await backApi<ApiEnvelope<Appointment>>(`/api/v1/appointments/${props.id}/complete`, { method: 'PATCH' })).data;
      notice.value = 'Consulta concluída e prontuário salvo.';
    }
  } catch { error.value = 'Não foi possível salvar ou concluir. Suas anotações continuam nesta tela; tente novamente.'; }
  finally { busy.value = false; }
}
</script>

<template>
  <section class="space-y-6">
    <RouterLink to="/agenda" class="text-body-sm text-primary-700 hover:underline">← Voltar à agenda</RouterLink>
    <p v-if="loading" role="status">Abrindo atendimento…</p>
    <p v-if="error" role="alert" class="rounded-xl bg-error-bg p-4 text-error">{{ error }}</p>
    <template v-if="!loading && appointment && patient">
      <header class="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-surface p-6">
        <div>
          <p class="text-caption text-text-muted">ATENDIMENTO · PRONTUÁRIO CLÍNICO</p>
          <h1 class="mt-2 font-display text-h4 text-text">{{ patient.name }}</h1>
          <p class="mt-1 text-body-sm text-text-muted">{{ formatDateTime(appointment.startsAt) }}</p>
        </div>
        <div class="space-y-2 text-right">
          <Badge :variant="APPOINTMENT_STATUS_VARIANT[appointment.status]">{{ APPOINTMENT_STATUS_LABEL[appointment.status] }}</Badge>
          <p class="font-mono text-h4 tabular-nums text-primary-700" aria-label="Tempo de atendimento">{{ elapsed }}</p>
        </div>
      </header>
      <div class="grid items-start gap-6 xl:grid-cols-[240px_minmax(0,1fr)]">
        <aside class="space-y-4 rounded-2xl border border-border bg-surface p-5">
          <h2 class="font-medium text-text">Anotações da sessão</h2>
          <p class="text-body-sm text-text-muted">Evolução, observações e próximos pontos de cuidado, vinculados a este atendimento.</p>
          <p class="rounded-xl bg-surface-sunken p-3 text-caption text-text-muted">Sigilo clínico: somente o terapeuta responsável acessa este conteúdo.</p>
          <RouterLink :to="`/clientes/${patient.id}#prontuario`" class="block text-body-sm text-primary-700 hover:underline">Ver histórico do paciente</RouterLink>
        </aside>
        <form class="min-w-0 space-y-5 rounded-2xl border border-border bg-surface p-4 sm:p-6" @submit.prevent="save()">
          <ClinicalRecordFields v-model="content" :disabled="busy || !inProgress" />
          <p v-if="notice" role="status" class="text-body-sm text-success">{{ notice }}</p>
          <div v-if="inProgress" class="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            <p class="text-caption text-text-muted">{{ dirty ? 'Alterações não salvas' : 'Anotações atualizadas' }}</p>
            <div class="flex flex-wrap gap-2">
              <Button type="submit" variant="secondary" :disabled="busy">Salvar anotações</Button>
              <Button type="button" :loading="busy" :disabled="busy" @click="save(true)">Salvar e concluir consulta</Button>
            </div>
          </div>
        </form>
      </div>
    </template>
  </section>
</template>
