// Confirmado direto no código real do Back (config/dashboard.py, _compute_metrics).
import type { AppointmentStatus } from './appointment';

export interface UpcomingAppointment {
  id: string;
  client: string;
  startsAt: string;
  status: AppointmentStatus;
}

// AuditLog das últimas 10 ações do próprio usuário logado (nunca conteúdo sensível).
export interface ActivityItem {
  action: string;
  resource: string;
  resourceId: string;
  createdAt: string;
}

export interface DashboardMetrics {
  newLeads: number;
  activeClients: number;
  sessionsThisMonth: number;
  appointmentsToday: number;
  upcomingAppointments: UpcomingAppointment[];
  pendingPayments: { count: number; total: number };
  monthlySummary: { receivedTotal: number; sessionsCount: number };
  recentActivity: ActivityItem[];
}
