import { ref } from 'vue';
import { backApi } from '@/services/api/client';
import type { ApiEnvelope, PaginatedEnvelope } from '@/types/api';
import type { NewPayment, Payment, PaymentBalance, PaymentPatch, PaymentStatus } from '@/types/payment';

// O Back serializa amount como string decimal, igual price em Services.
function parseAmount(payment: Payment): Payment {
  return { ...payment, amount: Number(payment.amount) };
}

function toWireAmount<T extends { amount?: number }>(input: T) {
  return { ...input, amount: input.amount != null ? input.amount.toFixed(2) : undefined };
}

export function usePayments() {
  const payments = ref<Payment[]>([]);
  const loading = ref(false);
  const showLoading = ref(false);
  const error = ref<string | null>(null);
  const saving = ref(false);
  const saveError = ref<string | null>(null);
  const updatingId = ref<number | null>(null);
  const removingId = ref<number | null>(null);
  const balance = ref<PaymentBalance | null>(null);
  const balanceLoading = ref(false);
  const balanceError = ref<string | null>(null);
  const pagination = ref<PaginatedEnvelope<Payment>['pagination'] | null>(null);

  interface PaymentsQuery {
    page?: number;
    client?: number;
    status?: PaymentStatus;
  }

  // client/status são suportados pelo filterset_fields real do PaymentViewSet — vão na query, não são filtrados no front.
  async function load(params: PaymentsQuery = {}) {
    loading.value = true;
    error.value = null;
    const delayTimer = setTimeout(() => {
      if (loading.value) showLoading.value = true;
    }, 300);

    const query = new URLSearchParams({ page: String(params.page ?? 1), per_page: '10' });
    if (params.client) query.set('client', String(params.client));
    if (params.status) query.set('status', params.status);

    try {
      const res = await backApi<PaginatedEnvelope<Payment>>(`/api/v1/payments?${query}`);
      payments.value = res.data.map(parseAmount);
      pagination.value = res.pagination;
    } catch {
      error.value = 'Não foi possível carregar os pagamentos. Tente novamente em instantes.';
    } finally {
      clearTimeout(delayTimer);
      loading.value = false;
      showLoading.value = false;
    }
  }

  async function create(payment: NewPayment) {
    saveError.value = null;
    saving.value = true;
    try {
      const res = await backApi<ApiEnvelope<Payment>>('/api/v1/payments', {
        method: 'POST',
        body: JSON.stringify(toWireAmount(payment)),
      });
      payments.value.push(parseAmount(res.data));
      return true;
    } catch {
      saveError.value = 'Não foi possível salvar o pagamento. Tente novamente.';
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function updateStatus(id: number, status: PaymentStatus) {
    saveError.value = null;
    updatingId.value = id;
    try {
      const res = await backApi<ApiEnvelope<Payment>>(`/api/v1/payments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      const index = payments.value.findIndex((p) => p.id === id);
      if (index !== -1) payments.value[index] = parseAmount(res.data);
      return true;
    } catch {
      saveError.value = 'Não foi possível atualizar o status do pagamento. Tente novamente.';
      return false;
    } finally {
      updatingId.value = null;
    }
  }

  async function update(id: number, patch: PaymentPatch) {
    saveError.value = null;
    updatingId.value = id;
    try {
      const res = await backApi<ApiEnvelope<Payment>>(`/api/v1/payments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(toWireAmount(patch)),
      });
      const index = payments.value.findIndex((p) => p.id === id);
      if (index !== -1) payments.value[index] = parseAmount(res.data);
      return true;
    } catch {
      saveError.value = 'Não foi possível salvar o pagamento. Tente novamente.';
      return false;
    } finally {
      updatingId.value = null;
    }
  }

  async function loadBalance(month: string) {
    balanceError.value = null;
    balanceLoading.value = true;
    try {
      const res = await backApi<ApiEnvelope<PaymentBalance>>(`/api/v1/payments/balance?month=${month}`);
      balance.value = {
        ...res.data,
        receivedTotal: Number(res.data.receivedTotal),
        pendingTotal: Number(res.data.pendingTotal),
      };
    } catch {
      balanceError.value = 'Não foi possível carregar o resumo do mês.';
    } finally {
      balanceLoading.value = false;
    }
  }

  async function remove(id: number) {
    saveError.value = null;
    removingId.value = id;
    try {
      await backApi<void>(`/api/v1/payments/${id}`, { method: 'DELETE' });
      payments.value = payments.value.filter((p) => p.id !== id);
    } catch {
      saveError.value = 'Não foi possível excluir o pagamento. Tente novamente.';
    } finally {
      removingId.value = null;
    }
  }

  return {
    payments,
    loading,
    showLoading,
    error,
    saving,
    saveError,
    updatingId,
    removingId,
    balance,
    balanceLoading,
    balanceError,
    pagination,
    load,
    create,
    update,
    updateStatus,
    loadBalance,
    remove,
  };
}
