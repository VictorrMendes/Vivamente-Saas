// Confirmado direto no código real do Back (apps/clinical_records/models.py
// e serializers.py). Só o terapeuta responsável pelo client acessa — ADMIN
// recebe 403 sempre. `professional`/`author` são sempre atribuídos pelo
// servidor (nunca enviados no corpo); `appointment` é opcional (nota avulsa).
export interface ClinicalRecord {
  id: number;
  client: number;
  professional: number;
  appointment?: number;
  content: string;
  recordedAt: string;
  author?: number;
  createdAt: string;
}

export interface NewClinicalRecord {
  client: number;
  appointment?: number;
  content: string;
  recordedAt?: string;
}
