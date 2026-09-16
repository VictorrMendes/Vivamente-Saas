<script setup lang="ts">
defineProps<{ page: number; totalPages: number }>();
const emit = defineEmits<{ change: [page: number] }>();
</script>

<template>
  <nav v-if="totalPages > 1" aria-label="Paginação" class="mt-4 flex items-center justify-between">
    <button
      type="button"
      class="rounded-md px-3 py-1.5 text-body-sm text-text-muted transition-colors hover:bg-surface-sunken hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
      :disabled="page <= 1"
      @click="emit('change', page - 1)"
    >
      Anterior
    </button>
    <span class="text-body-sm text-text-muted" aria-current="page">{{ page }} de {{ totalPages }}</span>
    <button
      type="button"
      class="rounded-md px-3 py-1.5 text-body-sm text-text-muted transition-colors hover:bg-surface-sunken hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
      :disabled="page >= totalPages"
      @click="emit('change', page + 1)"
    >
      Próxima
    </button>
  </nav>
</template>
