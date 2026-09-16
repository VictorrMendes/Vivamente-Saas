// Confirmado no contrato real do Back (postman, pasta 9. Clients).
export interface Client {
  id: number;
  name: string;
  email: string;
  phone: string;
  birthDate?: string;
  document?: string;
  administrativeNotes?: string;
  createdAt: string;
}

export interface NewClient {
  name: string;
  email: string;
  phone: string;
  birthDate?: string;
  document?: string;
  administrativeNotes?: string;
}
