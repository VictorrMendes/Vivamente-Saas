<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { Wallet } from '@lucide/vue';
import { usePayments } from '@/composables/usePayments';
import { useClientOptions } from '@/composables/useClientOptions';
import { formatCurrency } from '@/lib/currency';
import { formatDateTime, startOfMonth } from '@/lib/datetime';
import { PAYMENT_STATUS_LABEL, PAYMENT_STATUS_VARIANT } from '@/constants/paymentStatus';
import type { NewPayment, Payment, PaymentStatus } from '@/types/payment';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import Pagination from '@/components/ui/Pagination.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import ModuleBanner from '@/components/layout/ModuleBanner.vue';

const route = useRoute();
const {
  payments,
  pagination,
  showLoading,
  error,
  saving,
  saveError,
  updatingId,
  removingId,
  balance,
  balanceLoading,
  balanceError,
  load,
  create,
  update,
  updateStatus,
  loadBalance,
  remove,
} = usePayments();
const { clients, clientName, load: loadClients } = useClientOptions();

const page = ref(1);
const filterClient = ref<number | ''>('');
const filterStatus = ref<PaymentStatus | ''>('');

function fetchPayments() {
  load({ page: page.value, client: filterClient.value || undefined, status: filterStatus.value || undefined });
}
watch([filterClient, filterStatus], () => {
  page.value = 1;
  fetchPayments();
});
function changePage(next: number) {
  page.value = next;
  fetchPayments();
}

const presetClient = route.query.client ? Number(route.query.client) : undefined;
const showNewForm = ref(Boolean(presetClient) || route.query.new === '1');
const newPayment = reactive<{ client: number | ''; amount: number; dueDate: string }>({
  client: presetClient ?? '',
  amount: 0,
  dueDate: '',
});
const formError = ref<string | null>(null);

function validate(): string | null {
  if (!newPayment.client) return 'Selecione um cliente.';
  if (!(newPayment.amount > 0)) return 'Informe um valor maior que zero.';
  if (!newPayment.dueDate) return 'Informe a data de vencimento.';
  return null;
}

async function handleCreate() {
  formError.value = validate();
  if (formError.value) return;
  const payload: NewPayment = {
    client: newPayment.client as number,
    amount: Number(newPayment.amount),
    dueDate: newPayment.dueDate,
  };
  const ok = await create(payload);
  if (ok) {
    showNewForm.value = false;
    Object.assign(newPayment, { client: '', amount: 0, dueDate: '' });
    fetchPayments();
    loadBalance(balanceMonth.value);
  }
}

const editingId = ref<number | null>(null);
const editAmount = ref(0);
const editDueDate = ref('');
const editError = ref<string | null>(null);

function startEdit(payment: Payment) {
  editingId.value = payment.id;
  editAmount.value = payment.amount;
  editDueDate.value = payment.dueDate;
  editError.value = null;
}

async function handleSaveEdit(id: number) {
  if (!(editAmount.value > 0)) {
    editError.value = 'Informe um valor maior que zero.';
    return;
  }
  if (!editDueDate.value) {
    editError.value = 'Informe a data de vencimento.';
    return;
  }
  const ok = await update(id, { amount: editAmount.value, dueDate: editDueDate.value });
  if (ok) {
    editingId.value = null;
    loadBalance(balanceMonth.value);
  }
}

async function handleUpdateStatus(id: number, status: PaymentStatus) {
  const ok = await updateStatus(id, status);
  if (ok) loadBalance(balanceMonth.value);
}

const deleteTargetId = ref<number | null>(null);
async function handleDeleteConfirmed() {
  if (deleteTargetId.value != null) {
    await remove(deleteTargetId.value);
    loadBalance(balanceMonth.value);
  }
  deleteTargetId.value = null;
}

const balanceMonth = ref(startOfMonth(new Date()).slice(0, 7));
watch(balanceMonth, (month) => loadBalance(month), { immediate: false });

