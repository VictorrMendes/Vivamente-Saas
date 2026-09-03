<script setup lang="ts">
import { computed } from 'vue';
import { Trash2 } from '@lucide/vue';
import { WEEKDAYS, type AvailabilitySlot } from '@/types/availability';

const props = defineProps<{
  slots: AvailabilitySlot[];
  removingId: string | null;
}>();

const emit = defineEmits<{ remove: [id: string] }>();

const slotsByWeekday = computed(() => {
  const map: AvailabilitySlot[][] = Array.from({ length: 7 }, () => []);
  for (const slot of props.slots) {
    map[slot.weekday]?.push(slot);
  }
  for (const day of map) day.sort((a, b) => a.startTime.localeCompare(b.startTime));
  return map;
});
</script>

<template>
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
    <div v-for="(day, index) in WEEKDAYS" :key="day" class="rounded-lg border border-border bg-surface p-3">
      <h3 class="mb-2 text-label uppercase tracking-label text-text-muted">{{ day }}</h3>

      <p v-if="slotsByWeekday[index].length === 0" class="text-caption text-text-muted">Sem horários</p>

      <ul v-else class="space-y-2">
        <li
          v-for="slot in slotsByWeekday[index]"
          :key="slot.id"
          class="flex items-center justify-between gap-2 rounded-md bg-surface-sunken px-2 py-1.5 text-body-sm text-text"
        >
          <span>{{ slot.startTime }}–{{ slot.endTime }}</span>
          <button
            type="button"
            class="text-text-muted transition-colors hover:text-error disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="removingId === slot.id"
            :aria-label="`Remover horário de ${day} das ${slot.startTime} às ${slot.endTime}`"
            @click="emit('remove', slot.id)"
          >
            <Trash2 :size="14" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
