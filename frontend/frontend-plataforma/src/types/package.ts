// Confirmado direto no código real do Back (apps/packages/models.py e
// serializers.py). used_sessions/remaining_sessions são computados ao vivo
// a partir dos agendamentos vinculados — nunca enviados no corpo.
export type PackageStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface Package {
  id: number;
  client: number;
  name: string;
  totalSessions: number;
  totalValue: number;
  status: PackageStatus;
  startDate: string;
  expirationDate?: string;
  notes?: string;
  usedSessions: number;
  remainingSessions: number;
}

export interface NewPackage {
  client: number;
  name: string;
  totalSessions: number;
  totalValue: number;
  startDate: string;
  expirationDate?: string;
  notes?: string;
}

export type PackagePatch = Partial<NewPackage> & { status?: PackageStatus };
