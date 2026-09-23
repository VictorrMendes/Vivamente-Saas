<script setup lang="ts">
import ClinicalRecordFields from '@/components/forms/ClinicalRecordFields.vue';
import { clinicalFields, parseClinicalContent } from '@/lib/clinicalContent';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { CalendarPlus, Mail, Phone, Wallet } from '@lucide/vue';
import { useClient } from '@/composables/useClient';
import { useClinicalRecords } from '@/composables/useClinicalRecords';
import { usePackages } from '@/composables/usePackages';
import { useServices } from '@/composables/useServices';
import { useToast } from '@/composables/useToast';
import { useAuthStore } from '@/stores/auth';
import { formatDate, formatDateTime, formatTime } from '@/lib/datetime';
import { APPOINTMENT_STATUS_LABEL, APPOINTMENT_STATUS_VARIANT } from '@/constants/appointmentStatus';
import { APPOINTMENT_MODALITY_LABEL } from '@/constants/appointmentModality';
import type { Appointment } from '@/types/appointment';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Pagination from '@/components/ui/Pagination.vue';

const props = defineProps<{ id: string }>();
const router = useRouter();
const route = useRoute();
const toast = useToast();
const auth = useAuthStore();
const isTherapist = computed(() => auth.role === 'THERAPIST');
// Vue Router só entrega params como string — convertemos na fronteira, aqui.
const clientId = computed(() => Number(props.id));

const {
  client,
  showLoading,
  error,
  appointments,
  appointmentsError,
  saving,
  saveError,
  deleting,
  deleteError,
  load,
  loadAppointments,
  update,
  remove,
} = useClient();

const { services, load: loadServices } = useServices();
const { packages, load: loadPackages } = usePackages();
const serviceName = computed(() => {
  const map = new Map(services.value.map((s) => [s.id, s.name]));
  return (id: number) => map.get(id) ?? String(id);
});
function appointmentDetail(appt: Appointment) {
  if (appt.service) return serviceName.value(appt.service);
  return appt.modality ? APPOINTMENT_MODALITY_LABEL[appt.modality] : 'Sem detalhes';
}

const {
  records,
  pagination: recordsPagination,
  loading: recordsLoading,
  error: recordsError,
  saving: recordSaving,
  saveError: recordSaveError,
  removingId: recordRemovingId,
  load: loadRecords,
  create: createRecord,
  update: updateRecord,
  remove: removeRecord,
} = useClinicalRecords();

// Falhas de salvar/excluir viram toast (validação de campo continua junto do formulário).
watch(saveError, (message) => { if (message) toast.error(message); });
watch(deleteError, (message) => { if (message) toast.error(message); });
watch(recordSaveError, (message) => { if (message) toast.error(message); });

type Tab = 'geral' | 'consultas' | 'prontuario';
const tab = ref<Tab>(route.hash === '#prontuario' && isTherapist.value ? 'prontuario' : 'geral');
const tabs = computed(() => [
  { key: 'geral' as const, label: 'Visão geral' },
  { key: 'consultas' as const, label: 'Consultas', count: appointments.value.length },
  ...(isTherapist.value ? [{ key: 'prontuario' as const, label: 'Prontuário', count: recordsPagination.value?.total }] : []),
]);

// --- Cabeçalho e resumo ---
const initials = computed(() =>
  (client.value?.name ?? '').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]!.toUpperCase()).join(''),
);
const age = computed(() => {
  const birth = client.value?.birthDate;
  if (!birth) return null;
  const [y, m, d] = birth.split('-').map(Number);
  const today = new Date();
  const years = today.getFullYear() - y! - (today.getMonth() + 1 < m! || (today.getMonth() + 1 === m! && today.getDate() < d!) ? 1 : 0);
  return years >= 0 ? years : null;
});
const phoneDigits = computed(() => (client.value?.phone ?? '').replace(/\D/g, ''));

