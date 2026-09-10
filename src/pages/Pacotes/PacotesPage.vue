<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { Package as PackageIcon } from '@lucide/vue';
import { usePackages } from '@/composables/usePackages';
import { backApi } from '@/services/api/client';
import { formatCurrency } from '@/lib/currency';
import type { PaginatedEnvelope } from '@/types/api';
import type { Client } from '@/types/client';
import type { NewPackage } from '@/types/package';
import Button from '@/components/ui/Button.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import ModuleBanner from '@/components/layout/ModuleBanner.vue';

const { packages, showLoading, error, saving, saveError, removingId, load, create, remove } = usePackages();

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
const newPackage = reactive({ client: '', name: '', totalSessions: 1, totalValue: 0, startDate: '' });

async function handleCreate() {
  const payload: NewPackage = {
    client: newPackage.client,
    name: newPackage.name,
    totalSessions: Number(newPackage.totalSessions),
    totalValue: Number(newPackage.totalValue),
    startDate: newPackage.startDate,
  };
  const ok = await create(payload);
  if (ok) {
    showNewForm.value = false;
    Object.assign(newPackage, { client: '', name: '', totalSessions: 1, totalValue: 0, startDate: '' });
  }
}

function handleDelete(id: string) {
  // ponytail: confirm() nativo — mesmo padrão já usado em Agenda/Leads/Clientes/Serviços.
  if (window.confirm('Excluir este pacote? Essa ação não pode ser desfeita.')) {
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
    <ModuleBanner :icon="PackageIcon" title="Pacotes" subtitle="Pacotes de sessões vinculados a um cliente." />

    <div class="mt-6 flex justify-end">
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
      <p v-if="packages.length === 0" class="mt-6 text-body-sm text-text-muted">Nenhum pacote cadastrado.</p>

      <ul v-else class="mt-4 space-y-3">
        <li
          v-for="pkg in packages"
          :key="pkg.id"
          class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4"
        >
          <div>
            <p class="font-medium text-text">{{ pkg.name }} — {{ clientName(pkg.client) }}</p>
            <p class="text-body-sm text-text-muted">
              {{ pkg.remainingSessions }} de {{ pkg.totalSessions }} sessões restantes · {{ formatCurrency(pkg.totalValue) }}
              · início em {{ pkg.startDate }}
            </p>
          </div>
          <Button variant="ghost" size="sm" :loading="removingId === pkg.id" @click="handleDelete(pkg.id)">
            Excluir
          </Button>
        </li>
      </ul>
    </template>
  </div>
</template>
