<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { Wallet } from '@lucide/vue';
import { usePayments } from '@/composables/usePayments';
import { backApi } from '@/services/api/client';
import { formatCurrency } from '@/lib/currency';
import { PAYMENT_STATUS_LABEL, PAYMENT_STATUS_VARIANT } from '@/constants/paymentStatus';
import type { PaginatedEnvelope } from '@/types/api';
import type { Client } from '@/types/client';
import type { NewPayment } from '@/types/payment';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import ModuleBanner from '@/components/layout/ModuleBanner.vue';

const { payments, showLoading, error, saving, saveError, updatingId, removingId, load, create, updateStatus, remove } =
  usePayments();

const clients = ref<Client[]>([]);
const clientName = computed(() => {
  const map = new Map(clients.value.map((c) => [c.id, c.name]));
  return (id: string) => map.get(id) ?? id;
});

async function loadClients() {
  const res = await backApi<PaginatedEnvelope<Client>>('/api/v1/clients?per_page=100');
  clients.value = res.data;
}

const showNewForm = ref(false);
const newPayment = reactive({ client: '', amount: 0, dueDate: '' });

async function handleCreate() {
  const payload: NewPayment = {
    client: newPayment.client,
    amount: Number(newPayment.amount),
    dueDate: newPayment.dueDate,
  };
  const ok = await create(payload);
  if (ok) {
    showNewForm.value = false;
    Object.assign(newPayment, { client: '', amount: 0, dueDate: '' });
  }
}

function handleDelete(id: string) {
  // ponytail: confirm() nativo — mesmo padrão já usado em Agenda/Leads/Clientes/Serviços/Pacotes.
  if (window.confirm('Excluir este pagamento? Essa ação não pode ser desfeita.')) {
    remove(id);
  }
}

onMounted(() => {
  load();
  loadClients();
});
</script>

<template>
  <div>
    <ModuleBanner :icon="Wallet" title="Financeiro" subtitle="Lançamentos e status de pagamento por cliente." />

    <div class="mt-6 flex justify-end">
      <Button variant="primary" @click="showNewForm = !showNewForm">
        {{ showNewForm ? 'Cancelar' : '+ Novo pagamento' }}
      </Button>
    </div>

    <form
      v-if="showNewForm"
      class="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4"
      novalidate
      @submit.prevent="handleCreate"
    >
      <div>
        <label for="pay-client" class="mb-1 block text-label uppercase tracking-label text-text-muted">Cliente</label>
        <select
          id="pay-client"
          v-model="newPayment.client"
          required
          class="h-10 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
        >
          <option value="" disabled>Selecione…</option>
          <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
      <div>
        <label for="pay-amount" class="mb-1 block text-label uppercase tracking-label text-text-muted">Valor</label>
        <input
          id="pay-amount"
          v-model.number="newPayment.amount"
          type="number"
          min="0"
          step="0.01"
          required
          class="h-10 w-32 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
        />
      </div>
      <div>
        <label for="pay-due" class="mb-1 block text-label uppercase tracking-label text-text-muted">Vencimento</label>
        <input
          id="pay-due"
          v-model="newPayment.dueDate"
          type="date"
          required
          class="h-10 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
        />
      </div>
      <Button type="submit" :loading="saving">Salvar</Button>
    </form>
    <p v-if="saveError" role="alert" class="mt-2 text-body-sm text-error">{{ saveError }}</p>

    <p v-if="error" role="alert" class="mt-4 rounded-md bg-error-bg px-4 py-3 text-body-sm text-error">
      {{ error }}
    </p>

    <div v-else-if="showLoading" class="mt-4 space-y-3" aria-busy="true">
      <Skeleton v-for="n in 4" :key="n" variant="card" />
    </div>

    <template v-else>
      <p v-if="payments.length === 0" class="mt-6 text-body-sm text-text-muted">Nenhum pagamento cadastrado.</p>

      <ul v-else class="mt-4 space-y-3">
        <li
          v-for="payment in payments"
          :key="payment.id"
          class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4"
        >
          <div>
            <p class="font-medium text-text">
              {{ clientName(payment.client) }} — {{ formatCurrency(payment.amount) }}
              <Badge :variant="PAYMENT_STATUS_VARIANT[payment.status]" size="sm">
                {{ PAYMENT_STATUS_LABEL[payment.status] }}
              </Badge>
            </p>
            <p class="text-body-sm text-text-muted">
              Recibo {{ payment.receiptNumber }} · vencimento em {{ payment.dueDate }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <template v-if="payment.status === 'PENDING'">
              <Button
                variant="secondary"
                size="sm"
                :loading="updatingId === payment.id"
                @click="updateStatus(payment.id, 'PAID')"
              >
                Marcar como pago
              </Button>
              <Button
                variant="ghost"
                size="sm"
                :loading="updatingId === payment.id"
                @click="updateStatus(payment.id, 'CANCELLED')"
              >
                Cancelar
              </Button>
            </template>
            <Button variant="ghost" size="sm" :loading="removingId === payment.id" @click="handleDelete(payment.id)">
              Excluir
            </Button>
          </div>
        </li>
      </ul>
    </template>
  </div>
</template>
