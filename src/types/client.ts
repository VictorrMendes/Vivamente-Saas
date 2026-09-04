export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
}

export interface NewClient {
  name: string;
  email: string;
  phone: string;
}
