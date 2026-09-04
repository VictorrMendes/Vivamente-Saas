<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { Calendar } from 'v-calendar';
import 'v-calendar/style.css';
import { useAppointments } from '@/composables/useAppointments';
import { useAvailability } from '@/composables/useAvailability';
import { formatTime, toDateOnly } from '@/lib/datetime';
import type { Appointment } from '@/types/appointment';
import { WEEKDAYS } from '@/types/availability';
import { APPOINTMENT_STATUS_LABEL as STATUS_LABEL, APPOINTMENT_STATUS_VARIANT as STATUS_VARIANT } from '@/constants/appointmentStatus';
import Button from '@/components/ui/Button.vue';
import Badge from '@/components/ui/Badge.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import AvailabilityCalendar from '@/components/calendar/AvailabilityCalendar.vue';

const { appointments, showLoading, error, actionError, pendingActionId, load, updateStatus } = useAppointments();
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
} = useAvailability();

const today = new Date();
const selectedDate = ref(toDateOnly(today));

onMounted(() => {
  load(today);
  loadAvailability();
});

const newSlot = reactive({ weekday: 1, startTime: '09:00', endTime: '12:00' });
const newSlotError = ref<string | null>(null);

async function handleAddSlot() {
  newSlotError.value = null;
  if (newSlot.endTime <= newSlot.startTime) {
    newSlotError.value = 'O horário final precisa ser depois do inicial.';
    return;
  }
  await createSlot({ ...newSlot });
}

const appointmentsByDate = computed(() => {
  const map = new Map<string, Appointment[]>();
  for (const appt of appointments.value) {
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

function handleCancel(id: string) {
  // ponytail: confirm() nativo em vez do Dialog estilizado do design system —
  // trocar quando o componente Modal/Dialog existir (várias telas vão precisar).
  if (window.confirm('Cancelar este agendamento? Essa ação não pode ser desfeita.')) {
    updateStatus(id, 'cancel');
  }
}
</script>

<template>
  <div>
    <h1 class="font-display text-h3 text-text">Agenda</h1>

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
        expanded
        borderless
        transparent
        title-position="left"
        @dayclick="onDayClick"
      />

      <div class="rounded-lg border border-border bg-surface p-4">
        <h2 class="mb-1 font-display text-h6 text-text">
          {{ new Date(`${selectedDate}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) }}
        </h2>

        <p v-if="actionError" role="alert" class="mt-2 rounded-md bg-error-bg px-3 py-2 text-body-sm text-error">
          {{ actionError }}
        </p>

        <p v-if="selectedDayAppointments.length === 0" class="mt-3 text-body-sm text-text-muted">
          Nenhum agendamento neste dia.
        </p>

        <ul v-else class="mt-3 divide-y divide-border">
          <li v-for="appt in selectedDayAppointments" :key="appt.id" class="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p class="text-body-sm font-medium text-text">{{ appt.clientName }} — {{ appt.serviceName }}</p>
              <p class="text-caption text-text-muted">{{ formatTime(appt.startsAt) }} – {{ formatTime(appt.endsAt) }}</p>
            </div>

            <div class="flex items-center gap-2">
              <Badge :variant="STATUS_VARIANT[appt.status]" size="sm">{{ STATUS_LABEL[appt.status] }}</Badge>

              <Button
                v-if="appt.status === 'pending'"
                size="sm"
                variant="primary"
                :loading="pendingActionId === appt.id"
                @click="updateStatus(appt.id, 'confirm')"
              >
                Confirmar
              </Button>
              <Button
                v-if="appt.status === 'confirmed'"
                size="sm"
                variant="primary"
                :loading="pendingActionId === appt.id"
                @click="updateStatus(appt.id, 'complete')"
              >
                Concluir
              </Button>
              <Button
                v-if="appt.status === 'pending' || appt.status === 'confirmed'"
                size="sm"
                variant="ghost"
                :loading="pendingActionId === appt.id"
                @click="handleCancel(appt.id)"
              >
                Cancelar
              </Button>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <section class="mt-8">
      <h2 class="font-display text-h5 text-text">Disponibilidade</h2>
      <p class="mt-1 text-body-sm text-text-muted">Horários recorrentes em que você atende, por dia da semana.</p>

      <p v-if="availabilityError" role="alert" class="mt-4 rounded-md bg-error-bg px-4 py-3 text-body-sm text-error">
        {{ availabilityError }}
      </p>

      <div v-else-if="availabilityShowLoading" class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7" aria-busy="true">
        <Skeleton v-for="n in 7" :key="n" variant="card" />
      </div>

      <template v-else>
        <AvailabilityCalendar :slots="slots" :removing-id="removingId" class="mt-4" @remove="removeSlot" />

        <form
          class="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4"
          novalidate
          @submit.prevent="handleAddSlot"
        >
          <div>
            <label for="slot-weekday" class="mb-1 block text-label uppercase tracking-label text-text-muted">Dia</label>
            <select
              id="slot-weekday"
              v-model.number="newSlot.weekday"
              class="h-10 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
            >
              <option v-for="(day, index) in WEEKDAYS" :key="day" :value="index">{{ day }}</option>
            </select>
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

        <p v-if="newSlotError || slotError" role="alert" class="mt-2 text-body-sm text-error">
          {{ newSlotError || slotError }}
        </p>
      </template>
    </section>
  </div>
</template>
