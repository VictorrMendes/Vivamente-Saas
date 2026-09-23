// Confirmado direto no código real do Back (apps/payments/models.py e
// serializers.py). receipt_number e paid_at sao sempre gerados no servidor.
export type PaymentStatus = 'PENDING' | 'PAID' | 'CANCELLED';

export interface Payment {
  id: number;
  client: number;
  amount: number;
  dueDate: string;
  status: PaymentStatus;
  receiptNumber: string;
  paidAt?: string;
}

export interface NewPayment {
  client: number;
  amount: number;
  dueDate: string;
  description?: string;
}

export type PaymentPatch = Partial<NewPayment> & { status?: PaymentStatus };

// Confirmado em apps/payments/views.py::PaymentViewSet.balance.
export interface PaymentBalance {
  month: string;
  receivedTotal: number;
  receivedCount: number;
  pendingTotal: number;
  pendingCount: number;
  sessionsCount: number;
}
