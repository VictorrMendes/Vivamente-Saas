export type LeadStatus = 'new' | 'contacted' | 'awaiting_response' | 'scheduled' | 'client';

export interface Lead {
  id: string;
  name: string;
  serviceInterest: string;
  status: LeadStatus;
  createdAt: string;
}
