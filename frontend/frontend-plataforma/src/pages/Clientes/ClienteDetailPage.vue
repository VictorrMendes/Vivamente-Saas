<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useClient } from '@/composables/useClient';
import { useClinicalRecords } from '@/composables/useClinicalRecords';
import { useServices } from '@/composables/useServices';
import { useAuthStore } from '@/stores/auth';
import { formatDateTime } from '@/lib/datetime';
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
const auth = useAuthStore();
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

const newRecordContent = ref('');
const newRecordAppointment = ref<number | ''>('');
const editingRecordId = ref<number | null>(null);
const editingRecordContent = ref('');

function appointmentLabel(appt: Appointment) {
  return `${formatDateTime(appt.startsAt)} — ${appointmentDetail(appt)}`;
}
function relatedAppointment(id: number) {
  return appointments.value.find((a) => a.id === id);
}

async function handleAddRecord() {
  if (!newRecordContent.value.trim()) return;
  const ok = await createRecord(clientId.value, newRecordContent.value.trim(), newRecordAppointment.value || undefined);
  if (ok) {
    newRecordContent.value = '';
    newRecordAppointment.value = '';
  }
}

function startEditRecord(id: number, content: string) {
  editingRecordId.value = id;
  editingRecordContent.value = content;
}

async function handleSaveRecord() {
  if (!editingRecordId.value) return;
  const ok = await updateRecord(editingRecordId.value, editingRecordContent.value.trim());
  if (ok) editingRecordId.value = null;
}

const deleteRecordTargetId = ref<number | null>(null);
function handleDeleteRecordConfirmed() {
  if (deleteRecordTargetId.value != null) removeRecord(deleteRecordTargetId.value);
  deleteRecordTargetId.value = null;
}

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
  if (ok) editing.value = false;
}

const deleteClientConfirmOpen = ref(false);
async function handleDeleteConfirmed() {
  deleteClientConfirmOpen.value = false;
  const ok = await remove(clientId.value);
  if (ok) router.push('/clientes');
}

const now = Date.now();
const upcomingAppointments = computed(() =>
  appointments.value.filter((a) => new Date(a.startsAt).getTime() >= now).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
);
const pastAppointments = computed(() =>
  appointments.value
    .filter((a) => new Date(a.startsAt).getTime() < now)
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
);

onMounted(() => {
  load(clientId.value);
  loadAppointments(clientId.value);
  loadServices();
  if (auth.role === 'THERAPIST') loadRecords(clientId.value);
});
</script>

