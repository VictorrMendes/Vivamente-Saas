<script setup lang="ts">
import { RouterLink } from 'vue-router';
import type { LucideIcon } from '@lucide/vue';
import Badge from '@/components/ui/Badge.vue';

defineProps<{
  items: Array<{ to: string; label: string; icon: LucideIcon; number: string; comingSoon?: boolean }>;
}>();

const emit = defineEmits<{ navigate: [] }>();
</script>

<template>
  <nav class="flex-1 space-y-1 px-3 py-4" aria-label="Navegação principal">
    <RouterLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-body-sm text-primary-200 transition-colors hover:bg-primary-800 hover:text-text-inverse"
      active-class="bg-primary-700 font-medium text-text-inverse hover:bg-primary-700 hover:text-text-inverse"
      @click="emit('navigate')"
    >
      <component :is="item.icon" :size="18" aria-hidden="true" />
      <span class="flex-1 truncate">{{ item.label }}</span>
      <Badge v-if="item.comingSoon" variant="secondary" size="sm">Em breve</Badge>
      <span v-else class="text-caption text-primary-400">{{ item.number }}</span>
    </RouterLink>
  </nav>
</template>
