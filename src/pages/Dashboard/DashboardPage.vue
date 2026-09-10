<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { CalendarDays, LayoutDashboard, UserPlus, Users, TrendingUp, Wallet } from '@lucide/vue';
import { useDashboard } from '@/composables/useDashboard';
import { backApi } from '@/services/api/client';
import { formatDateTime } from '@/lib/datetime';
import { formatCurrency } from '@/lib/currency';
import { APPOINTMENT_STATUS_LABEL, APPOINTMENT_STATUS_VARIANT } from '@/constants/appointmentStatus';
import type { PaginatedEnvelope } from '@/types/api';
import type { Client } from '@/types/client';
import Badge from '@/components/ui/Badge.vue';
import MetricCard from '@/components/dashboard/MetricCard.vue';
import RecentActivity from '@/components/dashboard/RecentActivity.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import ModuleBanner from '@/components/layout/ModuleBanner.vue';

const { metrics, showLoading, error, load } = useDashboard();

const clients = ref<Client[]>([]);
const clientName = computed(() => {
  const map = new Map(clients.value.map((c) => [c.id, c.name]));
  return (id: string) => map.get(id) ?? id;
});
async function loadClients() {
  const res = await backApi<PaginatedEnvelope<Client>>('/api/v1/clients?per_page=100');
  clients.value = res.data;
}

onMounted(() => {
  load();
  loadClients();
});
</script>

<template>
  <div>
    <ModuleBanner
      :icon="LayoutDashboard"
      title="Dashboard"
      subtitle="Visão geral do dia: leads novos, agendamentos e atividades recentes."
    />

    <p v-if="error" role="alert" class="mt-4 rounded-md bg-error-bg px-4 py-3 text-body-sm text-error">
      {{ error }}
    </p>

    <div v-else-if="showLoading" class="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4" aria-busy="true">
      <Skeleton v-for="n in 4" :key="n" variant="card" />
    </div>

    <template v-else-if="metrics">
      <div class="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Leads novos" :value="metrics.newLeads" :icon="UserPlus" />
        <MetricCard label="Clientes ativos" :value="metrics.activeClients" :icon="Users" />
        <MetricCard label="Agendamentos hoje" :value="metrics.appointmentsToday" :icon="CalendarDays" />
        <MetricCard label="Sessões este mês" :value="metrics.sessionsThisMonth" :icon="TrendingUp" />
      </div>

      <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard
          label="Pagamentos pendentes"
          :value="`${metrics.pendingPayments.count} · ${formatCurrency(metrics.pendingPayments.total)}`"
          :icon="Wallet"
        />
        <MetricCard label="Recebido este mês" :value="formatCurrency(metrics.monthlySummary.receivedTotal)" :icon="Wallet" />
      </div>

      <div class="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div class="rounded-lg border border-border bg-surface p-4">
          <h2 class="mb-3 font-display text-h6 text-text">Próximos atendimentos</h2>
          <p v-if="metrics.upcomingAppointments.length === 0" class="text-body-sm text-text-muted">
            Nenhum atendimento agendado.
          </p>
          <ul v-else class="space-y-3">
            <li
              v-for="appt in metrics.upcomingAppointments"
              :key="appt.id"
              class="flex items-center justify-between gap-4 text-body-sm"
            >
              <span class="text-text">{{ clientName(appt.client) }}</span>
              <div class="flex shrink-0 items-center gap-2">
                <Badge :variant="APPOINTMENT_STATUS_VARIANT[appt.status]" size="sm">
                  {{ APPOINTMENT_STATUS_LABEL[appt.status] }}
                </Badge>
                <span class="text-caption text-text-muted">{{ formatDateTime(appt.startsAt) }}</span>
              </div>
            </li>
          </ul>
        </div>

        <RecentActivity :items="metrics.recentActivity" />
      </div>
    </template>
  </div>
</template>
