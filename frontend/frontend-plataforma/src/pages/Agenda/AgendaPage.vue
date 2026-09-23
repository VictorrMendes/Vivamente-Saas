<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError, backApi } from '@/services/api/client';
import { useToast } from '@/composables/useToast';
import type { ApiEnvelope } from '@/types/api';
import AppointmentActions from '@/components/calendar/AppointmentActions.vue';
import { Calendar } from 'v-calendar';
import 'v-calendar/style.css';
import { useAppointments } from '@/composables/useAppointments';
import { useAvailability } from '@/composables/useAvailability';
import { useServices } from '@/composables/useServices';
import { usePackages } from '@/composables/usePackages';
import { useClientOptions } from '@/composables/useClientOptions';
import { useProfessionalOptions } from '@/composables/useProfessionalOptions';
import { useTheme } from '@/composables/useTheme';
import { useAuthStore } from '@/stores/auth';
import { formatCurrency } from '@/lib/currency';
import { formatTime, toDateOnly } from '@/lib/datetime';
import type { Appointment, AppointmentAction, AppointmentStatus, NewAppointment } from '@/types/appointment';
import { APPOINTMENT_STATUS_LABEL as STATUS_LABEL } from '@/constants/appointmentStatus';
import { APPOINTMENT_MODALITY_LABEL } from '@/constants/appointmentModality';
import { CalendarDays } from '@lucide/vue';
import Button from '@/components/ui/Button.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import AvailabilityList from '@/components/calendar/AvailabilityList.vue';
import AppointmentForm from '@/components/forms/AppointmentForm.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import ModuleBanner from '@/components/layout/ModuleBanner.vue';

const auth = useAuthStore();
const toast = useToast();
const route = useRoute();
const router = useRouter();
const { appointments, showLoading, error, actionError, pendingActionId, saving, saveError, load, updateStatus, create, update } =
  useAppointments();
const { services, load: loadServices } = useServices();
const { packages, load: loadPackages } = usePackages();
const { clients, clientName, load: loadClients } = useClientOptions();
const { professionals, load: loadProfessionals } = useProfessionalOptions();
const { isDark } = useTheme();

const serviceName = computed(() => {
  const map = new Map(services.value.map((s) => [s.id, s.name]));
  return (id: number) => map.get(id) ?? String(id);
});
function appointmentDetail(appt: Appointment) {
  if (appt.service) return serviceName.value(appt.service);
  return appt.modality ? APPOINTMENT_MODALITY_LABEL[appt.modality] : 'Sem detalhes';
}

const {
  slots,
  showLoading: availabilityShowLoading,
  error: availabilityError,
  saving: savingSlot,
  saveError: slotError,
  removingId,
  load: loadAvailability,
  create: createSlot,
  remove: removeSlot,
  toggleBlock,
} = useAvailability();

const today = new Date();
const selectedDate = ref(toDateOnly(today));

const filterStatus = ref<AppointmentStatus | ''>('');
const filterClient = ref<number | ''>('');
const filterService = ref<number | ''>('');

// Mês exibido no calendário — a Agenda recarrega sempre que o mês muda (v-calendar @update:pages),
// combinando com status/client (suportados pelo filterset_fields real do Back) na própria requisição.
const displayedMonth = reactive({ year: today.getFullYear(), month: today.getMonth() + 1 });

function reload() {
  load({
    year: displayedMonth.year,
    month: displayedMonth.month,
    status: filterStatus.value || undefined,
    client: filterClient.value || undefined,
  });
}

function onPagesUpdate(pages: { year: number; month: number }[]) {
  const page = pages[0];
  if (!page) return;
  if (page.year === displayedMonth.year && page.month === displayedMonth.month) return;
  displayedMonth.year = page.year;
  displayedMonth.month = page.month;
  reload();
}

watch([filterStatus, filterClient], reload);

// Link "Nova consulta" a partir de um Pacote (Pacotes) ou de um Cliente chega com ?client=&package=.
// "+ Agendamento" no Dashboard chega só com ?new=1.
const presetClient = route.query.client ? Number(route.query.client) : undefined;
const presetPackage = route.query.package ? Number(route.query.package) : undefined;

onMounted(() => {
  reload();
  loadAvailability();
  loadClients();
  loadServices();
  loadPackages();
  if (auth.role === 'ADMIN') loadProfessionals();
});

const showNewForm = ref(Boolean(presetClient) || route.query.new === '1');
const editingId = ref<number | null>(null);

