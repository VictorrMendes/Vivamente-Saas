export interface Service {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
}

export interface NewService {
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
}
