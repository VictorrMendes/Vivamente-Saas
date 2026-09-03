<script setup lang="ts">
import type { ActivityItem } from '@/types/dashboard';
import { formatDateTime } from '@/lib/datetime';

defineProps<{ items: ActivityItem[] }>();
</script>

<template>
  <div class="rounded-lg border border-border bg-surface p-4">
    <h2 class="mb-3 font-display text-h6 text-text">Atividades recentes</h2>
    <p v-if="items.length === 0" class="text-body-sm text-text-muted">Nenhuma atividade recente.</p>
    <ul v-else class="space-y-3">
      <li v-for="item in items" :key="item.id" class="flex items-start justify-between gap-4 text-body-sm">
        <span class="text-text">{{ item.description }}</span>
        <span class="shrink-0 text-caption text-text-muted">{{ formatDateTime(item.occurredAt) }}</span>
      </li>
    </ul>
  </div>
</template>
