import type { UserRole } from '@/types/auth';

/**
 * Só existe no build de dev — nunca importado fora de um bloco
 * `if (import.meta.env.DEV)`, então o Vite elimina este módulo inteiro
 * (e as strings de senha) do bundle de produção.
 */
export const DEV_ACCOUNTS: Record<string, { password: string; role: UserRole }> = {
  'admin@vivamente.dev': { password: 'admin123', role: 'ADMIN' },
  'terapeuta@vivamente.dev': { password: 'terapeuta123', role: 'THERAPIST' },
};
