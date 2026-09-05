export interface Professional {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialties: string[];
  active: boolean;
  createdAt: string;
}

export interface NewProfessional {
  name: string;
  email: string;
  phone: string;
  specialties: string[];
  active: boolean;
}
