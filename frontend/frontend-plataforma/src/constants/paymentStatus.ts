import type { PaymentStatus } from '@/types/payment';

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  CANCELLED: 'Cancelado',
};

export const PAYMENT_STATUS_VARIANT: Record<PaymentStatus, 'warning' | 'success' | 'neutral'> = {
  PENDING: 'warning',
  PAID: 'success',
  CANCELLED: 'neutral',
};
