<script setup lang="ts">
import { onMounted } from 'vue';
import { CalendarDays, LayoutDashboard, UserPlus, Users, TrendingUp } from '@lucide/vue';
import { useDashboard } from '@/composables/useDashboard';
import { formatDateTime } from '@/lib/datetime';
import MetricCard from '@/components/dashboard/MetricCard.vue';
import RecentActivity from '@/components/dashboard/RecentActivity.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import ModuleBanner from '@/components/layout/ModuleBanner.vue';

const { metrics, showLoading, error, load } = useDashboard();
onMounted(load);
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
        <MetricCard label="Agendamentos hoje" :value="metrics.todayAppointments" :icon="CalendarDays" />
        <MetricCard
          v-for="indicator in metrics.monthlyIndicators"
          :key="indicator.label"
          :label="indicator.label"
          :value="indicator.value"
          :icon="TrendingUp"
        />
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
              <span class="text-text">{{ appt.clientName }} — {{ appt.serviceName }}</span>
              <span class="shrink-0 text-caption text-text-muted">{{ formatDateTime(appt.startsAt) }}</span>
            </li>
          </ul>
        </div>

        <RecentActivity :items="metrics.recentActivity" />
      </div>
    </template>
  </div>
</template>
