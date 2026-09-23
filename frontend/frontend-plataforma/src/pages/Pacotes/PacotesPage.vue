<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { Package as PackageIcon } from '@lucide/vue';
import { usePackagePlans } from '@/composables/usePackagePlans';
import { useServices } from '@/composables/useServices';
import { useToast } from '@/composables/useToast';
import { formatCurrency } from '@/lib/currency';
import type { NewPackagePlan } from '@/types/package';
import PackagePlanForm from '@/components/forms/PackagePlanForm.vue';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import ModuleBanner from '@/components/layout/ModuleBanner.vue';

// Pacotes = catálogo de modelos (serviço, sessões, valor, validade). Atribuir a
// um cliente e acompanhar o plano dele é no modal "Plano e pagamento" do cliente.
const toast = useToast();
const { plans, loading, error, saving, saveError, removingId, load, create, update, remove } = usePackagePlans();
const { services, load: loadServices } = useServices();

const serviceName = computed(() => {
  const map = new Map(services.value.map((s) => [s.id, s.name]));
  return (id: number) => map.get(id) ?? 'Serviço removido';
});

const showNewForm = ref(false);
watch(saveError, (message) => { if (message) toast.error(message); });

async function handleCreate(plan: NewPackagePlan) {
  if (await create(plan)) {
    toast.success('Pacote criado.');
    showNewForm.value = false;
  }
}

const editingId = ref<number | null>(null);
async function handleUpdate(id: number, plan: NewPackagePlan) {
  if (await update(id, plan)) {
    toast.success('Pacote atualizado. Planos já atribuídos a clientes não mudam.');
    editingId.value = null;
  }
}

const deleteTargetId = ref<number | null>(null);
async function handleDeleteConfirmed() {
  const id = deleteTargetId.value;
  deleteTargetId.value = null;
  if (id != null && (await remove(id))) toast.success('Pacote excluído. Os planos já atribuídos a clientes continuam valendo.');
}

onMounted(() => {
  load();
  loadServices();
});
</script>

<template>
  <div>
    <ModuleBanner :icon="PackageIcon" title="Pacotes" subtitle="Modelos de pacote que você atribui aos clientes." />

    <div class="mt-6 flex flex-wrap items-center justify-between gap-3">
      <p class="text-body-sm text-text-muted">
        Para atribuir um pacote e acompanhar o plano de um cliente, abra o
        <RouterLink to="/clientes" class="text-primary-700 hover:underline">cliente</RouterLink> e use “Plano e pagamento”.
      </p>
      <Button variant="primary" @click="showNewForm = !showNewForm; editingId = null">{{ showNewForm ? 'Cancelar' : '+ Novo pacote' }}</Button>
    </div>

    <div v-if="showNewForm" class="mt-4 rounded-lg border border-border bg-surface p-5">
      <h2 class="mb-4 font-display text-h6 text-text">Novo pacote</h2>
      <PackagePlanForm :services="services" :saving="saving" @submit="handleCreate" @cancel="showNewForm = false" />
    </div>

    <p v-if="error" role="alert" class="mt-4 rounded-md bg-error-bg px-4 py-3 text-body-sm text-error">{{ error }}</p>

    <div v-else-if="loading" class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
      <Skeleton v-for="n in 3" :key="n" variant="card" />
    </div>

    <div v-else-if="plans.length === 0 && !showNewForm" class="mt-6 rounded-lg border border-dashed border-border bg-surface px-6 py-12 text-center">
      <p class="font-display text-h6 text-text">Nenhum pacote criado</p>
      <p class="mt-1 text-body-sm text-text-muted">Crie modelos como “4 sessões” ou “Mensal” para atribuir aos clientes em segundos.</p>
      <Button class="mt-4" size="sm" @click="showNewForm = true">Criar o primeiro pacote</Button>
    </div>

    <ul v-else class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <li
        v-for="plan in plans"
        :key="plan.id"
        class="flex flex-col rounded-lg border border-border bg-surface p-5"
        :class="editingId === plan.id ? 'sm:col-span-2 xl:col-span-3' : ''"
      >
        <template v-if="editingId === plan.id">
          <h2 class="mb-4 font-display text-h6 text-text">Editar pacote</h2>
          <PackagePlanForm :initial="plan" :services="services" :saving="saving" @submit="(p) => handleUpdate(plan.id, p)" @cancel="editingId = null" />
        </template>
        <template v-else>
        <div class="flex items-start justify-between gap-2">
          <h2 class="font-display text-h6 text-text">{{ plan.name }}</h2>
          <Badge v-if="plan.service" variant="primary" size="sm">{{ serviceName(plan.service) }}</Badge>
        </div>
        <p v-if="plan.description" class="mt-1 text-body-sm text-text-muted">{{ plan.description }}</p>
        <p class="mt-4 font-display text-h4 text-text">{{ formatCurrency(plan.totalValue) }}</p>
        <p class="text-body-sm text-text-muted">
          {{ plan.totalSessions }} {{ plan.totalSessions === 1 ? 'sessão' : 'sessões' }}
          · {{ formatCurrency(plan.totalValue / plan.totalSessions) }} por sessão
        </p>
        <p class="mt-1 text-caption text-text-muted">{{ plan.validityDays ? `Validade de ${plan.validityDays} dias` : 'Sem prazo de validade' }}</p>
        <div class="mt-4 flex justify-end gap-1 border-t border-border pt-3">
          <Button variant="ghost" size="sm" @click="editingId = plan.id; showNewForm = false">Editar</Button>
          <Button variant="ghost" size="sm" :loading="removingId === plan.id" @click="deleteTargetId = plan.id">
            <span class="text-error">Excluir</span>
          </Button>
        </div>
        </template>
      </li>
    </ul>

    <ConfirmDialog
      :open="deleteTargetId !== null"
      title="Excluir pacote"
      description="O modelo sai do catálogo. Planos já atribuídos a clientes não são afetados."
      @update:open="(v) => { if (!v) deleteTargetId = null; }"
      @confirm="handleDeleteConfirmed"
    />
  </div>
</template>
