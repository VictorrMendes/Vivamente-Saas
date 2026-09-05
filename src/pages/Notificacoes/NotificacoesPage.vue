<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useNotifications } from '@/composables/useNotifications';
import { formatDateTime } from '@/lib/datetime';
import Button from '@/components/ui/Button.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import Pagination from '@/components/ui/Pagination.vue';

const {
  notifications,
  pagination,
  showLoading,
  error,
  actionError,
  markingAllRead,
  markingId,
  load,
  markAsRead,
  markAllAsRead,
} = useNotifications();

const page = ref(1);
const hasUnread = computed(() => notifications.value.some((n) => !n.read));

function changePage(next: number) {
  page.value = next;
  load(next);
}

onMounted(() => load(page.value));
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-4">
      <h1 class="font-display text-h3 text-text">Notificações</h1>
      <Button variant="ghost" :disabled="!hasUnread" :loading="markingAllRead" @click="markAllAsRead">
        Marcar todas como lidas
      </Button>
    </div>

    <p v-if="actionError" role="alert" class="mt-4 rounded-md bg-error-bg px-4 py-3 text-body-sm text-error">
      {{ actionError }}
    </p>

    <p v-if="error" role="alert" class="mt-4 rounded-md bg-error-bg px-4 py-3 text-body-sm text-error">
      {{ error }}
    </p>

    <div v-else-if="showLoading" class="mt-4 space-y-3" aria-busy="true">
      <Skeleton v-for="n in 5" :key="n" variant="card" />
    </div>

    <template v-else>
      <p v-if="notifications.length === 0" class="mt-6 text-body-sm text-text-muted">Nenhuma notificação por aqui.</p>

      <ul v-else class="mt-4 space-y-2">
        <li
          v-for="notification in notifications"
          :key="notification.id"
          class="flex items-start justify-between gap-4 rounded-lg border border-border p-4"
          :class="notification.read ? 'bg-surface' : 'bg-surface-sunken'"
        >
          <div class="flex items-start gap-3">
            <span
              v-if="!notification.read"
              class="mt-1.5 h-2 w-2 shrink-0 rounded-pill bg-primary-600"
              aria-hidden="true"
            />
            <div>
              <p class="text-body-sm font-medium text-text">{{ notification.title }}</p>
              <p class="text-body-sm text-text-muted">{{ notification.message }}</p>
              <p class="mt-1 text-caption text-text-muted">{{ formatDateTime(notification.createdAt) }}</p>
            </div>
          </div>

          <button
            v-if="!notification.read"
            type="button"
            class="shrink-0 text-body-sm text-primary-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="markingId === notification.id"
            @click="markAsRead(notification.id)"
          >
            Marcar como lida
          </button>
        </li>
      </ul>

      <Pagination v-if="pagination" :page="pagination.page" :total-pages="pagination.total_pages" @change="changePage" />
    </template>
  </div>
</template>
