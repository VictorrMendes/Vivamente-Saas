<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useLead } from '@/composables/useLead';
import { LEAD_STATUS_LABEL, LEAD_STATUS_VARIANT } from '@/constants/leadStatus';
import { formatDateTime } from '@/lib/datetime';
import type { LeadStatus } from '@/types/lead';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import LeadStatusSelect from '@/components/forms/LeadStatusSelect.vue';

const props = defineProps<{ id: string }>();
const router = useRouter();

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

onMounted(() => load(props.id));

function handleStatusChange(status: LeadStatus) {
  updateStatus(props.id, status);
}

async function handleConvert() {
  const clientId = await convert(props.id);
  if (clientId) router.push(`/clientes/${clientId}`);
}

async function handleDelete() {
  // ponytail: confirm() nativo — mesmo padrão já usado no cancelamento de agendamento.
  if (!window.confirm('Excluir este lead? Essa ação não pode ser desfeita.')) return;
  const ok = await remove(props.id);
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
            <div class="flex justify-between gap-4">
              <dt class="text-text-muted">Interesse</dt>
              <dd class="text-text">{{ lead.serviceInterest }}</dd>
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
            <Button variant="ghost" :loading="deleting" @click="handleDelete">Excluir lead</Button>
          </div>
          <p v-if="convertError" role="alert" class="mt-2 text-body-sm text-error">{{ convertError }}</p>
          <p v-if="deleteError" role="alert" class="mt-2 text-body-sm text-error">{{ deleteError }}</p>
        </div>
      </div>
    </template>
  </div>
</template>
