// Confirmado no contrato real do Back (postman, pasta 15. Clinical Records).
// Só o terapeuta responsável pelo client acessa — ADMIN recebe 403 sempre.
export interface ClinicalRecord {
  id: string;
  client: string;
  content: string;
  createdAt: string;
}
