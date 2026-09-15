<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { CalendarDays, LayoutDashboard, UserPlus, Users, TrendingUp, Wallet, PackageX } from '@lucide/vue';
import { useDashboard } from '@/composables/useDashboard';
import { useAppointments } from '@/composables/useAppointments';
import { usePackages } from '@/composables/usePackages';
import { useServices } from '@/composables/useServices';
import { useClientOptions } from '@/composables/useClientOptions';
import { formatDateTime, formatTime, toDateOnly } from '@/lib/datetime';
import { formatCurrency } from '@/lib/currency';
import { APPOINTMENT_STATUS_LABEL, APPOINTMENT_STATUS_VARIANT } from '@/constants/appointmentStatus';
import { APPOINTMENT_MODALITY_LABEL } from '@/constants/appointmentModality';
import type { Appointment } from '@/types/appointment';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
import MetricCard from '@/components/dashboard/MetricCard.vue';
import RecentActivity from '@/components/dashboard/RecentActivity.vue';
import Skeleton from '@/components/ui/Skeleton.vue';
import ModuleBanner from '@/components/layout/ModuleBanner.vue';

const { metrics, showLoading, error, load } = useDashboard();
const { appointments, showLoading: appointmentsShowLoading, error: appointmentsError, load: loadAppointments } = useAppointments();
const { services, load: loadServices } = useServices();
const { packages, showLoading: packagesShowLoading, error: packagesError, load: loadPackages } = usePackages();
const { clientName, load: loadClients } = useClientOptions();

const serviceName = computed(() => {
  const map = new Map(services.value.map((s) => [s.id, s.name]));
  return (id: number) => map.get(id) ?? String(id);
});
function appointmentDetail(appt: Appointment) {
  if (appt.service) return serviceName.value(appt.service);
  return appt.modality ? APPOINTMENT_MODALITY_LABEL[appt.modality] : 'Sem detalhes';
}

const todayDate = new Date();
const today = toDateOnly(todayDate);
const todayAppointments = computed(() =>
  appointments.value
    .filter((a) => toDateOnly(new Date(a.startsAt)) === today && a.status !== 'CANCELLED')
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
);

const lowPackages = computed(() =>
  packages.value.filter((p) => p.status === 'ACTIVE' && p.remainingSessions <= 1),
);

onMounted(() => {
  load();
  loadClients();
  loadAppointments({ year: todayDate.getFullYear(), month: todayDate.getMonth() + 1 });
  loadServices();
  loadPackages({ perPage: 100 });
});
</script>

<template>
  <div>
    <ModuleBanner
      :icon="LayoutDashboard"
      title="Dashboard"
      subtitle="Visão geral do dia: leads novos, agendamentos e atividades recentes."
    />

    <div class="mt-4 flex flex-wrap gap-2">
      <RouterLink to="/clientes?new=1"><Button size="sm" variant="secondary">+ Cliente</Button></RouterLink>
      <RouterLink to="/agenda?new=1"><Button size="sm" variant="secondary">+ Agendamento</Button></RouterLink>
      <RouterLink to="/financeiro?new=1"><Button size="sm" variant="secondary">+ Pagamento</Button></RouterLink>
    </div>

    <p v-if="error" role="alert" class="mt-4 rounded-md bg-error-bg px-4 py-3 text-body-sm text-error">
      {{ error }}
    </p>

    <div v-else-if="showLoading" class="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4" aria-busy="true">
      <Skeleton v-for="n in 4" :key="n" variant="card" />
    </div>

    <template v-else-if="metrics">
      <div class="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Leads novos" :value="metrics.newLeads" :icon="UserPlus" to="/leads" />
        <MetricCard label="Clientes ativos" :value="metrics.activeClients" :icon="Users" to="/clientes" />
        <MetricCard label="Agendamentos hoje" :value="metrics.appointmentsToday" :icon="CalendarDays" to="/agenda" />
        <MetricCard label="Sessões este mês" :value="metrics.sessionsThisMonth" :icon="TrendingUp" to="/agenda" />
      </div>

      <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard
          label="Pagamentos pendentes"
          :value="`${metrics.pendingPayments.count} · ${formatCurrency(metrics.pendingPayments.total)}`"
          :icon="Wallet"
          to="/financeiro"
        />
        <MetricCard
          label="Recebido este mês"
          :value="formatCurrency(metrics.monthlySummary.receivedTotal)"
          :icon="Wallet"
          to="/financeiro"
        />
      </div>

      <div v-if="packagesError" role="alert" class="mt-6 rounded-md bg-error-bg px-4 py-3 text-body-sm text-error">
        {{ packagesError }}
      </div>
      <div v-else-if="packagesShowLoading" class="mt-6"><Skeleton variant="card" /></div>
      <div v-else-if="lowPackages.length > 0" class="mt-6 rounded-lg border border-warning bg-warning-bg p-4">
        <h2 class="mb-2 font-display text-h6 text-text">Pacotes precisando de atenção</h2>
        <ul class="space-y-2">
          <li v-for="pkg in lowPackages" :key="pkg.id" class="flex items-center justify-between gap-3 text-body-sm">
            <span class="flex items-center gap-2 text-text">
              <PackageX :size="16" aria-hidden="true" />
              {{ pkg.name }} — {{ clientName(pkg.client) }}
              ({{ pkg.remainingSessions === 0 ? 'sem sessões' : '1 sessão restante' }})
            </span>
            <RouterLink to="/pacotes" class="shrink-0 text-primary-700 hover:underline">Ver pacote</RouterLink>
          </li>
        </ul>
      </div>

      <div class="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div class="rounded-lg border border-border bg-surface p-4">
          <h2 class="mb-3 font-display text-h6 text-text">Agenda de hoje</h2>
          <p v-if="appointmentsError" role="alert" class="text-body-sm text-error">{{ appointmentsError }}</p>
          <Skeleton v-else-if="appointmentsShowLoading" variant="card" />
          <p v-else-if="todayAppointments.length === 0" class="text-body-sm text-text-muted">Nenhum atendimento hoje.</p>
          <ul v-else class="space-y-3">
            <li v-for="appt in todayAppointments" :key="appt.id" class="flex items-center justify-between gap-4 text-body-sm">
              <RouterLink :to="`/clientes/${appt.client}`" class="min-w-0 text-text hover:underline">
                <span class="block truncate">{{ clientName(appt.client) }} — {{ appointmentDetail(appt) }}</span>
              </RouterLink>
              <div class="flex shrink-0 items-center gap-2">
                <Badge :variant="APPOINTMENT_STATUS_VARIANT[appt.status]" size="sm">
                  {{ APPOINTMENT_STATUS_LABEL[appt.status] }}
                </Badge>
                <span class="text-caption text-text-muted">{{ formatTime(appt.startsAt) }}</span>
              </div>
            </li>
          </ul>
        </div>

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
              <RouterLink :to="`/clientes/${appt.client}`" class="text-text hover:underline">{{ clientName(appt.client) }}</RouterLink>
              <div class="flex shrink-0 items-center gap-2">
                <Badge :variant="APPOINTMENT_STATUS_VARIANT[appt.status]" size="sm">
                  {{ APPOINTMENT_STATUS_LABEL[appt.status] }}
                </Badge>
                <span class="text-caption text-text-muted">{{ formatDateTime(appt.startsAt) }}</span>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <RecentActivity class="mt-6" :items="metrics.recentActivity" />
    </template>
  </div>
</template>
