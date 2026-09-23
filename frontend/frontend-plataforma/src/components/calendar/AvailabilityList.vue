<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { Check, Lock, LockOpen, Plus, Trash2, X } from '@lucide/vue';
import type { AvailabilitySlot } from '@/types/availability';
import { formatTime, toDateOnly } from '@/lib/datetime';

export interface QuickSlot { date: string; startTime: string; endTime: string }

const props = defineProps<{
  slots: AvailabilitySlot[];
  pendingId: number | null;
  /** Cria o horário; resolve true se salvou (aí o mini-formulário fecha). */
  submitSlot?: (slot: QuickSlot) => Promise<boolean>;
  saving?: boolean;
}>();

const emit = defineEmits<{ remove: [id: number]; toggleBlock: [id: number, isBlocked: boolean] }>();

// Kanban por dia: uma coluna por data (horário local), horários em ordem
// dentro dela. Com muitos horários a página cresce pro lado (rolagem
// horizontal), não numa lista vertical gigante.
// A duração é do terapeuta: nada aqui trava em 50 min. Os atalhos só
// preenchem o "Fim"; o campo continua editável pra qualquer duração.
const DURATION_SHORTCUTS = [30, 45, 50, 60, 90];

function toMinutes(time: string) {
  const [h = 0, m = 0] = time.split(':').map(Number);
  return h * 60 + m;
}
function fromMinutes(total: number) {
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
function clockOf(iso: string) {
  const d = new Date(iso);
  return fromMinutes(d.getHours() * 60 + d.getMinutes());
}

const addingDate = ref<string | null>(null);
const draft = reactive({ startTime: '09:00', endTime: '09:50' });
const draftError = ref('');
const draftDuration = computed(() => toMinutes(draft.endTime) - toMinutes(draft.startTime));

// Sugere começar quando o último horário do dia termina, com a mesma duração
// dele (o padrão do próprio terapeuta); dia vazio cai em 09:00, 50 min.
function openAdd(day: { date: string; slots: AvailabilitySlot[] }) {
  const last = day.slots[day.slots.length - 1];
  const lastEnd = last ? toMinutes(clockOf(last.endsAt)) : 9 * 60;
  const length = last ? toMinutes(clockOf(last.endsAt)) - toMinutes(clockOf(last.startsAt)) : 50;
  draft.startTime = fromMinutes(Math.min(lastEnd, 23 * 60));
  draft.endTime = fromMinutes(Math.min(toMinutes(draft.startTime) + Math.max(length, 5), 23 * 60 + 59));
  draftError.value = '';
  addingDate.value = day.date;
}
function applyDuration(minutes: number) {
  draft.endTime = fromMinutes(Math.min(toMinutes(draft.startTime) + minutes, 23 * 60 + 59));
}
async function saveDraft() {
  if (!addingDate.value || !props.submitSlot) return;
  if (toMinutes(draft.endTime) <= toMinutes(draft.startTime)) {
    draftError.value = 'O fim precisa ser depois do início.';
    return;
  }
  draftError.value = '';
  if (await props.submitSlot({ date: addingDate.value, startTime: draft.startTime, endTime: draft.endTime })) {
    addingDate.value = null;
  }
}

const days = computed(() => {
  const byDay = new Map<string, AvailabilitySlot[]>();
  for (const slot of [...props.slots].sort((a, b) => a.startsAt.localeCompare(b.startsAt))) {
    const key = toDateOnly(new Date(slot.startsAt));
    byDay.set(key, [...(byDay.get(key) ?? []), slot]);
  }
  const today = toDateOnly(new Date());
  return [...byDay.entries()].map(([date, slots]) => {
    const day = new Date(`${date}T00:00:00`);
    return {
      date,
      isToday: date === today,
      weekday: day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
      label: day.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      free: slots.filter((slot) => !slot.isBlocked).length,
      blocked: slots.filter((slot) => slot.isBlocked).length,
      slots,
    };
  });
});
</script>

<template>
  <div v-if="days.length" class="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-3" role="list" aria-label="Disponibilidade por dia">
    <section
      v-for="day in days"
      :key="day.date"
      role="listitem"
      class="flex min-w-[11.5rem] flex-1 snap-start flex-col rounded-xl border bg-surface-sunken"
      :class="day.isToday ? 'border-primary-600' : 'border-border'"
      :aria-label="`${day.weekday} ${day.label}`"
    >
      <header class="relative border-b border-border px-3 py-2">
        <button
          v-if="submitSlot"
          type="button"
          class="absolute right-2 top-2 rounded-full border border-border bg-surface p-1 text-primary-700 transition-colors hover:border-primary-600 hover:bg-primary-600 hover:text-text-inverse"
          :aria-label="`Adicionar horário em ${day.label}`"
          :title="`Adicionar horário em ${day.label}`"
          @click="addingDate === day.date ? (addingDate = null) : openAdd(day)"
        >
          <Plus :size="14" aria-hidden="true" />
        </button>
        <p class="text-label uppercase tracking-label" :class="day.isToday ? 'text-primary-700' : 'text-text-muted'">
          {{ day.isToday ? 'Hoje' : day.weekday }}
        </p>
        <p class="font-display text-h6 text-text">{{ day.label }}</p>
        <p class="text-caption text-text-muted">
          {{ day.free }} livre{{ day.free === 1 ? '' : 's' }}<template v-if="day.blocked"> · {{ day.blocked }} bloqueado{{ day.blocked === 1 ? '' : 's' }}</template>
        </p>
      </header>
      <form
        v-if="addingDate === day.date"
        class="space-y-2 border-b border-border bg-surface p-2"
        novalidate
        @submit.prevent="saveDraft"
      >
        <div class="grid grid-cols-2 gap-2">
          <label class="text-caption text-text-muted">Início
            <input v-model="draft.startTime" type="time" required class="mt-0.5 h-9 w-full rounded-md border border-border bg-surface px-2 text-body-sm text-text focus-visible:border-primary-600" />
          </label>
          <label class="text-caption text-text-muted">Fim
            <input v-model="draft.endTime" type="time" required class="mt-0.5 h-9 w-full rounded-md border border-border bg-surface px-2 text-body-sm text-text focus-visible:border-primary-600" />
          </label>
        </div>
        <div class="flex flex-wrap gap-1" role="group" aria-label="Duração do horário">
          <button
            v-for="minutes in DURATION_SHORTCUTS"
            :key="minutes"
            type="button"
            class="rounded-pill border px-2 py-0.5 text-caption transition-colors"
            :class="draftDuration === minutes ? 'border-primary-600 bg-primary-600 text-text-inverse' : 'border-border text-text-muted hover:text-text'"
            @click="applyDuration(minutes)"
          >
            {{ minutes }} min
          </button>
        </div>
        <p v-if="draftDuration > 0" class="text-caption text-text-muted">Duração: {{ draftDuration }} min</p>
        <p v-if="draftError" role="alert" class="text-caption text-error">{{ draftError }}</p>
        <div class="flex justify-end gap-1">
          <button type="button" class="rounded p-1.5 text-text-muted hover:text-text" aria-label="Cancelar" @click="addingDate = null">
            <X :size="16" aria-hidden="true" />
          </button>
          <button type="submit" class="rounded bg-primary-600 p-1.5 text-text-inverse hover:bg-primary-700 disabled:opacity-50" aria-label="Salvar horário" :disabled="saving">
            <Check :size="16" aria-hidden="true" />
          </button>
        </div>
      </form>
      <ul class="max-h-72 space-y-2 overflow-y-auto p-2">
        <li
          v-for="slot in day.slots"
          :key="slot.id"
          class="flex items-center justify-between gap-1 rounded-lg border bg-surface px-2 py-1.5"
          :class="slot.isBlocked ? 'border-border opacity-70' : 'border-success'"
        >
          <span class="whitespace-nowrap text-body-sm tabular-nums" :class="slot.isBlocked ? 'text-text-muted line-through' : 'text-text'">
            {{ formatTime(slot.startsAt) }}–{{ formatTime(slot.endsAt) }}
          </span>
          <span class="flex shrink-0 items-center">
            <button
              type="button"
              class="rounded p-1 text-text-muted transition-colors hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="pendingId === slot.id"
              :aria-label="slot.isBlocked ? 'Desbloquear horário' : 'Bloquear horário'"
              :title="slot.isBlocked ? 'Desbloquear' : 'Bloquear'"
              @click="emit('toggleBlock', slot.id, !slot.isBlocked)"
            >
              <LockOpen v-if="slot.isBlocked" :size="15" aria-hidden="true" />
              <Lock v-else :size="15" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="rounded p-1 text-text-muted transition-colors hover:text-error disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="pendingId === slot.id"
              aria-label="Remover horário"
              title="Remover"
              @click="emit('remove', slot.id)"
            >
              <Trash2 :size="15" aria-hidden="true" />
            </button>
          </span>
        </li>
      </ul>
    </section>
  </div>
  <p v-else class="text-body-sm text-text-muted">Nenhum horário de disponibilidade cadastrado.</p>
</template>