const now = Date.now();
const upcomingAppointments = computed(() =>
  appointments.value
    .filter((a) => new Date(a.startsAt).getTime() >= now && !['CANCELLED', 'DECLINED'].includes(a.status))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
);
const pastAppointments = computed(() =>
  appointments.value
    .filter((a) => new Date(a.startsAt).getTime() < now)
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
);
// Cancelada/recusada no futuro não é "próxima": vai pro histórico da aba Consultas.
const futureCancelled = computed(() =>
  appointments.value
    .filter((a) => new Date(a.startsAt).getTime() >= now && ['CANCELLED', 'DECLINED'].includes(a.status))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
);
const historyAppointments = computed(() => [...futureCancelled.value, ...pastAppointments.value]);
const completedCount = computed(() => appointments.value.filter((a) => a.status === 'COMPLETED').length);
const nextAppointment = computed(() => upcomingAppointments.value[0]);
const activePackage = computed(() => packages.value.find((p) => p.status === 'ACTIVE'));

function dayParts(iso: string) {
  const date = new Date(iso);
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', ''),
  };
}
function appointmentLabel(appt: Appointment) {
  return `${formatDateTime(appt.startsAt)} — ${appointmentDetail(appt)}`;
}
function relatedAppointment(id: number) {
  return appointments.value.find((a) => a.id === id);
}

// --- Prontuário ---
const showRecordForm = ref(false);
const newRecordContent = ref('');
const newRecordAppointment = ref<number | ''>('');
const editingRecordId = ref<number | null>(null);
const editingRecordContent = ref('');
const recordFormError = ref<string | null>(null);

function recordBlocks(raw: string) {
  const content = parseClinicalContent(raw);
  return clinicalFields.filter(({ key }) => content[key].trim()).map(({ key, label }) => ({ key, label, text: content[key] }));
}

async function handleAddRecord() {
  recordFormError.value = null;
  if (!parseClinicalContent(newRecordContent.value).evolucao.trim()) {
    recordFormError.value = 'Preencha a evolução da sessão.';
    return;
  }
  const ok = await createRecord(clientId.value, newRecordContent.value.trim(), newRecordAppointment.value || undefined);
  if (ok) {
    toast.success('Registro adicionado ao prontuário.');
    newRecordContent.value = '';
    newRecordAppointment.value = '';
    showRecordForm.value = false;
  }
}

function startEditRecord(id: number, content: string) {
  editingRecordId.value = id;
  editingRecordContent.value = content;
}

async function handleSaveRecord() {
  if (!editingRecordId.value) return;
  const ok = await updateRecord(editingRecordId.value, editingRecordContent.value.trim());
  if (ok) {
    toast.success('Registro atualizado.');
    editingRecordId.value = null;
  }
}

const deleteRecordTargetId = ref<number | null>(null);
function handleDeleteRecordConfirmed() {
  if (deleteRecordTargetId.value != null) removeRecord(deleteRecordTargetId.value);
  deleteRecordTargetId.value = null;
}

// --- Dados do cliente ---
const editing = ref(false);
const editForm = reactive({ name: '', email: '', phone: '', birthDate: '', document: '', administrativeNotes: '' });
const editFormError = ref<string | null>(null);

function startEdit() {
  if (!client.value) return;
  editForm.name = client.value.name;
  editForm.email = client.value.email;
  editForm.phone = client.value.phone;
  editForm.birthDate = client.value.birthDate ?? '';
  editForm.document = client.value.document ?? '';
  editForm.administrativeNotes = client.value.administrativeNotes ?? '';
  editing.value = true;
}

async function handleSave() {
  editFormError.value = null;
  if (!editForm.name.trim()) { editFormError.value = 'Informe o nome do cliente.'; return; }
  if (!editForm.email.trim()) { editFormError.value = 'Informe o e-mail do cliente.'; return; }
  if (!editForm.phone.trim()) { editFormError.value = 'Informe o telefone do cliente.'; return; }
  const ok = await update(clientId.value, {
    name: editForm.name,
    email: editForm.email,
    phone: editForm.phone,
    birthDate: editForm.birthDate || undefined,
    document: editForm.document || undefined,
    administrativeNotes: editForm.administrativeNotes || undefined,
  });
  if (ok) {
    toast.success('Dados do cliente atualizados.');
    editing.value = false;
  }
}

