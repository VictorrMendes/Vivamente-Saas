<script setup lang="ts">
import { Settings } from '@lucide/vue';
import ModuleBanner from '@/components/layout/ModuleBanner.vue';
</script>

<template>
  <div>
    <ModuleBanner :icon="Settings" title="Configurações" subtitle="Preferências da sua conta." />
    <p class="mt-6 text-body text-text-muted">Edição de perfil e preferências chega no próximo step.</p>
  </div>
</template>
