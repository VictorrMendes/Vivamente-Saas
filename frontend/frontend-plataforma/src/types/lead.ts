// Confirmado direto no código real do Back (apps/leads/models.py e serializers.py).
// Não existe campo "serviceInterest" — é uma FK opcional pro Service (`service`).
export type LeadStatus = 'NEW' | 'CONTACTED' | 'AWAITING_RESPONSE' | 'SCHEDULED' | 'CONVERTED';

export interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  service?: number;
  message?: string;
  status: LeadStatus;
  createdAt: string;
}