const deleteClientConfirmOpen = ref(false);
async function handleDeleteConfirmed() {
  deleteClientConfirmOpen.value = false;
  const ok = await remove(clientId.value);
  if (ok) router.push('/clientes');
}

function closeMenu(event: Event) {
  (event.currentTarget as HTMLElement).closest('details')?.removeAttribute('open');
}

onMounted(() => {
  load(clientId.value);
  loadAppointments(clientId.value);
  loadServices();
  loadPackages({ client: clientId.value, status: 'ACTIVE' });
  if (isTherapist.value) loadRecords(clientId.value);
});

const inputClass = 'h-10 w-full rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600';
const labelClass = 'mb-1 block text-label uppercase tracking-label text-text-muted';
</script>

<template>
  <div>
    <RouterLink to="/clientes" class="text-body-sm text-text-muted hover:text-text">← Voltar para Clientes</RouterLink>

    <p v-if="error" role="alert" class="mt-4 rounded-md bg-error-bg px-4 py-3 text-body-sm text-error">
      {{ error }}
    </p>

    <div v-else-if="showLoading" class="mt-4 space-y-4" aria-busy="true">
      <Skeleton variant="card" />
      <Skeleton variant="card" />
    </div>

    <template v-else-if="client">
      <!-- Cabeçalho: quem é, como falar, o que fazer agora -->
      <header class="mt-4 flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div class="flex min-w-0 items-center gap-4">
          <div
            class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-600 font-display text-h5 text-text-inverse"
            aria-hidden="true"
          >
            {{ initials }}
          </div>
          <div class="min-w-0">
            <h1 class="truncate font-display text-h3 text-text">{{ client.name }}</h1>
            <p class="mt-0.5 text-body-sm text-text-muted">
              Cliente desde {{ formatDate(client.createdAt) }}<template v-if="age !== null"> · {{ age }} anos</template>
            </p>
            <div class="mt-2 flex flex-wrap gap-2">
              <a
                v-if="client.phone"
                :href="`tel:+${phoneDigits.length <= 11 ? '55' : ''}${phoneDigits}`"
                class="inline-flex items-center gap-1.5 rounded-pill border border-border px-2.5 py-1 text-caption text-text hover:bg-surface-sunken"
              >
                <Phone :size="14" aria-hidden="true" />{{ client.phone }}
              </a>
              <a
                v-if="client.email"
                :href="`mailto:${client.email}`"
                class="inline-flex max-w-full items-center gap-1.5 rounded-pill border border-border px-2.5 py-1 text-caption text-text hover:bg-surface-sunken"
              >
                <Mail :size="14" aria-hidden="true" /><span class="truncate">{{ client.email }}</span>
              </a>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <RouterLink
            :to="`/agenda?client=${client.id}`"
            class="inline-flex h-10 items-center gap-2 rounded-md bg-primary-600 px-4 text-button font-medium text-text-inverse transition-colors hover:bg-primary-700"
          >
            <CalendarPlus :size="16" aria-hidden="true" />Nova consulta
          </RouterLink>
          <RouterLink
            :to="`/financeiro?client=${client.id}`"
            class="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-4 text-button font-medium text-text transition-colors hover:bg-surface-sunken"
          >
            <Wallet :size="16" aria-hidden="true" />Pagamento
          </RouterLink>
          <details class="relative">
            <summary
              class="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-md border border-border text-text hover:bg-surface-sunken"
              aria-label="Mais ações do cliente"
            >•••</summary>
            <div class="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-border bg-surface p-2 shadow-lg">
              <button
                type="button"
                :disabled="deleting"
                class="w-full rounded-lg px-3 py-2 text-left text-body-sm text-error hover:bg-surface-sunken disabled:opacity-50"
                @click="deleteClientConfirmOpen = true; closeMenu($event)"
              >
                Excluir cliente
              </button>
            </div>
          </details>
        </div>
      </header>

      <!-- Resumo: o que o terapeuta quer saber antes de abrir qualquer aba -->
      <dl class="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div class="rounded-lg border border-border bg-surface p-4">
          <dt class="text-label uppercase tracking-label text-text-muted">Próxima consulta</dt>
          <dd v-if="nextAppointment" class="mt-1">
            <p class="font-display text-h6 text-text">{{ formatDate(nextAppointment.startsAt) }} · {{ formatTime(nextAppointment.startsAt) }}</p>
            <p class="text-body-sm text-text-muted">{{ appointmentDetail(nextAppointment) }}</p>
          </dd>
          <dd v-else class="mt-1 text-body-sm text-text-muted">Nada agendado.</dd>
        </div>
        <div class="rounded-lg border border-border bg-surface p-4">
          <dt class="text-label uppercase tracking-label text-text-muted">Sessões realizadas</dt>
          <dd class="mt-1 font-display text-h4 text-text">{{ completedCount }}</dd>
        </div>
        <div class="rounded-lg border border-border bg-surface p-4">
          <dt class="text-label uppercase tracking-label text-text-muted">Pacote ativo</dt>
          <dd v-if="activePackage" class="mt-1">
            <p class="font-display text-h6 text-text">{{ activePackage.remainingSessions }} de {{ activePackage.totalSessions }} restantes</p>
            <p class="truncate text-body-sm text-text-muted">{{ activePackage.name }}</p>
          </dd>
          <dd v-else class="mt-1 text-body-sm text-text-muted">
            Sem pacote ativo.
            <RouterLink :to="`/pacotes?client=${client.id}`" class="text-primary-700 hover:underline">Criar pacote</RouterLink>
          </dd>
        </div>
      </dl>

      <!-- Abas -->
      <div role="tablist" aria-label="Seções do cliente" class="mt-8 flex gap-1 overflow-x-auto border-b border-border">
        <button
          v-for="t in tabs"
          :id="`tab-${t.key}`"
          :key="t.key"
          type="button"
          role="tab"
          :aria-selected="tab === t.key"
          :aria-controls="`panel-${t.key}`"
          class="-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-body-sm font-medium transition-colors"
          :class="tab === t.key ? 'border-primary-600 text-primary-700' : 'border-transparent text-text-muted hover:text-text'"
          @click="tab = t.key"
        >
          {{ t.label }}
          <span v-if="t.count" class="rounded-pill bg-surface-sunken px-1.5 text-caption text-text-muted">{{ t.count }}</span>
        </button>
      </div>

      <!-- Visão geral -->
      <section v-show="tab === 'geral'" id="panel-geral" role="tabpanel" aria-labelledby="tab-geral" class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div class="rounded-lg border border-border bg-surface p-5 lg:col-span-3">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="font-display text-h6 text-text">Dados do cliente</h2>
            <Button v-if="!editing" variant="ghost" size="sm" @click="startEdit">Editar</Button>
          </div>

          <form v-if="editing" class="grid gap-3 sm:grid-cols-2" novalidate @submit.prevent="handleSave">
            <div class="sm:col-span-2">
              <label for="edit-name" :class="labelClass">Nome</label>
              <input id="edit-name" v-model="editForm.name" type="text" required :class="inputClass" />
            </div>
            <div>
              <label for="edit-email" :class="labelClass">E-mail</label>
              <input id="edit-email" v-model="editForm.email" type="email" required :class="inputClass" />
            </div>
            <div>
              <label for="edit-phone" :class="labelClass">Telefone</label>
              <input id="edit-phone" v-model="editForm.phone" type="tel" required :class="inputClass" />
            </div>
            <div>
              <label for="edit-birth" :class="labelClass">Nascimento</label>
              <input id="edit-birth" v-model="editForm.birthDate" type="date" :class="inputClass" />
            </div>
            <div>
              <label for="edit-document" :class="labelClass">Documento</label>
              <input id="edit-document" v-model="editForm.document" type="text" :class="inputClass" />
            </div>
            <div class="sm:col-span-2">
              <label for="edit-notes" :class="labelClass">Observações administrativas</label>
              <textarea
                id="edit-notes"
                v-model="editForm.administrativeNotes"
                rows="3"
                class="w-full rounded-md border border-border bg-surface px-3 py-2 text-body text-text focus-visible:border-primary-600"
              />
            </div>
            <p v-if="editFormError" role="alert" class="text-body-sm text-error sm:col-span-2">{{ editFormError }}</p>
            <div class="flex gap-2 sm:col-span-2">
              <Button type="submit" size="sm" :loading="saving">Salvar</Button>
              <Button type="button" size="sm" variant="ghost" @click="editing = false">Cancelar</Button>
            </div>
          </form>

          <dl v-else class="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <div>
              <dt class="text-label uppercase tracking-label text-text-muted">E-mail</dt>
              <dd class="mt-0.5 break-words text-body text-text">{{ client.email || '—' }}</dd>
            </div>
            <div>
              <dt class="text-label uppercase tracking-label text-text-muted">Telefone</dt>
              <dd class="mt-0.5 text-body text-text">{{ client.phone || '—' }}</dd>
            </div>
            <div>
              <dt class="text-label uppercase tracking-label text-text-muted">Nascimento</dt>
              <dd class="mt-0.5 text-body text-text">
                <template v-if="client.birthDate">{{ formatDate(client.birthDate) }}<span v-if="age !== null" class="text-text-muted"> ({{ age }} anos)</span></template>
                <template v-else>—</template>
              </dd>
            </div>
            <div>
              <dt class="text-label uppercase tracking-label text-text-muted">Documento</dt>
              <dd class="mt-0.5 text-body text-text">{{ client.document || '—' }}</dd>
            </div>
            <div v-if="client.administrativeNotes" class="sm:col-span-2">
              <dt class="text-label uppercase tracking-label text-text-muted">Observações administrativas</dt>
              <dd class="mt-1 whitespace-pre-wrap rounded-md bg-surface-sunken p-3 text-body-sm text-text">{{ client.administrativeNotes }}</dd>
            </div>
          </dl>
        </div>

        <div class="rounded-lg border border-border bg-surface p-5 lg:col-span-2">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="font-display text-h6 text-text">Próximas consultas</h2>
            <button v-if="appointments.length" type="button" class="text-body-sm text-primary-700 hover:underline" @click="tab = 'consultas'">Ver todas</button>
          </div>
          <p v-if="appointmentsError" role="alert" class="rounded-md bg-error-bg px-3 py-2 text-body-sm text-error">{{ appointmentsError }}</p>
          <p v-else-if="upcomingAppointments.length === 0" class="text-body-sm text-text-muted">Nenhuma consulta futura.</p>
          <ul v-else class="space-y-2">
            <li v-for="appt in upcomingAppointments.slice(0, 4)" :key="appt.id" class="flex items-center gap-3">
              <div class="w-11 shrink-0 rounded-md bg-surface-sunken py-1 text-center leading-tight">
                <p class="font-display text-h6 text-text">{{ dayParts(appt.startsAt).day }}</p>
                <p class="text-caption uppercase text-text-muted">{{ dayParts(appt.startsAt).month }}</p>
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-body-sm font-medium text-text">{{ appointmentDetail(appt) }}</p>
                <p class="text-caption text-text-muted">{{ formatTime(appt.startsAt) }} – {{ formatTime(appt.endsAt) }}</p>
              </div>
              <Badge :variant="APPOINTMENT_STATUS_VARIANT[appt.status]" size="sm">{{ APPOINTMENT_STATUS_LABEL[appt.status] }}</Badge>
            </li>
          </ul>
        </div>
      </section>

      <!-- Consultas -->
      <section v-show="tab === 'consultas'" id="panel-consultas" role="tabpanel" aria-labelledby="tab-consultas" class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div class="rounded-lg border border-border bg-surface p-5">
          <h2 class="mb-4 font-display text-h6 text-text">Agendadas</h2>
          <p v-if="appointmentsError" role="alert" class="rounded-md bg-error-bg px-3 py-2 text-body-sm text-error">{{ appointmentsError }}</p>
          <p v-else-if="upcomingAppointments.length === 0" class="text-body-sm text-text-muted">Nenhum agendamento futuro.</p>
          <ul v-else class="divide-y divide-border">
            <li v-for="appt in upcomingAppointments" :key="appt.id" class="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <div class="w-11 shrink-0 rounded-md bg-surface-sunken py-1 text-center leading-tight">
                <p class="font-display text-h6 text-text">{{ dayParts(appt.startsAt).day }}</p>
                <p class="text-caption uppercase text-text-muted">{{ dayParts(appt.startsAt).month }}</p>
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-body-sm font-medium text-text">{{ appointmentDetail(appt) }}</p>
                <p class="text-caption text-text-muted">{{ formatTime(appt.startsAt) }} – {{ formatTime(appt.endsAt) }}</p>
              </div>
              <Badge :variant="APPOINTMENT_STATUS_VARIANT[appt.status]" size="sm">{{ APPOINTMENT_STATUS_LABEL[appt.status] }}</Badge>
            </li>
          </ul>
        </div>

        <div class="rounded-lg border border-border bg-surface p-5">
          <h2 class="mb-4 font-display text-h6 text-text">Histórico</h2>
          <p v-if="historyAppointments.length === 0" class="text-body-sm text-text-muted">Sem histórico ainda.</p>
          <ul v-else class="max-h-[32rem] divide-y divide-border overflow-y-auto">
            <li v-for="appt in historyAppointments" :key="appt.id" class="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <div class="w-11 shrink-0 rounded-md bg-surface-sunken py-1 text-center leading-tight">
                <p class="font-display text-h6 text-text">{{ dayParts(appt.startsAt).day }}</p>
                <p class="text-caption uppercase text-text-muted">{{ dayParts(appt.startsAt).month }}</p>
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-body-sm font-medium text-text">{{ appointmentDetail(appt) }}</p>
                <p class="text-caption text-text-muted">{{ formatDate(appt.startsAt) }} · {{ formatTime(appt.startsAt) }}</p>
              </div>
              <Badge :variant="APPOINTMENT_STATUS_VARIANT[appt.status]" size="sm">{{ APPOINTMENT_STATUS_LABEL[appt.status] }}</Badge>
            </li>
          </ul>
        </div>
      </section>

      <!-- Prontuário (só o terapeuta responsável — nunca ADMIN) -->
      <section
        v-if="isTherapist"
        v-show="tab === 'prontuario'"
        id="prontuario"
        role="tabpanel"
        aria-labelledby="tab-prontuario"
        class="mt-6"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-body-sm text-text-muted">Visível apenas para o terapeuta responsável.</p>
          <Button v-if="!showRecordForm" size="sm" @click="showRecordForm = true">Novo registro</Button>
        </div>

        <form
          v-if="showRecordForm"
          class="mt-4 space-y-4 rounded-lg border border-border bg-surface p-5"
          novalidate
          @submit.prevent="handleAddRecord"
        >
          <h2 class="font-display text-h6 text-text">Novo registro</h2>
          <ClinicalRecordFields v-model="newRecordContent" :disabled="recordSaving" />
          <div>
            <label for="new-record-appointment" :class="labelClass">Consulta relacionada (opcional)</label>
            <select
              id="new-record-appointment"
              v-model="newRecordAppointment"
              class="h-10 w-full max-w-md rounded-md border border-border bg-surface px-3 text-body-sm text-text focus-visible:border-primary-600"
            >
              <option value="">Nenhuma</option>
              <option v-for="appt in appointments" :key="appt.id" :value="appt.id">{{ appointmentLabel(appt) }}</option>
            </select>
          </div>
          <p v-if="recordFormError" role="alert" class="text-body-sm text-error">{{ recordFormError }}</p>
          <div class="flex gap-2">
            <Button type="submit" size="sm" :loading="recordSaving">Adicionar registro</Button>
            <Button type="button" size="sm" variant="ghost" @click="showRecordForm = false; recordFormError = null">Cancelar</Button>
          </div>
        </form>

        <p v-if="recordsError" role="alert" class="mt-4 rounded-md bg-error-bg px-4 py-3 text-body-sm text-error">{{ recordsError }}</p>
        <div v-else-if="recordsLoading" class="mt-4" aria-busy="true"><Skeleton variant="card" /></div>
        <div v-else-if="records.length === 0 && !showRecordForm" class="mt-4 rounded-lg border border-dashed border-border bg-surface px-6 py-10 text-center">
          <p class="font-display text-h6 text-text">Nenhum registro ainda</p>
          <p class="mt-1 text-body-sm text-text-muted">As anotações das sessões deste cliente ficam aqui.</p>
          <Button class="mt-4" size="sm" @click="showRecordForm = true">Criar o primeiro registro</Button>
        </div>
        <ul v-else class="mt-4 space-y-4">
          <li v-for="record in records" :key="record.id" class="rounded-lg border border-border bg-surface p-5">
            <template v-if="editingRecordId === record.id">
              <ClinicalRecordFields v-model="editingRecordContent" :disabled="recordSaving" />
              <div class="mt-3 flex gap-2">
                <Button size="sm" :loading="recordSaving" @click="handleSaveRecord">Salvar</Button>
                <Button size="sm" variant="ghost" @click="editingRecordId = null">Cancelar</Button>
              </div>
            </template>
            <template v-else>
              <div class="flex flex-wrap items-start justify-between gap-2 border-b border-border pb-3">
                <div>
                  <p class="text-body-sm font-medium text-text">{{ formatDateTime(record.recordedAt) }}</p>
                  <p v-if="record.appointment && relatedAppointment(record.appointment)" class="text-caption text-text-muted">
                    Consulta: {{ appointmentLabel(relatedAppointment(record.appointment)!) }}
                  </p>
                </div>
                <div class="flex gap-1">
                  <Button size="sm" variant="ghost" @click="startEditRecord(record.id, record.content)">Editar</Button>
                  <Button size="sm" variant="ghost" :disabled="recordRemovingId === record.id" @click="deleteRecordTargetId = record.id">
                    <span class="text-error">Excluir</span>
                  </Button>
                </div>
              </div>
              <div class="mt-3 space-y-4">
                <div v-for="block in recordBlocks(record.content)" :key="block.key" :class="block.key === 'pontosAtencao' ? 'rounded-md border-l-4 border-warning bg-warning-bg px-3 py-2' : ''">
                  <h3 class="text-label uppercase tracking-label text-text-muted">{{ block.label }}</h3>
                  <p class="mt-1 whitespace-pre-wrap text-body-sm text-text">{{ block.text }}</p>
                </div>
              </div>
            </template>
          </li>
        </ul>
        <Pagination
          v-if="recordsPagination && !recordsLoading"
          :page="recordsPagination.page"
          :total-pages="recordsPagination.total_pages"
          @change="(page) => { editingRecordId = null; loadRecords(clientId, page); }"
        />
      </section>
    </template>

    <ConfirmDialog
      :open="deleteClientConfirmOpen"
      title="Excluir cliente"
      description="Essa ação não pode ser desfeita."
      @update:open="(v) => { deleteClientConfirmOpen = v; }"
      @confirm="handleDeleteConfirmed"
    />
    <ConfirmDialog
      :open="deleteRecordTargetId !== null"
      title="Excluir registro de prontuário"
      description="Essa ação não pode ser desfeita."
      @update:open="(v) => { if (!v) deleteRecordTargetId = null; }"
      @confirm="handleDeleteRecordConfirmed"
    />
  </div>
</template>
