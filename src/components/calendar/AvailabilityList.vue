<script setup lang="ts">
import { computed } from 'vue';
import { Trash2 } from '@lucide/vue';
import type { AvailabilitySlot } from '@/types/availability';
import { formatDateTime, formatTime } from '@/lib/datetime';
import Badge from '@/components/ui/Badge.vue';

const props = defineProps<{
  slots: AvailabilitySlot[];
  pendingId: string | null;
}>();

const emit = defineEmits<{ remove: [id: string]; toggleBlock: [id: string, isBlocked: boolean] }>();

const sortedSlots = computed(() => [...props.slots].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
</script>

<template>
  <ul v-if="sortedSlots.length" class="space-y-2">
    <li
      v-for="slot in sortedSlots"
      :key="slot.id"
      class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3"
    >
      <div class="flex items-center gap-3">
        <span class="text-body-sm text-text">{{ formatDateTime(slot.startsAt) }} – {{ formatTime(slot.endsAt) }}</span>
        <Badge :variant="slot.isBlocked ? 'neutral' : 'success'" size="sm">
          {{ slot.isBlocked ? 'Bloqueado' : 'Livre' }}
        </Badge>
      </div>
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="text-body-sm text-primary-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="pendingId === slot.id"
          @click="emit('toggleBlock', slot.id, !slot.isBlocked)"
        >
          {{ slot.isBlocked ? 'Desbloquear' : 'Bloquear' }}
        </button>
        <button
          type="button"
          class="text-text-muted transition-colors hover:text-error disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="pendingId === slot.id"
          aria-label="Remover horário"
          @click="emit('remove', slot.id)"
        >
          <Trash2 :size="16" aria-hidden="true" />
        </button>
      </div>
    </li>
  </ul>
  <p v-else class="text-body-sm text-text-muted">Nenhum horário de disponibilidade cadastrado.</p>
</template>
