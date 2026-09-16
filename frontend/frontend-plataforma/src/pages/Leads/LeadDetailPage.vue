<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useLead } from '@/composables/useLead';
import { useServices } from '@/composables/useServices';
import { LEAD_STATUS_LABEL, LEAD_STATUS_VARIANT } from '@/constants/leadStatus';
import { formatDateTime } from '@/lib/datetime';
import type { LeadStatus } from '@/types/lead';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import LeadStatusSelect from '@/components/forms/LeadStatusSelect.vue';

const props = defineProps<{ id: string }>();
const router = useRouter();
// Vue Router só entrega params como string — convertemos na fronteira, aqui.
const leadId = computed(() => Number(props.id));

const {
  lead,
  showLoading,
  error,
  statusSaving,
  statusError,
  converting,
  convertError,
  deleting,
  deleteError,
  load,
  updateStatus,
  convert,
  remove,
} = useLead();

const { services, load: loadServices } = useServices();
const serviceName = computed(() => {
  const map = new Map(services.value.map((s) => [s.id, s.name]));
  return (id: number) => map.get(id) ?? String(id);
});

onMounted(() => {
  load(leadId.value);
  loadServices();
});

function handleStatusChange(status: LeadStatus) {
  updateStatus(leadId.value, status);
}

async function handleConvert() {
  const clientId = await convert(leadId.value);
  if (clientId) router.push(`/clientes/${clientId}`);
}

const deleteConfirmOpen = ref(false);
async function handleDeleteConfirmed() {
  deleteConfirmOpen.value = false;
  const ok = await remove(leadId.value);
  if (ok) router.push('/leads');
}
</script>

<template>
  <div>
    <RouterLink to="/leads" class="text-body-sm text-text-muted hover:text-text">← Voltar para Leads</RouterLink>

    <p v-if="error" role="alert" class="mt-4 rounded-md bg-error-bg px-4 py-3 text-body-sm text-error">
      {{ error }}
    </p>

    <div v-else-if="showLoading" class="mt-4">
      <Skeleton variant="card" />
    </div>

    <template v-else-if="lead">
      <div class="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="font-display text-h3 text-text">{{ lead.name }}</h1>
          <p class="mt-1 text-body-sm text-text-muted">Lead desde {{ formatDateTime(lead.createdAt) }}</p>
        </div>
        <Badge :variant="LEAD_STATUS_VARIANT[lead.status]">{{ LEAD_STATUS_LABEL[lead.status] }}</Badge>
      </div>

      <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div class="rounded-lg border border-border bg-surface p-4">
          <h2 class="mb-3 font-display text-h6 text-text">Contato</h2>
          <dl class="space-y-2 text-body-sm">
            <div class="flex justify-between gap-4">
              <dt class="text-text-muted">E-mail</dt>
              <dd class="text-text">{{ lead.email }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-text-muted">Telefone</dt>
              <dd class="text-text">{{ lead.phone }}</dd>
            </div>
            <div v-if="lead.service" class="flex justify-between gap-4">
              <dt class="text-text-muted">Interesse</dt>
              <dd class="text-text">{{ serviceName(lead.service) }}</dd>
            </div>
          </dl>
          <p v-if="lead.message" class="mt-4 rounded-md bg-surface-sunken p-3 text-body-sm text-text">
            {{ lead.message }}
          </p>
        </div>

        <div class="rounded-lg border border-border bg-surface p-4">
          <h2 class="mb-3 font-display text-h6 text-text">Status</h2>

          <label for="lead-status" class="mb-1 block text-label uppercase tracking-label text-text-muted">
            Status do lead
          </label>
          <LeadStatusSelect
            id="lead-status"
            :model-value="lead.status"
            :disabled="statusSaving || lead.status === 'CONVERTED'"
            @update:model-value="handleStatusChange"
          />
          <p v-if="statusError" role="alert" class="mt-2 text-body-sm text-error">{{ statusError }}</p>

          <div class="mt-6 flex flex-wrap gap-2">
            <Button v-if="lead.status !== 'CONVERTED'" variant="primary" :loading="converting" @click="handleConvert">
              Converter em cliente
            </Button>
            <Button variant="destructive" :loading="deleting" @click="deleteConfirmOpen = true">Excluir lead</Button>
          </div>
          <p v-if="convertError" role="alert" class="mt-2 text-body-sm text-error">{{ convertError }}</p>
          <p v-if="deleteError" role="alert" class="mt-2 text-body-sm text-error">{{ deleteError }}</p>
        </div>
      </div>
    </template>

    <ConfirmDialog
      :open="deleteConfirmOpen"
      title="Excluir lead"
      description="Essa ação não pode ser desfeita."
      @update:open="(v) => { deleteConfirmOpen = v; }"
      @confirm="handleDeleteConfirmed"
    />
  </div>
</template>
