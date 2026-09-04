export type LeadStatus = 'new' | 'contacted' | 'awaiting_response' | 'scheduled' | 'client';

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  serviceInterest: string;
  message?: string;
  status: LeadStatus;
  createdAt: string;
}
