<script setup lang="ts">
import {
  AlertDialogRoot,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from 'reka-ui';
import Button from './Button.vue';

defineProps<{
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
}>();
const emit = defineEmits<{ 'update:open': [boolean]; confirm: [] }>();
</script>

<template>
  <AlertDialogRoot :open="open" @update:open="emit('update:open', $event)">
    <AlertDialogPortal>
      <AlertDialogOverlay class="fixed inset-0 z-40 bg-black/50" />
      <AlertDialogContent
        class="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface p-6 shadow-lg focus:outline-none"
      >
        <AlertDialogTitle class="font-display text-h6 text-text">{{ title }}</AlertDialogTitle>
        <AlertDialogDescription class="mt-2 text-body-sm text-text-muted">{{ description }}</AlertDialogDescription>
        <div class="mt-6 flex justify-end gap-2">
          <AlertDialogCancel as-child>
            <Button variant="ghost" size="sm">Cancelar</Button>
          </AlertDialogCancel>
          <AlertDialogAction as-child>
            <Button variant="destructive" size="sm" @click="emit('confirm')">{{ confirmLabel ?? 'Excluir' }}</Button>
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>
