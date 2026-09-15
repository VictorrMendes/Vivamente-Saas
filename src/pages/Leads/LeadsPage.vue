<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { UserPlus } from '@lucide/vue';
import { useLeads } from '@/composables/useLeads';
import { LEAD_STATUS_LABEL, LEAD_STATUS_VARIANT, LEAD_STATUS_ORDER } from '@/constants/leadStatus';
import type { LeadStatus } from '@/types/lead';
import Badge from '@/components/ui/Badge.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import Pagination from '@/components/ui/Pagination.vue';
import ModuleBanner from '@/components/layout/ModuleBanner.vue';

const { leads, pagination, showLoading, error, load } = useLeads();

const activeStatus = ref<LeadStatus | null>(null);
const search = ref('');
const page = ref(1);

function fetchLeads() {
  load({ page: page.value, status: activeStatus.value ?? undefined, search: search.value || undefined });
}

let searchTimer: ReturnType<typeof setTimeout>;
watch(search, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    page.value = 1;
    fetchLeads();
  }, 400);
});

function setStatus(status: LeadStatus | null) {
  activeStatus.value = status;
  page.value = 1;
  fetchLeads();
}

function changePage(next: number) {
  page.value = next;
  fetchLeads();
}

onMounted(fetchLeads);
</script>

<template>
  <div>
    <ModuleBanner
      :icon="UserPlus"
      title="Leads"
      subtitle="Acompanhe e avance o funil de leads até a conversão em cliente."
    />

    <div class="mt-4 flex flex-wrap items-center gap-4">
      <div class="flex flex-wrap gap-2" role="group" aria-label="Filtrar por status">
        <button
          type="button"
          class="rounded-pill px-3 py-1.5 text-body-sm transition-colors"
          :class="activeStatus === null ? 'bg-primary-600 text-text-inverse' : 'bg-surface-sunken text-text-muted hover:text-text'"
          :aria-pressed="activeStatus === null"
          @click="setStatus(null)"
        >
          Todos
        </button>
        <button
          v-for="status in LEAD_STATUS_ORDER"
          :key="status"
          type="button"
          class="rounded-pill px-3 py-1.5 text-body-sm transition-colors"
          :class="activeStatus === status ? 'bg-primary-600 text-text-inverse' : 'bg-surface-sunken text-text-muted hover:text-text'"
          :aria-pressed="activeStatus === status"
          @click="setStatus(status)"
        >
          {{ LEAD_STATUS_LABEL[status] }}
        </button>
      </div>

      <input
        v-model="search"
        type="search"
        placeholder="Buscar por nome…"
        aria-label="Buscar leads por nome"
        class="ml-auto h-10 w-full max-w-xs rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:border-primary-600"
      />
    </div>

    <p v-if="error" role="alert" class="mt-4 rounded-md bg-error-bg px-4 py-3 text-body-sm text-error">
      {{ error }}
    </p>

    <div v-else-if="showLoading" class="mt-4 space-y-3" aria-busy="true">
      <Skeleton v-for="n in 5" :key="n" variant="card" />
    </div>

    <template v-else>
      <p v-if="leads.length === 0" class="mt-6 text-body-sm text-text-muted">Nenhum lead encontrado.</p>

      <ul v-else class="mt-4 space-y-3">
        <li v-for="lead in leads" :key="lead.id">
          <RouterLink
            :to="`/leads/${lead.id}`"
            class="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong"
          >
            <div>
              <p class="font-medium text-text">{{ lead.name }}</p>
              <p class="text-body-sm text-text-muted">{{ lead.email }}</p>
            </div>
            <Badge :variant="LEAD_STATUS_VARIANT[lead.status]" size="sm">{{ LEAD_STATUS_LABEL[lead.status] }}</Badge>
          </RouterLink>
        </li>
      </ul>

      <Pagination v-if="pagination" :page="pagination.page" :total-pages="pagination.total_pages" @change="changePage" />
    </template>
  </div>
</template>
