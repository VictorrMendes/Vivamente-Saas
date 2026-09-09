export type Modality = 'presencial' | 'online' | 'hibrido';

export interface Professional {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialties: string[];
  active: boolean;
  createdAt: string;
  // Campos da página pública (editados via Minha Página, PATCH .../public-profile).
  slug?: string;
  photoUrl?: string;
  bio?: string;
  services?: string[];
  modality?: Modality;
  location?: string;
}

export interface NewProfessional {
  name: string;
  email: string;
  phone: string;
  specialties: string[];
  active: boolean;
}
