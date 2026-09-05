import { ref } from 'vue';
import { backApi } from '@/services/api/client';
import type { PaginatedEnvelope } from '@/types/api';
import type { Notification } from '@/types/notification';

export function useNotifications() {
  const notifications = ref<Notification[]>([]);
  const pagination = ref<PaginatedEnvelope<Notification>['pagination'] | null>(null);
  const loading = ref(false);
  const showLoading = ref(false);
  const error = ref<string | null>(null);
  const actionError = ref<string | null>(null);
  const markingAllRead = ref(false);
  const markingId = ref<string | null>(null);

  async function load(page = 1) {
    loading.value = true;
    error.value = null;
    const delayTimer = setTimeout(() => {
      if (loading.value) showLoading.value = true;
    }, 300);

    try {
      const res = await backApi<PaginatedEnvelope<Notification>>(`/api/v1/notifications?page=${page}&per_page=10`);
      notifications.value = res.data;
      pagination.value = res.pagination;
    } catch {
      error.value = 'Não foi possível carregar as notificações. Tente novamente em instantes.';
    } finally {
      clearTimeout(delayTimer);
      loading.value = false;
      showLoading.value = false;
    }
  }

  async function markAsRead(id: string) {
    actionError.value = null;
    markingId.value = id;
    try {
      await backApi<void>(`/api/v1/notifications/${id}/read`, { method: 'PATCH' });
      const target = notifications.value.find((n) => n.id === id);
      if (target) target.read = true;
    } catch {
      actionError.value = 'Não foi possível marcar como lida. Tente novamente.';
    } finally {
      markingId.value = null;
    }
  }

  async function markAllAsRead() {
    actionError.value = null;
    markingAllRead.value = true;
    try {
      await backApi<void>('/api/v1/notifications/read-all', { method: 'PATCH' });
      notifications.value.forEach((n) => {
        n.read = true;
      });
    } catch {
      actionError.value = 'Não foi possível marcar todas como lidas. Tente novamente.';
    } finally {
      markingAllRead.value = false;
    }
  }

  return {
    notifications,
    pagination,
    loading,
    showLoading,
    error,
    actionError,
    markingAllRead,
    markingId,
    load,
    markAsRead,
    markAllAsRead,
  };
}