async function handleCreate(appt: NewAppointment) {
  const ok = await create(appt);
  if (ok) {
    toast.success(appt.recurrence ? `${appt.occurrences} consultas agendadas.` : 'Consulta agendada.');
    showNewForm.value = false;
    // A série nasce inteira no Back; a resposta traz só a 1ª consulta.
    if (appt.recurrence) reload();
  }
}

async function handleUpdate(id: number, appt: NewAppointment) {
  const ok = await update(id, appt);
  if (ok) {
    toast.success('Consulta atualizada.');
    editingId.value = null;
  }
}

const filteredAppointments = computed(() =>
  appointments.value.filter((a) => !filterService.value || a.service === filterService.value),
);

const newSlot = reactive({ date: toDateOnly(today), startTime: '09:00', endTime: '12:00' });
const newSlotError = ref<string | null>(null);

async function handleAddSlot() {
  newSlotError.value = null;
  if (newSlot.endTime <= newSlot.startTime) {
    newSlotError.value = 'O horário final precisa ser depois do inicial.';
    return;
  }
  if (await createSlot({
    startsAt: new Date(`${newSlot.date}T${newSlot.startTime}:00`).toISOString(),
    endsAt: new Date(`${newSlot.date}T${newSlot.endTime}:00`).toISOString(),
  })) toast.success('Horário adicionado.');
}

// "+" dentro da coluna do dia: mesma criação, sem passar pelo formulário de baixo.
async function addSlotFromColumn(slot: { date: string; startTime: string; endTime: string }) {
  const ok = await createSlot({
    startsAt: new Date(`${slot.date}T${slot.startTime}:00`).toISOString(),
    endsAt: new Date(`${slot.date}T${slot.endTime}:00`).toISOString(),
  });
  if (ok) toast.success('Horário adicionado.');
  return ok;
}
watch(slotError, (message) => { if (message) toast.error(message); });

const appointmentsByDate = computed(() => {
  const map = new Map<string, Appointment[]>();
  for (const appt of filteredAppointments.value) {
    const key = toDateOnly(new Date(appt.startsAt));
    const bucket = map.get(key) ?? [];
    bucket.push(appt);
    map.set(key, bucket);
  }
  return map;
});

const calendarAttributes = computed(() =>
  Array.from(appointmentsByDate.value.keys()).map((dateKey) => ({
    key: dateKey,
    dates: [new Date(`${dateKey}T00:00:00`)],
    dot: true,
  })),
);

const selectedDayAppointments = computed(
  () => appointmentsByDate.value.get(selectedDate.value) ?? [],
);

function onDayClick(day: { id: string }) {
  selectedDate.value = day.id;
}

// Falhas de ação (iniciar, cancelar, confirmar) viram toast, não texto solto na página.
watch(actionError, (message) => { if (message) toast.error(message); });
// Erros de salvar (ex.: horário já ocupado) também viram toast, não texto dentro do formulário.
watch(saveError, (message) => { if (message) toast.error(message); });

const STATUS_CHANGED: Partial<Record<AppointmentAction, string>> = {
  confirm: 'Consulta confirmada.',
  cancel: 'Consulta cancelada.',
  reopen: 'Consulta voltou para pendente.',
  complete: 'Consulta concluída.',
};
async function changeStatus(id: number, action: AppointmentAction) {
  const ok = await updateStatus(id, action);
  const message = STATUS_CHANGED[action];
  if (ok && message) toast.success(message);
}

const cancelTargetId = ref<number | null>(null);
function handleCancelConfirmed() {
  if (cancelTargetId.value != null) changeStatus(cancelTargetId.value, 'cancel');
  cancelTargetId.value = null;
}

const requestingId = ref<number | null>(null);
const confirmationInvite = ref<{ whatsappUrl: string; confirmationUrl: string } | null>(null);
async function requestConfirmation(appt: Appointment) {
  const id = appt.id;
  requestingId.value = id;
  confirmationInvite.value = null;
  try {
    confirmationInvite.value = (await backApi<ApiEnvelope<{ whatsappUrl: string; confirmationUrl: string }>>(
      `/api/v1/appointments/${id}/request-confirmation`, { method: 'POST' },
    )).data;
  } catch (err) {
    // O Back já devolve a causa em português (ex.: WhatsApp do cliente ausente).
    const validation = err instanceof ApiError && err.status === 400;
    toast.error(
      validation ? err.message : 'Não foi possível gerar o convite agora. Tente novamente em instantes.',
      validation && /whatsapp/i.test(err.message) ? { label: 'Abrir cadastro do cliente', to: `/clientes/${appt.client}` } : undefined,
    );
  }
  finally { requestingId.value = null; }
}
async function startSession(appt: Appointment) {
  if (appt.status === 'IN_PROGRESS' || await updateStatus(appt.id, 'start')) router.push(`/consultas/${appt.id}`);
}
function refreshResponses() {
  if (!document.hidden && !editingId.value && !showNewForm.value && pendingActionId.value === null) reload();
}
const responseTimer = setInterval(refreshResponses, 30000);
onMounted(() => window.addEventListener('focus', refreshResponses));
onUnmounted(() => { clearInterval(responseTimer); window.removeEventListener('focus', refreshResponses); });
</script>

