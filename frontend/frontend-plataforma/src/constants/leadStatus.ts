import type { LeadStatus } from '@/types/lead';

/**
 * Paleta fixa por status de lead (design/components.md) — não inventar cores
 * novas por tela. Usado tanto na lista quanto no detalhe do lead.
 */
export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  NEW: 'Novo',
  CONTACTED: 'Em contato',
  AWAITING_RESPONSE: 'Aguardando resposta',
  SCHEDULED: 'Agendamento',
  CONVERTED: 'Cliente',
};

export const LEAD_STATUS_VARIANT: Record<LeadStatus, 'info' | 'warning' | 'secondary' | 'primary' | 'success'> = {
  NEW: 'info',
  CONTACTED: 'warning',
  AWAITING_RESPONSE: 'secondary',
  SCHEDULED: 'primary',
  CONVERTED: 'success',
};

export const LEAD_STATUS_ORDER: LeadStatus[] = ['NEW', 'CONTACTED', 'AWAITING_RESPONSE', 'SCHEDULED', 'CONVERTED'];
