import { ref } from 'vue';
import { backApi } from '@/services/api/client';
import type { ApiEnvelope } from '@/types/api';
import type { DashboardMetrics } from '@/types/dashboard';

// pending_payments.total e monthly_summary.received_total vêm como string decimal (Decimal serializado).
function parseMetrics(metrics: DashboardMetrics): DashboardMetrics {
  return {
    ...metrics,
    pendingPayments: { ...metrics.pendingPayments, total: Number(metrics.pendingPayments.total) },
    monthlySummary: { ...metrics.monthlySummary, receivedTotal: Number(metrics.monthlySummary.receivedTotal) },
  };
}

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
      metrics.value = parseMetrics(res.data);
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
