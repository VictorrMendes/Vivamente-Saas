import { defineStore } from 'pinia';
import type { AuthUser, UserRole } from '@/types/auth';
import { ApiError } from '@/services/api/errors';

const OAUTH_URL = import.meta.env.VITE_OAUTH_API_URL as string;

interface LoginResponse {
  idToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    // Em memória apenas — nunca localStorage (risco de XSS). Ver docs, seção 5.
    idToken: null as string | null,
    refreshToken: null as string | null,
    user: null as AuthUser | null,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.idToken && state.user),
    role: (state): UserRole | null => state.user?.role ?? null,
  },
  actions: {
    async login(email: string, senha: string) {
      const res = await fetch(`${OAUTH_URL}/oauth/v1/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => undefined);
        throw new ApiError(res.status, body?.message ?? 'E-mail ou senha inválidos.', body);
      }
      this.setSession(await res.json());
    },

    async refresh() {
      if (!this.refreshToken) throw new ApiError(401, 'Sem sessão para renovar.');
      const res = await fetch(`${OAUTH_URL}/oauth/v1/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });
      if (!res.ok) throw new ApiError(res.status, 'Sessão expirada.');
      const { idToken } = (await res.json()) as { idToken: string };
      this.idToken = idToken;
    },

    async logout() {
      try {
        if (this.idToken) {
          await fetch(`${OAUTH_URL}/oauth/v1/logout`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${this.idToken}` },
          });
        }
      } finally {
        this.clearSession();
      }
    },

    setSession(data: LoginResponse) {
      this.idToken = data.idToken;
      this.refreshToken = data.refreshToken;
      this.user = data.user;
    },

    clearSession() {
      this.idToken = null;
      this.refreshToken = null;
      this.user = null;
    },

    /**
     * Só em dev: monta uma sessão fake pra construir telas sem depender do
     * Oauth/Back estarem no ar (docs, seção 11). Não roda em produção.
     */
    mockLogin(role: UserRole = 'ADMIN') {
      if (!import.meta.env.DEV) return;
      this.setSession({
        idToken: 'dev-mock-token',
        refreshToken: 'dev-mock-refresh',
        expiresIn: 3600,
        user: { id: 'mock-user', email: `${role.toLowerCase()}@vivamente.dev`, role },
      });
    },
  },
});
