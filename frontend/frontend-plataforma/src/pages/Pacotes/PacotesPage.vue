<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { Package as PackageIcon } from '@lucide/vue';
import { usePackages } from '@/composables/usePackages';
import { useClientOptions } from '@/composables/useClientOptions';
import { formatCurrency } from '@/lib/currency';
import type { NewPackage, PackageStatus } from '@/types/package';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import Pagination from '@/components/ui/Pagination.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import ModuleBanner from '@/components/layout/ModuleBanner.vue';

const PACKAGE_STATUS_LABEL: Record<PackageStatus, string> = {
  ACTIVE: 'Ativo',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
};
const PACKAGE_STATUS_VARIANT: Record<PackageStatus, 'success' | 'neutral'> = {
  ACTIVE: 'success',
  COMPLETED: 'neutral',
  CANCELLED: 'neutral',
};

const route = useRoute();
const { packages, pagination, showLoading, error, saving, saveError, removingId, load, create, update, remove } = usePackages();
const { clients, clientName, load: loadClients } = useClientOptions();

const page = ref(1);
const filterClient = ref<number | ''>('');
const filterStatus = ref<PackageStatus | ''>('');

function fetchPackages() {
  load({ page: page.value, client: filterClient.value || undefined, status: filterStatus.value || undefined });
}
watch([filterClient, filterStatus], () => {
  page.value = 1;
  fetchPackages();
});
function changePage(next: number) {
  page.value = next;
  fetchPackages();
}

const presetClient = route.query.client ? Number(route.query.client) : undefined;
const showNewForm = ref(Boolean(presetClient) || route.query.new === '1');
const emptyNewPackage = {
  client: presetClient ?? ('' as number | ''),
  name: '',
  totalSessions: 1,
  totalValue: 0,
  startDate: '',
  expirationDate: '',
  notes: '',
};
const newPackage = reactive({ ...emptyNewPackage });
const formError = ref<string | null>(null);

function validate(): string | null {
  if (!newPackage.client) return 'Selecione um cliente.';
  if (!newPackage.name.trim()) return 'Informe o nome do pacote.';
  if (!Number.isInteger(newPackage.totalSessions) || newPackage.totalSessions < 1) return 'Total de sessões deve ser pelo menos 1.';
  if (newPackage.totalValue < 0) return 'Valor total não pode ser negativo.';
  if (!newPackage.startDate) return 'Informe a data de início.';
  if (newPackage.expirationDate && newPackage.expirationDate < newPackage.startDate) {
    return 'A validade não pode ser antes do início.';
  }
  return null;
}

async function handleCreate() {
  formError.value = validate();
  if (formError.value) return;
  const payload: NewPackage = {
    client: newPackage.client as number,
    name: newPackage.name,
    totalSessions: Number(newPackage.totalSessions),
    totalValue: Number(newPackage.totalValue),
    startDate: newPackage.startDate,
    expirationDate: newPackage.expirationDate || undefined,
    notes: newPackage.notes || undefined,
  };
  const ok = await create(payload);
  if (ok) {
    showNewForm.value = false;
    Object.assign(newPackage, { ...emptyNewPackage, client: '' });
    fetchPackages();
  }
}

const deleteTargetId = ref<number | null>(null);
function handleDeleteConfirmed() {
  if (deleteTargetId.value != null) remove(deleteTargetId.value);
  deleteTargetId.value = null;
}

async function handleStatusChange(id: number, status: PackageStatus) {
  await update(id, { status });
}

onMounted(() => {
  fetchPackages();
  loadClients();
});
</script>

