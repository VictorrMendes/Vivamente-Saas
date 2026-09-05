export type Modality = 'presencial' | 'online' | 'hibrido';

export interface PublicProfile {
  id: string;
  slug: string;
  photoUrl: string;
  name: string;
  bio: string;
  specialties: string[];
  services: string[];
  modality: Modality;
  location: string;
}

export type PublicProfilePatch = Omit<PublicProfile, 'id' | 'slug'>;
