import { defineStore } from 'pinia';
import type { AuthUser, UserRole } from '@/types/auth';
import { ApiError } from '@/services/api/errors';
import { mapOAuthSession, requestOAuthLogin, requestOAuthRefresh, type OAuthSessionDto } from '@/services/api/oauth';

const OAUTH_URL = import.meta.env.VITE_OAUTH_API_URL as string;

// Promises fora do estado reativo, isoladas por store/sessão.
const refreshes = new WeakMap<object, { version: number; promise: Promise<void> }>();

export const useAuthStore = defineStore('auth', {
  state: () => ({
    // Em memória apenas — nunca localStorage (risco de XSS). Ver docs, seção 5.
    idToken: null as string | null,
    refreshToken: null as string | null,
    user: null as AuthUser | null,
    expiresAt: null as number | null,
    sessionVersion: 0,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.idToken && state.user),
    role: (state): UserRole | null => state.user?.role ?? null,
  },
  actions: {
    async login(email: string, senha: string) {
      if (!email.trim() || !senha) {
        throw new ApiError(400, 'Informe seu e-mail e sua senha.');
      }
      this.clearSession();
      const version = this.sessionVersion;
      const session = await requestOAuthLogin({ email: email.trim(), senha });
      if (version !== this.sessionVersion) throw new ApiError(401, 'Sessão encerrada.');
      this.setSession(session);
    },

    async refresh() {
      if (!this.refreshToken) throw new ApiError(401, 'Sem sessão para renovar.');
      const version = this.sessionVersion;
      const existing = refreshes.get(this);
      if (existing?.version === version) return existing.promise;
      const promise = (async () => {
        try {
          // O Back só devolve idToken + expiresIn no refresh — usuário e
          // refreshToken atuais são preservados, nunca reenviados.
          const refreshed = await requestOAuthRefresh({ refreshToken: this.refreshToken as string });
          if (version !== this.sessionVersion) throw new ApiError(401, 'Sessão encerrada.');
          this.idToken = refreshed.idToken;
          this.expiresAt = Date.now() + refreshed.expiresIn * 1000;
        } catch (error) {
          if (version === this.sessionVersion) this.clearSession();
          throw error;
        } finally {
          if (refreshes.get(this)?.version === version) refreshes.delete(this);
        }
      })();
      refreshes.set(this, { version, promise });
      return promise;
    },

    async logout() {
      const token = this.idToken;
      this.clearSession();
      try {
        if (token) {
          await fetch(`${OAUTH_URL}/oauth/v1/logout`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(10000),
          });
        }
      } catch {
        // A indisponibilidade do OAuth não impede encerrar a sessão local.
      }
    },

    setSession(input: OAuthSessionDto) {
      const data = mapOAuthSession({ data: input });
      this.sessionVersion += 1;
      this.idToken = data.idToken;
      this.refreshToken = data.refreshToken;
      this.user = data.user;
      this.expiresAt = Date.now() + data.expiresIn * 1000;
    },

    clearSession() {
      this.sessionVersion += 1;
      this.idToken = null;
      this.refreshToken = null;
      this.user = null;
      this.expiresAt = null;
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
