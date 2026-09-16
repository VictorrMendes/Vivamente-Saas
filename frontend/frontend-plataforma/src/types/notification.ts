// Confirmado direto no código real do Back (apps/notifications/models.py e
// serializers.py). Campos reais são "body" e "read_at" (não "message"/"read").
export interface Notification {
  id: number;
  title: string;
  body: string;
  readAt?: string;
  createdAt: string;
}
