export type UserRole = 'ADMIN' | 'THERAPIST';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}
