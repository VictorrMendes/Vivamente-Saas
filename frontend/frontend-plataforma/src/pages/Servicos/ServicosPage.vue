<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Briefcase } from '@lucide/vue';
import { useServices } from '@/composables/useServices';
import { formatCurrency } from '@/lib/currency';
import type { NewService, ServiceModality } from '@/types/service';
import Button from '@/components/ui/Button.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import ServiceForm from '@/components/forms/ServiceForm.vue';
import ModuleBanner from '@/components/layout/ModuleBanner.vue';

const MODALITY_LABEL: Record<ServiceModality, string> = {
  ONLINE: 'Online',
  IN_PERSON: 'Presencial',
  BOTH: 'Online ou presencial',
};

const { services, showLoading, error, saving, saveError, removingId, load, create, update, remove } = useServices();

const showNewForm = ref(false);
const editingId = ref<number | null>(null);

async function handleCreate(service: NewService) {
  const ok = await create(service);
  if (ok) showNewForm.value = false;
}

async function handleUpdate(id: number, service: NewService) {
  const ok = await update(id, service);
  if (ok) editingId.value = null;
}

const deleteTargetId = ref<number | null>(null);
function handleDeleteConfirmed() {
  if (deleteTargetId.value != null) remove(deleteTargetId.value);
  deleteTargetId.value = null;
}

onMounted(load);
</script>

<template>
  <div>
    <ModuleBanner :icon="Briefcase" title="Serviços" subtitle="Catálogo de serviços oferecidos pela clínica." />

    <div class="mt-6 flex justify-end">
      <Button variant="primary" @click="showNewForm = !showNewForm">
        {{ showNewForm ? 'Cancelar' : '+ Novo serviço' }}
      </Button>
    </div>

    <div v-if="showNewForm" class="mt-4 rounded-lg border border-border bg-surface p-4">
      <ServiceForm :saving="saving" @submit="handleCreate" @cancel="showNewForm = false" />
    </div>

    <p v-if="saveError" role="alert" class="mt-2 text-body-sm text-error">{{ saveError }}</p>

    <p v-if="error" role="alert" class="mt-4 rounded-md bg-error-bg px-4 py-3 text-body-sm text-error">
      {{ error }}
    </p>

    <div v-else-if="showLoading" class="mt-4 space-y-3" aria-busy="true">
      <Skeleton v-for="n in 4" :key="n" variant="card" />
    </div>

    <template v-else>
      <p v-if="services.length === 0" class="mt-6 text-body-sm text-text-muted">Nenhum serviço cadastrado.</p>

      <ul v-else class="mt-4 space-y-3">
        <li v-for="service in services" :key="service.id" class="rounded-lg border border-border bg-surface p-4">
          <ServiceForm
            v-if="editingId === service.id"
            :initial="service"
            :saving="saving"
            @submit="(s) => handleUpdate(service.id, s)"
            @cancel="editingId = null"
          />
          <div v-else class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="font-medium text-text">{{ service.name }}</p>
              <p class="text-body-sm text-text-muted">
                {{ service.durationMinutes }} min · {{ formatCurrency(service.price) }} · {{ MODALITY_LABEL[service.modality] }}
              </p>
              <p v-if="service.description" class="mt-1 text-body-sm text-text-muted">{{ service.description }}</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <button type="button" class="text-body-sm text-primary-700 hover:underline" @click="editingId = service.id">
                Editar
              </button>
              <Button variant="ghost" size="sm" :loading="removingId === service.id" @click="deleteTargetId = service.id">
                Excluir
              </Button>
            </div>
          </div>
        </li>
      </ul>
    </template>

    <ConfirmDialog
      :open="deleteTargetId !== null"
      title="Excluir serviço"
      description="Essa ação não pode ser desfeita."
      @update:open="(v) => { if (!v) deleteTargetId = null; }"
      @confirm="handleDeleteConfirmed"
    />
  </div>
</template>
