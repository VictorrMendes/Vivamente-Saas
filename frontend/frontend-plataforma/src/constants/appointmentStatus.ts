import type { AppointmentStatus } from '@/types/appointment';

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  DECLINED: 'Recusado',
  IN_PROGRESS: 'Em atendimento',
};

export const APPOINTMENT_STATUS_VARIANT: Record<AppointmentStatus, 'warning' | 'primary' | 'success' | 'neutral'> = {
  PENDING: 'warning',
  CONFIRMED: 'primary',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
  DECLINED: 'neutral',
  IN_PROGRESS: 'success',
};
