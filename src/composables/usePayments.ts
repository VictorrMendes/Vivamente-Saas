import { ref } from 'vue';
import { backApi } from '@/services/api/client';
import type { ApiEnvelope, PaginatedEnvelope } from '@/types/api';
import type { NewPayment, Payment, PaymentStatus } from '@/types/payment';

// O Back serializa amount como string decimal, igual price em Services.
function parseAmount(payment: Payment): Payment {
  return { ...payment, amount: Number(payment.amount) };
}

function toWireAmount(payment: NewPayment) {
  return { ...payment, amount: payment.amount.toFixed(2) };
}

export function usePayments() {
  const payments = ref<Payment[]>([]);
  const loading = ref(false);
  const showLoading = ref(false);
  const error = ref<string | null>(null);
  const saving = ref(false);
  const saveError = ref<string | null>(null);
  const updatingId = ref<string | null>(null);
  const removingId = ref<string | null>(null);

  async function load() {
    loading.value = true;
    error.value = null;
    const delayTimer = setTimeout(() => {
      if (loading.value) showLoading.value = true;
    }, 300);

    try {
      const res = await backApi<PaginatedEnvelope<Payment>>('/api/v1/payments?per_page=100');
      payments.value = res.data.map(parseAmount);
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

  async function updateStatus(id: string, status: PaymentStatus) {
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

  async function remove(id: string) {
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
    load,
    create,
    updateStatus,
    remove,
  };
}
