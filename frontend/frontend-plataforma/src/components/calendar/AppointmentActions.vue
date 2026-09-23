<script setup lang="ts">
import type { Appointment } from '@/types/appointment';
import type { UserRole } from '@/types/auth';
import { APPOINTMENT_STATUS_LABEL, APPOINTMENT_STATUS_VARIANT } from '@/constants/appointmentStatus';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
defineProps<{ appointment: Appointment; role: UserRole | null; busy?: boolean }>();
const emit = defineEmits<{ edit: []; start: []; confirm: []; cancel: []; reopen: []; requestConfirmation: [] }>();
function closeMenu(event: Event) {
  (event.currentTarget as HTMLElement).closest('details')?.removeAttribute('open');
}
</script>
<template>
  <div class="flex flex-wrap items-center gap-2">
    <Badge :variant="APPOINTMENT_STATUS_VARIANT[appointment.status]" size="sm">{{ APPOINTMENT_STATUS_LABEL[appointment.status] }}</Badge>
    <Button v-if="['PENDING', 'CONFIRMED'].includes(appointment.status)" size="sm" variant="ghost" :disabled="busy" @click="emit('edit')">Editar</Button>
    <Button v-if="role === 'THERAPIST' && ['CONFIRMED', 'IN_PROGRESS'].includes(appointment.status)"
      size="sm" :loading="busy" :disabled="busy" @click="emit('start')">
      {{ appointment.status === 'IN_PROGRESS' ? 'Retomar consulta' : 'Iniciar consulta' }}
    </Button>
    <details v-if="['PENDING', 'CONFIRMED', 'CANCELLED', 'DECLINED'].includes(appointment.status)" class="relative">
      <summary class="cursor-pointer list-none rounded-lg px-3 py-2 text-body-sm text-text hover:bg-surface-sunken" aria-label="Ações da consulta">•••</summary>
      <div class="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-border bg-surface p-2 shadow-lg">
        <button v-if="appointment.status === 'PENDING'" type="button" :disabled="busy"
          class="w-full rounded-lg px-3 py-2 text-left text-body-sm text-text hover:bg-surface-sunken"
          @click="emit('requestConfirmation'); closeMenu($event)">Solicitar confirmação</button>
        <button v-if="appointment.status === 'PENDING'" type="button" :disabled="busy"
          class="w-full rounded-lg px-3 py-2 text-left text-body-sm text-text hover:bg-surface-sunken"
          @click="emit('confirm'); closeMenu($event)">Registrar confirmação manual</button>
        <!-- O paciente pode mudar de ideia: confirmada volta a pendente; cancelada/recusada é reaberta. -->
        <button v-if="appointment.status !== 'PENDING'" type="button" :disabled="busy"
          class="w-full rounded-lg px-3 py-2 text-left text-body-sm text-text hover:bg-surface-sunken"
          @click="emit('reopen'); closeMenu($event)">{{ appointment.status === 'CONFIRMED' ? 'Voltar para pendente' : 'Reabrir como pendente' }}</button>
        <button v-if="['CANCELLED', 'DECLINED'].includes(appointment.status)" type="button" :disabled="busy"
          class="w-full rounded-lg px-3 py-2 text-left text-body-sm text-text hover:bg-surface-sunken"
          @click="emit('confirm'); closeMenu($event)">Reabrir como confirmada</button>
        <button v-if="['PENDING', 'CONFIRMED'].includes(appointment.status)" type="button" :disabled="busy"
          class="w-full rounded-lg px-3 py-2 text-left text-body-sm text-error hover:bg-surface-sunken"
          @click="emit('cancel'); closeMenu($event)">Cancelar consulta</button>
      </div>
    </details>
  </div>
</template>
