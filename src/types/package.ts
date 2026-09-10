// Confirmado no contrato real do Back (postman, pasta 16. Packages).
// used_sessions/remaining_sessions são computados pelo servidor, nunca enviados no corpo.
export interface Package {
  id: string;
  client: string;
  name: string;
  totalSessions: number;
  totalValue: number;
  startDate: string;
  usedSessions: number;
  remainingSessions: number;
}

export interface NewPackage {
  client: string;
  name: string;
  totalSessions: number;
  totalValue: number;
  startDate: string;
}