<template>
  <div>
    <ModuleBanner :icon="PackageIcon" title="Pacotes" subtitle="Pacotes de sessões vinculados a um cliente." />

    <div class="mt-6 flex flex-wrap items-end justify-between gap-3">
      <div class="flex flex-wrap gap-3">
        <div>
          <label for="pkg-filter-client" class="mb-1 block text-label uppercase tracking-label text-text-muted">Cliente</label>
          <select
            id="pkg-filter-client"
            v-model="filterClient"
            class="h-9 rounded-md border border-border bg-surface px-3 text-body-sm text-text focus-visible:border-primary-600"
          >
            <option value="">Todos</option>
            <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div>
          <label for="pkg-filter-status" class="mb-1 block text-label uppercase tracking-label text-text-muted">Status</label>
          <select
            id="pkg-filter-status"
            v-model="filterStatus"
            class="h-9 rounded-md border border-border bg-surface px-3 text-body-sm text-text focus-visible:border-primary-600"
          >
            <option value="">Todos</option>
            <option v-for="(label, value) in PACKAGE_STATUS_LABEL" :key="value" :value="value">{{ label }}</option>
          </select>
        </div>
      </div>
      <Button variant="primary" @click="showNewForm = !showNewForm">
        {{ showNewForm ? 'Cancelar' : '+ Novo pacote' }}
      </Button>
    </div>

    <form
      v-if="showNewForm"
      class="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4"
      novalidate
      @submit.prevent="handleCreate"
    >
      <div>
        <label for="pkg-client" class="mb-1 block text-label uppercase tracking-label text-text-muted">Cliente</label>
        <select
          id="pkg-client"
          v-model="newPackage.client"
          required
          class="h-10 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
        >
          <option value="" disabled>Selecione…</option>
          <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
      <div>
        <label for="pkg-name" class="mb-1 block text-label uppercase tracking-label text-text-muted">Nome</label>
        <input
          id="pkg-name"
          v-model="newPackage.name"
          type="text"
          required
          class="h-10 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
        />
      </div>
      <div>
        <label for="pkg-sessions" class="mb-1 block text-label uppercase tracking-label text-text-muted">
          Total de sessões
        </label>
        <input
          id="pkg-sessions"
          v-model.number="newPackage.totalSessions"
          type="number"
          min="1"
          required
          class="h-10 w-28 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
        />
      </div>
      <div>
        <label for="pkg-value" class="mb-1 block text-label uppercase tracking-label text-text-muted">Valor total</label>
        <input
          id="pkg-value"
          v-model.number="newPackage.totalValue"
          type="number"
          min="0"
          step="0.01"
          required
          class="h-10 w-32 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
        />
      </div>
      <div>
        <label for="pkg-start" class="mb-1 block text-label uppercase tracking-label text-text-muted">Início</label>
        <input
          id="pkg-start"
          v-model="newPackage.startDate"
          type="date"
          :max="newPackage.expirationDate || undefined"
          required
          class="h-10 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
        />
      </div>
      <div>
        <label for="pkg-expiration" class="mb-1 block text-label uppercase tracking-label text-text-muted">
          Validade (opcional)
        </label>
        <input
          id="pkg-expiration"
          v-model="newPackage.expirationDate"
          type="date"
          :min="newPackage.startDate || undefined"
          class="h-10 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
        />
      </div>
      <div class="min-w-[200px] flex-1">
        <label for="pkg-notes" class="mb-1 block text-label uppercase tracking-label text-text-muted">
          Observações (opcional)
        </label>
        <input
          id="pkg-notes"
          v-model="newPackage.notes"
          type="text"
          class="h-10 w-full rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
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
      <p v-if="packages.length === 0" class="mt-6 text-body-sm text-text-muted">Nenhum pacote encontrado.</p>

      <ul v-else class="mt-4 space-y-3">
        <li v-for="pkg in packages" :key="pkg.id" class="rounded-lg border border-border bg-surface p-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="flex flex-wrap items-center gap-2 font-medium text-text">
                {{ pkg.name }} — {{ clientName(pkg.client) }}
                <Badge :variant="PACKAGE_STATUS_VARIANT[pkg.status]" size="sm">{{ PACKAGE_STATUS_LABEL[pkg.status] }}</Badge>
                <Badge v-if="pkg.status === 'ACTIVE' && pkg.remainingSessions <= 1" variant="warning" size="sm">
                  {{ pkg.remainingSessions === 0 ? 'Sem sessões' : 'Quase no fim' }}
                </Badge>
              </p>
              <p class="text-body-sm text-text-muted">
                {{ pkg.remainingSessions }} de {{ pkg.totalSessions }} sessões restantes · {{ formatCurrency(pkg.totalValue) }}
                · início em {{ pkg.startDate }}
                <template v-if="pkg.expirationDate"> · validade em {{ pkg.expirationDate }}</template>
              </p>
              <p v-if="pkg.notes" class="mt-1 text-body-sm text-text-muted">{{ pkg.notes }}</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <RouterLink
                v-if="pkg.status === 'ACTIVE'"
                :to="`/agenda?client=${pkg.client}&package=${pkg.id}`"
                class="text-body-sm text-primary-700 hover:underline"
              >
                Nova consulta
              </RouterLink>
              <RouterLink :to="`/financeiro?client=${pkg.client}`" class="text-body-sm text-primary-700 hover:underline">
                Novo pagamento
              </RouterLink>
              <Button
                v-if="pkg.status === 'ACTIVE'"
                variant="ghost"
                size="sm"
                :loading="saving"
                @click="handleStatusChange(pkg.id, 'CANCELLED')"
              >
                Cancelar pacote
              </Button>
              <Button variant="ghost" size="sm" :loading="removingId === pkg.id" @click="deleteTargetId = pkg.id">
                Excluir
              </Button>
            </div>
          </div>
        </li>
      </ul>

      <Pagination v-if="pagination" :page="pagination.page" :total-pages="pagination.total_pages" @change="changePage" />
    </template>

    <ConfirmDialog
      :open="deleteTargetId !== null"
      title="Excluir pacote"
      description="Essa ação não pode ser desfeita."
      @update:open="(v) => { if (!v) deleteTargetId = null; }"
      @confirm="handleDeleteConfirmed"
    />
  </div>
</template>