const receiptId = ref<number | null>(null);
const receiptPayment = computed(() => payments.value.find((p) => p.id === receiptId.value) ?? null);
function printReceipt() {
  window.print();
}

onMounted(() => {
  fetchPayments();
  loadClients();
  loadBalance(balanceMonth.value);
});
</script>

<template>
  <div>
    <ModuleBanner :icon="Wallet" title="Financeiro" subtitle="Lançamentos e status de pagamento por cliente." />

    <div class="mt-6 rounded-lg border border-border bg-surface p-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="font-display text-h6 text-text">Resumo do mês</h2>
        <label class="sr-only" for="balance-month">Mês do resumo</label>
        <input
          id="balance-month"
          v-model="balanceMonth"
          type="month"
          class="h-9 rounded-md border border-border bg-surface px-3 text-body-sm text-text focus-visible:border-primary-600"
        />
      </div>
      <p v-if="balanceError" role="alert" class="mt-2 text-body-sm text-error">{{ balanceError }}</p>
      <div v-else-if="balanceLoading" class="mt-2"><Skeleton variant="card" /></div>
      <div v-else-if="balance" class="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <p class="text-label uppercase tracking-label text-text-muted">Recebido</p>
          <p class="font-display text-h5 text-text">{{ formatCurrency(balance.receivedTotal) }}</p>
          <p class="text-caption text-text-muted">{{ balance.receivedCount }} pagamento(s)</p>
        </div>
        <div>
          <p class="text-label uppercase tracking-label text-text-muted">Pendente</p>
          <p class="font-display text-h5 text-text">{{ formatCurrency(balance.pendingTotal) }}</p>
          <p class="text-caption text-text-muted">{{ balance.pendingCount }} pagamento(s)</p>
        </div>
        <div>
          <p class="text-label uppercase tracking-label text-text-muted">Total de lançamentos</p>
          <p class="font-display text-h5 text-text">{{ balance.sessionsCount }}</p>
        </div>
      </div>
    </div>

    <div class="mt-6 flex flex-wrap items-end justify-between gap-3">
      <div class="flex flex-wrap gap-3">
        <div>
          <label for="filter-pay-client" class="mb-1 block text-label uppercase tracking-label text-text-muted">Cliente</label>
          <select
            id="filter-pay-client"
            v-model="filterClient"
            class="h-9 rounded-md border border-border bg-surface px-3 text-body-sm text-text focus-visible:border-primary-600"
          >
            <option value="">Todos</option>
            <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div>
          <label for="filter-pay-status" class="mb-1 block text-label uppercase tracking-label text-text-muted">Status</label>
          <select
            id="filter-pay-status"
            v-model="filterStatus"
            class="h-9 rounded-md border border-border bg-surface px-3 text-body-sm text-text focus-visible:border-primary-600"
          >
            <option value="">Todos</option>
            <option v-for="(label, value) in PAYMENT_STATUS_LABEL" :key="value" :value="value">{{ label }}</option>
          </select>
        </div>
      </div>
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
          min="0.01"
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
    <p v-if="formError || saveError" role="alert" class="mt-2 text-body-sm text-error">{{ formError || saveError }}</p>

    <p v-if="error" role="alert" class="mt-4 rounded-md bg-error-bg px-4 py-3 text-body-sm text-error">
      {{ error }}
    </p>

    <div v-else-if="showLoading" class="mt-4 space-y-3" aria-busy="true">
      <Skeleton v-for="n in 4" :key="n" variant="card" />
    </div>

    <template v-else>
      <p v-if="payments.length === 0" class="mt-6 text-body-sm text-text-muted">Nenhum pagamento encontrado.</p>

      <ul v-else class="mt-4 space-y-3">
        <li v-for="payment in payments" :key="payment.id" class="rounded-lg border border-border bg-surface p-4">
          <div v-if="editingId === payment.id" class="flex flex-wrap items-end gap-3">
            <div>
              <label :for="`edit-amount-${payment.id}`" class="mb-1 block text-label uppercase tracking-label text-text-muted">
                Valor
              </label>
              <input
                :id="`edit-amount-${payment.id}`"
                v-model.number="editAmount"
                type="number"
                min="0.01"
                step="0.01"
                class="h-10 w-32 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
              />
            </div>
            <div>
              <label :for="`edit-due-${payment.id}`" class="mb-1 block text-label uppercase tracking-label text-text-muted">
                Vencimento
              </label>
              <input
                :id="`edit-due-${payment.id}`"
                v-model="editDueDate"
                type="date"
                class="h-10 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
              />
            </div>
            <Button size="sm" :loading="updatingId === payment.id" @click="handleSaveEdit(payment.id)">Salvar</Button>
            <Button size="sm" variant="ghost" @click="editingId = null">Cancelar</Button>
            <p v-if="editError" role="alert" class="w-full text-body-sm text-error">{{ editError }}</p>
          </div>
          <div v-else class="flex flex-wrap items-center justify-between gap-3">
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
            <div class="flex flex-wrap items-center gap-2">
              <button
                v-if="payment.status === 'PAID'"
                type="button"
                class="text-body-sm text-primary-700 hover:underline"
                @click="receiptId = receiptId === payment.id ? null : payment.id"
              >
                {{ receiptId === payment.id ? 'Fechar recibo' : 'Ver recibo' }}
              </button>
              <template v-if="payment.status === 'PENDING'">
                <button type="button" class="text-body-sm text-primary-700 hover:underline" @click="startEdit(payment)">
                  Editar
                </button>
                <Button
                  variant="secondary"
                  size="sm"
                  :loading="updatingId === payment.id"
                  @click="handleUpdateStatus(payment.id, 'PAID')"
                >
                  Marcar como pago
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  :loading="updatingId === payment.id"
                  @click="handleUpdateStatus(payment.id, 'CANCELLED')"
                >
                  Cancelar
                </Button>
              </template>
              <Button variant="ghost" size="sm" :loading="removingId === payment.id" @click="deleteTargetId = payment.id">
                Excluir
              </Button>
            </div>
          </div>

          <div
            v-if="receiptId === payment.id && receiptPayment"
            id="receipt-print-area"
            class="mt-4 rounded-md border border-border-strong bg-surface-sunken p-4"
          >
            <p class="font-display text-h6 text-text">Recibo {{ receiptPayment.receiptNumber }}</p>
            <dl class="mt-2 space-y-1 text-body-sm">
              <div class="flex justify-between gap-4"><dt class="text-text-muted">Cliente</dt><dd class="text-text">{{ clientName(receiptPayment.client) }}</dd></div>
              <div class="flex justify-between gap-4"><dt class="text-text-muted">Valor</dt><dd class="text-text">{{ formatCurrency(receiptPayment.amount) }}</dd></div>
              <div class="flex justify-between gap-4"><dt class="text-text-muted">Pago em</dt><dd class="text-text">{{ receiptPayment.paidAt ? formatDateTime(receiptPayment.paidAt) : '—' }}</dd></div>
            </dl>
            <Button class="mt-3 print:hidden" size="sm" variant="secondary" @click="printReceipt">Imprimir</Button>
          </div>
        </li>
      </ul>

      <Pagination v-if="pagination" :page="pagination.page" :total-pages="pagination.total_pages" @change="changePage" />
    </template>

    <ConfirmDialog
      :open="deleteTargetId !== null"
      title="Excluir pagamento"
      description="Essa ação não pode ser desfeita."
      @update:open="(v) => { if (!v) deleteTargetId = null; }"
      @confirm="handleDeleteConfirmed"
    />
  </div>
</template>

<style>
/* Impressão do recibo isolada — o resto da página (nav, filtros, lista) some,
   só #receipt-print-area vai pro papel. Não pode ser `scoped`: precisa alcançar
   elementos fora deste componente (layout/nav). */
@media print {
  body * {
    visibility: hidden;
  }
  #receipt-print-area,
  #receipt-print-area * {
    visibility: visible;
  }
  #receipt-print-area {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
  }
}
</style>