<template>
  <div>
    <div v-if="confirmationInvite" role="status" class="mb-4 space-y-3 rounded-xl border border-border bg-surface p-4">
      <p class="text-body-sm text-text">Convite preparado. Abra o WhatsApp e envie a mensagem ao cliente. A confirmação será registrada quando ele responder pelo link.</p>
      <p v-if="confirmationInvite.confirmationUrl.includes('localhost')" class="text-caption text-text-muted">Ambiente local: o link só funciona neste computador. Para enviar a pacientes, configure o endereço público da Plataforma.</p>
      <div class="flex flex-wrap gap-3">
        <a :href="confirmationInvite.whatsappUrl" target="_blank" rel="noopener noreferrer" class="text-body-sm font-medium text-primary-700 underline">Abrir WhatsApp para enviar</a>
        <a :href="confirmationInvite.confirmationUrl" target="_blank" rel="noopener noreferrer" class="text-body-sm text-primary-700 underline">Visualizar link do paciente</a>
        <button type="button" class="text-body-sm text-text-muted" @click="confirmationInvite = null">Fechar</button>
      </div>
    </div>
    <ModuleBanner
      :icon="CalendarDays"
      title="Agenda"
      subtitle="Calendário de atendimentos e horários de disponibilidade."
    />

    <div class="mt-4 flex flex-wrap items-end justify-between gap-3">
      <div class="flex flex-wrap gap-3">
        <div>
          <label for="filter-status" class="mb-1 block text-label uppercase tracking-label text-text-muted">Status</label>
          <select
            id="filter-status"
            v-model="filterStatus"
            class="h-9 rounded-md border border-border bg-surface px-3 text-body-sm text-text focus-visible:border-primary-600"
          >
            <option value="">Todos</option>
            <option v-for="(label, value) in STATUS_LABEL" :key="value" :value="value">{{ label }}</option>
          </select>
        </div>
        <div>
          <label for="filter-client" class="mb-1 block text-label uppercase tracking-label text-text-muted">Cliente</label>
          <select
            id="filter-client"
            v-model="filterClient"
            class="h-9 rounded-md border border-border bg-surface px-3 text-body-sm text-text focus-visible:border-primary-600"
          >
            <option value="">Todos</option>
            <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div>
          <label for="filter-service" class="mb-1 block text-label uppercase tracking-label text-text-muted">Serviço</label>
          <select
            id="filter-service"
            v-model="filterService"
            class="h-9 rounded-md border border-border bg-surface px-3 text-body-sm text-text focus-visible:border-primary-600"
          >
            <option value="">Todos</option>
            <option v-for="s in services" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>
      </div>
      <Button variant="primary" size="sm" @click="showNewForm = !showNewForm">
        {{ showNewForm ? 'Cancelar' : '+ Nova consulta' }}
      </Button>
    </div>

    <div v-if="showNewForm" class="mt-4 rounded-lg border border-border bg-surface p-4">
      <AppointmentForm
        :preset-client="presetClient"
        :preset-package="presetPackage"
        :role="auth.role"
        :clients="clients"
        :services="services"
        :packages="packages"
        :professionals="professionals"
        :saving="saving"
        @submit="handleCreate"
        @cancel="showNewForm = false"
      />
    </div>

    <p v-if="error" role="alert" class="mt-4 rounded-md bg-error-bg px-4 py-3 text-body-sm text-error">
      {{ error }}
    </p>

    <div v-else-if="showLoading" class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr]" aria-busy="true">
      <div class="h-80 w-full animate-pulse rounded-lg bg-surface-sunken motion-reduce:animate-none lg:w-80" aria-hidden="true" />
      <Skeleton variant="card" />
    </div>

    <div v-else class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr]">
      <Calendar
        :attributes="calendarAttributes"
        :is-dark="isDark"
        expanded
        borderless
        transparent
        title-position="left"
        @dayclick="onDayClick"
        @update:pages="onPagesUpdate"
      />

      <div class="rounded-lg border border-border bg-surface p-4">
        <h2 class="mb-1 font-display text-h6 text-text">
          {{ new Date(`${selectedDate}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) }}
        </h2>

        <p v-if="selectedDayAppointments.length === 0" class="mt-3 text-body-sm text-text-muted">
          Nenhum agendamento neste dia.
        </p>

        <ul v-else class="mt-3 divide-y divide-border">
          <li v-for="appt in selectedDayAppointments" :key="appt.id" class="py-3">
            <AppointmentForm
              v-if="editingId === appt.id"
              :initial="appt"
              :role="auth.role"
              :clients="clients"
              :services="services"
              :packages="packages"
              :professionals="professionals"
              :saving="saving"
              @submit="(a) => handleUpdate(appt.id, a)"
              @cancel="editingId = null"
            />
            <div v-else class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="text-body-sm font-medium text-text">{{ clientName(appt.client) }} — {{ appointmentDetail(appt) }}</p>
                <p class="text-caption text-text-muted">
                  {{ formatTime(appt.startsAt) }} – {{ formatTime(appt.endsAt) }}
                  <template v-if="appt.price != null"> · {{ formatCurrency(appt.price) }}</template>
                </p>
                <div class="mt-1 flex gap-3 text-caption">
                  <RouterLink :to="`/clientes/${appt.client}`" class="text-primary-700 hover:underline">Ver cliente</RouterLink>
                  <RouterLink v-if="auth.role === 'THERAPIST'" :to="`/clientes/${appt.client}#prontuario`" class="text-primary-700 hover:underline">
                    Abrir prontuário
                  </RouterLink>
                </div>
              </div>

              <AppointmentActions :appointment="appt" :role="auth.role" :busy="pendingActionId === appt.id || requestingId === appt.id"
                @edit="editingId = appt.id" @confirm="changeStatus(appt.id, 'confirm')" @reopen="changeStatus(appt.id, 'reopen')"
                @cancel="cancelTargetId = appt.id" @request-confirmation="requestConfirmation(appt)" @start="startSession(appt)" />
            </div>
          </li>
        </ul>
      </div>
    </div>

    <section class="mt-8">
      <h2 class="font-display text-h5 text-text">Disponibilidade</h2>
      <p class="mt-1 text-body-sm text-text-muted">Horários livres pra atendimento. Bloqueie um horário sem excluí-lo se precisar se ausentar.</p>

      <p v-if="availabilityError" role="alert" class="mt-4 rounded-md bg-error-bg px-4 py-3 text-body-sm text-error">
        {{ availabilityError }}
      </p>

      <div v-else-if="availabilityShowLoading" class="mt-4 space-y-2" aria-busy="true">
        <Skeleton v-for="n in 3" :key="n" variant="card" />
      </div>

      <template v-else>
        <AvailabilityList
          :slots="slots"
          :pending-id="removingId"
          :submit-slot="addSlotFromColumn"
          :saving="savingSlot"
          class="mt-4"
          @remove="removeSlot"
          @toggle-block="toggleBlock"
        />

        <form
          class="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4"
          novalidate
          @submit.prevent="handleAddSlot"
        >
          <div>
            <label for="slot-date" class="mb-1 block text-label uppercase tracking-label text-text-muted">Data</label>
            <input
              id="slot-date"
              v-model="newSlot.date"
              type="date"
              required
              class="h-10 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
            />
          </div>
          <div>
            <label for="slot-start" class="mb-1 block text-label uppercase tracking-label text-text-muted">Início</label>
            <input
              id="slot-start"
              v-model="newSlot.startTime"
              type="time"
              required
              class="h-10 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
            />
          </div>
          <div>
            <label for="slot-end" class="mb-1 block text-label uppercase tracking-label text-text-muted">Fim</label>
            <input
              id="slot-end"
              v-model="newSlot.endTime"
              type="time"
              required
              class="h-10 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
            />
          </div>
          <Button type="submit" size="md" :loading="savingSlot">Adicionar horário</Button>
        </form>

        <p v-if="newSlotError" role="alert" class="mt-2 text-body-sm text-error">{{ newSlotError }}</p>
      </template>
    </section>

    <ConfirmDialog
      :open="cancelTargetId !== null"
      title="Cancelar consulta"
      description="Essa ação não pode ser desfeita."
      confirm-label="Cancelar consulta"
      @update:open="(v) => { if (!v) cancelTargetId = null; }"
      @confirm="handleCancelConfirmed"
    />
  </div>
</template>
