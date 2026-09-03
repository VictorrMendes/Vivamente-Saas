export interface MonthlyIndicator {
  label: string;
  value: number;
}

export interface UpcomingAppointment {
  id: string;
  clientName: string;
  serviceName: string;
  startsAt: string;
}

export interface ActivityItem {
  id: string;
  description: string;
  occurredAt: string;
}

export interface DashboardMetrics {
  newLeads: number;
  activeClients: number;
  todayAppointments: number;
  monthlyIndicators: MonthlyIndicator[];
  upcomingAppointments: UpcomingAppointment[];
  recentActivity: ActivityItem[];
}
