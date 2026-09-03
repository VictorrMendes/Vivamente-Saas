import { ref } from 'vue';
import { backApi } from '@/services/api/client';
import type { ApiEnvelope } from '@/types/api';
import type { DashboardMetrics } from '@/types/dashboard';

export function useDashboard() {
  const metrics = ref<DashboardMetrics | null>(null);
  const loading = ref(false);
  // Loading só aparece após 300ms, pra não piscar em respostas rápidas (components.md).
  const showLoading = ref(false);
  const error = ref<string | null>(null);

  async function load() {
    loading.value = true;
    error.value = null;
    const delayTimer = setTimeout(() => {
      if (loading.value) showLoading.value = true;
    }, 300);

    try {
      const res = await backApi<ApiEnvelope<DashboardMetrics>>('/api/v1/dashboard/metrics');
      metrics.value = res.data;
    } catch {
      error.value = 'Não foi possível carregar o dashboard. Tente novamente em instantes.';
    } finally {
      clearTimeout(delayTimer);
      loading.value = false;
      showLoading.value = false;
    }
  }

  return { metrics, loading, showLoading, error, load };
}
