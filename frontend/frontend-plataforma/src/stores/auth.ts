import { defineStore } from 'pinia';
import type { AuthUser, UserRole } from '@/types/auth';
import { ApiError } from '@/services/api/errors';
import { mapOAuthSession, requestOAuthLogin, requestOAuthMe, requestOAuthRefresh, type OAuthSessionDto } from '@/services/api/oauth';

const OAUTH_URL = import.meta.env.VITE_OAUTH_API_URL as string;
const BACK_URL = import.meta.env.VITE_BACK_API_URL as string;

// Usuários fixos do seed_demo_data (backend/back/apps/professionals/management/
// commands/seed_demo_data.py) - uid/email precisam bater exatamente com o que
// foi semeado, porque o backdoor de dev faz update_or_create por firebase_uid.
const MOCK_LOGIN_ACCOUNTS: Record<UserRole, { uid: string; email: string }> = {
  ADMIN: { uid: 'seed-admin-1', email: 'admin@vivamenteterapias.example.com' },
  THERAPIST: { uid: 'seed-therapist-1', email: 'camila.nogueira.rocha@vivamenteterapias.example.com' },
};

// Só dev: o backdoor não emite cookie de refresh do Oauth, então um reload
// perderia a sessão. Guardamos apenas o PAPEL (nunca token) pra refazer o
// login de dev no boot. Some no logout e não existe em produção.
const DEV_ROLE_KEY = 'vm-dev-backdoor-role';
function readDevRole(): UserRole | null {
  if (!import.meta.env.DEV) return null;
  try {
    const role = sessionStorage.getItem(DEV_ROLE_KEY);
    return role === 'ADMIN' || role === 'THERAPIST' ? role : null;
  } catch { return null; }
}
function writeDevRole(role: UserRole | null) {
  try {
    if (role) sessionStorage.setItem(DEV_ROLE_KEY, role);
    else sessionStorage.removeItem(DEV_ROLE_KEY);
  } catch { /* storage indisponível: só perde a restauração de dev */ }
}

// Promises fora do estado reativo, isoladas por store/sessão.
const refreshes = new WeakMap<object, { version: number; promise: Promise<void> }>();

export const useAuthStore = defineStore('auth', {
  state: () => ({
    // idToken em memória apenas — nunca localStorage (risco de XSS). O
    // refreshToken nem chega a existir aqui: o Oauth emite ele como cookie
    // httpOnly (Set-Cookie em /oauth/v1/login), nunca legível por JS.
    idToken: null as string | null,
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
      const version = this.sessionVersion;
      const existing = refreshes.get(this);
      if (existing?.version === version) return existing.promise;
      const promise = (async () => {
        try {
          // O refresh token vai sozinho no cookie httpOnly — o front nunca
          // sabe se existe um válido, só tenta e trata falha como "sem sessão".
          const refreshed = await requestOAuthRefresh();
          if (version !== this.sessionVersion) throw new ApiError(401, 'Sessão encerrada.');
          this.idToken = refreshed.idToken;
          this.expiresAt = Date.now() + refreshed.expiresIn * 1000;
          // Reload de verdade: nada em memória, `user` nunca veio no corpo
          // do refresh — sem isso, isAuthenticated (idToken && user) nunca
          // fica true e a sessão nunca é considerada restaurada.
          if (!this.user) {
            this.user = await requestOAuthMe(refreshed.idToken);
            if (version !== this.sessionVersion) throw new ApiError(401, 'Sessão encerrada.');
          }
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

    /** Boot/reload: refresh via cookie httpOnly; em dev, cai pro backdoor se foi ele que logou. */
    async restoreSession() {
      const devRole = readDevRole();
      try {
        await this.refresh();
      } catch {
        if (devRole) await this.loginWithDevBackdoor(devRole).catch(() => {});
      }
    },

    async logout() {
      const token = this.idToken;
      writeDevRole(null);
      this.clearSession();
      try {
        if (token) {
          await fetch(`${OAUTH_URL}/oauth/v1/logout`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(10000),
            // Necessário pro browser mandar o cookie de refresh (pra ele ser
            // limpo pelo Set-Cookie de resposta) e aceitar essa limpeza.
            credentials: 'include',
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
      this.user = data.user;
      this.expiresAt = Date.now() + data.expiresIn * 1000;
    },

    clearSession() {
      this.sessionVersion += 1;
      this.idToken = null;
      this.user = null;
      this.expiresAt = null;
    },

    /**
     * Só em dev: monta uma sessão fake pra construir telas sem depender do
     * Oauth/Back estarem no ar (docs, seção 11). Não roda em produção.
     * Usado extensivamente pelos testes (isolado, nunca toca rede) - não
     * mexer no contrato síncrono/sem-fetch daqui. Pra logar de verdade
     * contra um Back real com dados reais (sem Firebase disponível), ver
     * `loginWithDevBackdoor`.
     */
    mockLogin(role: UserRole = 'ADMIN') {
      if (!import.meta.env.DEV) return;
      this.setSession({
        idToken: 'dev-mock-token',
        expiresIn: 3600,
        user: { id: 'mock-user', email: `${role.toLowerCase()}@vivamente.dev`, role },
      });
    },

    /**
     * Só em dev: pega um token real do backdoor de dev do Back
     * (POST /api/v1/dev/fake-token, DEBUG-only - ver apps/accounts/views.py),
     * pra logar de verdade contra um Back real sem precisar de Firebase.
     * Diferente de `mockLogin` (que nunca toca rede, usado pelos testes),
     * este realmente autentica cada backApi() subsequente. uid/email
     * precisam bater com um usuário já existente no Back (ex.: os de
     * seed_demo_data) - o backdoor faz update_or_create por firebase_uid,
     * então um uid desconhecido cria um usuário novo em vez de usar um
     * já seedado.
     */
    async loginWithDevBackdoor(role: UserRole = 'ADMIN') {
      if (!import.meta.env.DEV) return;
      const account = MOCK_LOGIN_ACCOUNTS[role];
      const res = await fetch(`${BACK_URL}/api/v1/dev/fake-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: account.uid, email: account.email, role }),
      });
      if (!res.ok) throw new ApiError(res.status, 'Não foi possível entrar com a conta de teste.');
      const body = (await res.json()) as { token: string; uid: string; email: string; role: UserRole };
      writeDevRole(role);
      this.setSession({
        idToken: body.token,
        // O backdoor de dev não expira e não tem refresh de verdade - expiresIn
        // bem alto pra nunca disparar uma renovação (que quebraria contra o
        // Oauth real, que nunca emitiu esse token).
        expiresIn: 24 * 60 * 60,
        user: { id: body.uid, email: body.email, role: body.role },
      });
    },
  },
});
