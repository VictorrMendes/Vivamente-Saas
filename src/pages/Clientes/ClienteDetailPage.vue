<script setup lang="ts">
defineProps<{ id: string }>();
</script>

<template>
  <div>
    <h1 class="font-display text-h3 text-text">Cliente #{{ id }}</h1>
    <p class="mt-2 text-body text-text-muted">Informações, agendamentos e histórico chegam no próximo step.</p>
  </div>
</template>
