<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Calendar } from 'v-calendar';
import 'v-calendar/style.css';
import { useAppointments } from '@/composables/useAppointments';
import { formatTime, toDateOnly } from '@/lib/datetime';
import type { Appointment, AppointmentStatus } from '@/types/appointment';
import Button from '@/components/ui/Button.vue';
import Badge from '@/components/ui/Badge.vue';
import Skeleton from '@/components/ui/Skeleton.vue';

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

const STATUS_VARIANT: Record<AppointmentStatus, 'warning' | 'primary' | 'success' | 'neutral'> = {
  pending: 'warning',
  confirmed: 'primary',
  completed: 'success',
  cancelled: 'neutral',
};

const { appointments, showLoading, error, actionError, pendingActionId, load, updateStatus } = useAppointments();

const today = new Date();
const selectedDate = ref(toDateOnly(today));

onMounted(() => load(today));

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
  </div>
</template>
