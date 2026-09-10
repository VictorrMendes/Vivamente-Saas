// Confirmado no contrato real do Back (postman, pasta 17. Payments).
// receipt_number e paid_at sao sempre gerados no servidor.
export type PaymentStatus = 'PENDING' | 'PAID' | 'CANCELLED';

export interface Payment {
  id: string;
  client: string;
  amount: number;
  dueDate: string;
  status: PaymentStatus;
  receiptNumber: string;
  paidAt?: string;
}

export interface NewPayment {
  client: string;
  amount: number;
  dueDate: string;
}
