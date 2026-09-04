import type { LeadStatus } from '@/types/lead';

/**
 * Paleta fixa por status de lead (design/components.md) — não inventar cores
 * novas por tela. Usado tanto na lista quanto no detalhe do lead.
 */
export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'Novo',
  contacted: 'Em contato',
  awaiting_response: 'Aguardando resposta',
  scheduled: 'Agendamento',
  client: 'Cliente',
};

export const LEAD_STATUS_VARIANT: Record<LeadStatus, 'info' | 'warning' | 'secondary' | 'primary' | 'success'> = {
  new: 'info',
  contacted: 'warning',
  awaiting_response: 'secondary',
  scheduled: 'primary',
  client: 'success',
};

export const LEAD_STATUS_ORDER: LeadStatus[] = ['new', 'contacted', 'awaiting_response', 'scheduled', 'client'];
