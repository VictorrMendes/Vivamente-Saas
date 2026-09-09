<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Briefcase } from '@lucide/vue';
import { useServices } from '@/composables/useServices';
import { formatCurrency } from '@/lib/currency';
import type { NewService } from '@/types/service';
import Button from '@/components/ui/Button.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import ServiceForm from '@/components/forms/ServiceForm.vue';
import ModuleBanner from '@/components/layout/ModuleBanner.vue';

const { services, showLoading, error, saving, saveError, removingId, load, create, update, remove } = useServices();

const showNewForm = ref(false);
const editingId = ref<string | null>(null);

async function handleCreate(service: NewService) {
  const ok = await create(service);
  if (ok) showNewForm.value = false;
}

async function handleUpdate(id: string, service: NewService) {
  const ok = await update(id, service);
  if (ok) editingId.value = null;
}

function handleDelete(id: string) {
  // ponytail: confirm() nativo — mesmo padrão já usado em Agenda/Leads/Clientes.
  if (window.confirm('Excluir este serviço? Essa ação não pode ser desfeita.')) {
    remove(id);
  }
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
                {{ service.durationMinutes }} min · {{ formatCurrency(service.price) }}
              </p>
              <p v-if="service.description" class="mt-1 text-body-sm text-text-muted">{{ service.description }}</p>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" class="text-body-sm text-primary-700 hover:underline" @click="editingId = service.id">
                Editar
              </button>
              <Button variant="ghost" size="sm" :loading="removingId === service.id" @click="handleDelete(service.id)">
                Excluir
              </Button>
            </div>
          </div>
        </li>
      </ul>
    </template>
  </div>
</template>