<template>
  <div>
    <RouterLink to="/clientes" class="text-body-sm text-text-muted hover:text-text">← Voltar para Clientes</RouterLink>

    <p v-if="error" role="alert" class="mt-4 rounded-md bg-error-bg px-4 py-3 text-body-sm text-error">
      {{ error }}
    </p>

    <div v-else-if="showLoading" class="mt-4">
      <Skeleton variant="card" />
    </div>

    <template v-else-if="client">
      <div class="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="font-display text-h3 text-text">{{ client.name }}</h1>
          <p class="mt-1 text-body-sm text-text-muted">Cliente desde {{ formatDateTime(client.createdAt) }}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <RouterLink
            :to="`/agenda?client=${client.id}`"
            class="inline-flex h-8 items-center rounded-md bg-secondary-500 px-3 text-body-sm font-medium text-text-inverse hover:bg-secondary-600"
          >
            + Consulta
          </RouterLink>
          <RouterLink
            :to="`/financeiro?client=${client.id}`"
            class="inline-flex h-8 items-center rounded-md bg-secondary-500 px-3 text-body-sm font-medium text-text-inverse hover:bg-secondary-600"
          >
            + Pagamento
          </RouterLink>
        </div>
      </div>

      <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div class="rounded-lg border border-border bg-surface p-4">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="font-display text-h6 text-text">Informações</h2>
            <button
              v-if="!editing"
              type="button"
              class="text-body-sm text-primary-700 hover:underline"
              @click="startEdit"
            >
              Editar
            </button>
          </div>

          <form v-if="editing" class="space-y-3" novalidate @submit.prevent="handleSave">
            <div>
              <label for="edit-name" class="mb-1 block text-label uppercase tracking-label text-text-muted">Nome</label>
              <input
                id="edit-name"
                v-model="editForm.name"
                type="text"
                required
                class="h-10 w-full rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
              />
            </div>
            <div>
              <label for="edit-email" class="mb-1 block text-label uppercase tracking-label text-text-muted">E-mail</label>
              <input
                id="edit-email"
                v-model="editForm.email"
                type="email"
                required
                class="h-10 w-full rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
              />
            </div>
            <div>
              <label for="edit-phone" class="mb-1 block text-label uppercase tracking-label text-text-muted">Telefone</label>
              <input
                id="edit-phone"
                v-model="editForm.phone"
                type="tel"
                required
                class="h-10 w-full rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
              />
            </div>
            <div>
              <label for="edit-birth" class="mb-1 block text-label uppercase tracking-label text-text-muted">Nascimento</label>
              <input
                id="edit-birth"
                v-model="editForm.birthDate"
                type="date"
                class="h-10 w-full rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
              />
            </div>
            <div>
              <label for="edit-document" class="mb-1 block text-label uppercase tracking-label text-text-muted">Documento</label>
              <input
                id="edit-document"
                v-model="editForm.document"
                type="text"
                class="h-10 w-full rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
              />
            </div>
            <div>
              <label for="edit-notes" class="mb-1 block text-label uppercase tracking-label text-text-muted">
                Observações administrativas
              </label>
              <textarea
                id="edit-notes"
                v-model="editForm.administrativeNotes"
                rows="2"
                class="w-full rounded-md border border-border bg-surface px-3 py-2 text-body text-text focus-visible:border-primary-600"
              />
            </div>
            <p v-if="editFormError || saveError" role="alert" class="text-body-sm text-error">{{ editFormError || saveError }}</p>
            <div class="flex gap-2">
              <Button type="submit" size="sm" :loading="saving">Salvar</Button>
              <Button type="button" size="sm" variant="ghost" @click="editing = false">Cancelar</Button>
            </div>
          </form>

          <dl v-else class="space-y-2 text-body-sm">
            <div class="flex justify-between gap-4">
              <dt class="text-text-muted">E-mail</dt>
              <dd class="text-text">{{ client.email }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-text-muted">Telefone</dt>
              <dd class="text-text">{{ client.phone }}</dd>
            </div>
            <div v-if="client.birthDate" class="flex justify-between gap-4">
              <dt class="text-text-muted">Nascimento</dt>
              <dd class="text-text">{{ client.birthDate }}</dd>
            </div>
            <div v-if="client.document" class="flex justify-between gap-4">
              <dt class="text-text-muted">Documento</dt>
              <dd class="text-text">{{ client.document }}</dd>
            </div>
          </dl>
          <p v-if="client.administrativeNotes" class="mt-3 rounded-md bg-surface-sunken p-3 text-body-sm text-text">
            {{ client.administrativeNotes }}
          </p>

          <Button v-if="!editing" class="mt-6" variant="ghost" :loading="deleting" @click="deleteClientConfirmOpen = true">
            Excluir cliente
          </Button>
          <p v-if="deleteError" role="alert" class="mt-2 text-body-sm text-error">{{ deleteError }}</p>
        </div>

        <div class="space-y-6">
          <div class="rounded-lg border border-border bg-surface p-4">
            <h2 class="mb-3 font-display text-h6 text-text">Agendamentos</h2>

            <p v-if="appointmentsError" role="alert" class="rounded-md bg-error-bg px-3 py-2 text-body-sm text-error">
              {{ appointmentsError }}
            </p>
            <p v-else-if="upcomingAppointments.length === 0" class="text-body-sm text-text-muted">
              Nenhum agendamento futuro.
            </p>
            <ul v-else class="space-y-2">
              <li
                v-for="appt in upcomingAppointments"
                :key="appt.id"
                class="flex items-center justify-between gap-3 rounded-md bg-surface-sunken px-3 py-2 text-body-sm"
              >
                <span class="text-text">{{ appointmentDetail(appt) }} — {{ formatDateTime(appt.startsAt) }}</span>
                <Badge :variant="APPOINTMENT_STATUS_VARIANT[appt.status]" size="sm">
                  {{ APPOINTMENT_STATUS_LABEL[appt.status] }}
                </Badge>
              </li>
            </ul>
          </div>

          <div class="rounded-lg border border-border bg-surface p-4">
            <h2 class="mb-3 font-display text-h6 text-text">Histórico operacional</h2>
            <p v-if="pastAppointments.length === 0" class="text-body-sm text-text-muted">Sem histórico ainda.</p>
            <ul v-else class="space-y-2">
              <li
                v-for="appt in pastAppointments"
                :key="appt.id"
                class="flex items-center justify-between gap-3 rounded-md bg-surface-sunken px-3 py-2 text-body-sm"
              >
                <span class="text-text">{{ appointmentDetail(appt) }} — {{ formatDateTime(appt.startsAt) }}</span>
                <Badge :variant="APPOINTMENT_STATUS_VARIANT[appt.status]" size="sm">
                  {{ APPOINTMENT_STATUS_LABEL[appt.status] }}
                </Badge>
              </li>
            </ul>
          </div>

          <div v-if="auth.role === 'THERAPIST'" id="prontuario" class="rounded-lg border border-border bg-surface p-4">
            <h2 class="mb-3 font-display text-h6 text-text">Prontuário</h2>
            <p class="mb-3 text-body-sm text-text-muted">Visível apenas para o terapeuta responsável.</p>

            <form class="mb-4 space-y-2" novalidate @submit.prevent="handleAddRecord">
              <label for="new-record" class="sr-only">Novo registro</label>
              <textarea
                id="new-record"
                v-model="newRecordContent"
                rows="3"
                placeholder="Registrar evolução, observações da sessão..."
                class="w-full rounded-md border border-border bg-surface px-3 py-2 text-body-sm text-text focus-visible:border-primary-600"
              />
              <div>
                <label for="new-record-appointment" class="mb-1 block text-label uppercase tracking-label text-text-muted">
                  Consulta relacionada (opcional)
                </label>
                <select
                  id="new-record-appointment"
                  v-model="newRecordAppointment"
                  class="h-9 rounded-md border border-border bg-surface px-3 text-body-sm text-text focus-visible:border-primary-600"
                >
                  <option value="">Nenhuma</option>
                  <option v-for="appt in appointments" :key="appt.id" :value="appt.id">{{ appointmentLabel(appt) }}</option>
                </select>
              </div>
              <Button type="submit" size="sm" :loading="recordSaving">Adicionar registro</Button>
            </form>
            <p v-if="recordSaveError" role="alert" class="mb-3 text-body-sm text-error">{{ recordSaveError }}</p>

            <p v-if="recordsError" role="alert" class="text-body-sm text-error">{{ recordsError }}</p>
            <p v-else-if="recordsLoading" class="text-body-sm text-text-muted">Carregando...</p>
            <p v-else-if="records.length === 0" class="text-body-sm text-text-muted">Nenhum registro ainda.</p>
            <ul v-else class="space-y-3">
              <li v-for="record in records" :key="record.id" class="rounded-md bg-surface-sunken p-3">
                <template v-if="editingRecordId === record.id">
                  <textarea
                    v-model="editingRecordContent"
                    rows="3"
                    class="w-full rounded-md border border-border bg-surface px-3 py-2 text-body-sm text-text focus-visible:border-primary-600"
                  />
                  <div class="mt-2 flex gap-2">
                    <Button size="sm" :loading="recordSaving" @click="handleSaveRecord">Salvar</Button>
                    <Button size="sm" variant="ghost" @click="editingRecordId = null">Cancelar</Button>
                  </div>
                </template>
                <template v-else>
                  <p class="whitespace-pre-wrap text-body-sm text-text">{{ record.content }}</p>
                  <p v-if="record.appointment && relatedAppointment(record.appointment)" class="mt-1 text-caption text-text-muted">
                    Consulta: {{ appointmentLabel(relatedAppointment(record.appointment)!) }}
                  </p>
                  <div class="mt-2 flex items-center justify-between">
                    <span class="text-body-sm text-text-muted">{{ formatDateTime(record.recordedAt) }} · Você</span>
                    <div class="flex gap-3">
                      <button
                        type="button"
                        class="text-body-sm text-primary-700 hover:underline"
                        @click="startEditRecord(record.id, record.content)"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        class="text-body-sm text-error hover:underline"
                        :disabled="recordRemovingId === record.id"
                        @click="deleteRecordTargetId = record.id"
                      >
                        Excluir
                      </button>
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
          </div>
        </div>
      </div>
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
