import { ref } from 'vue';
import { backApi, oauthApi } from '@/services/api/client';
import { ApiError } from '@/services/api/errors';
import { requestPasswordForgot } from '@/services/api/oauth';
import type { ApiEnvelope, PaginatedEnvelope } from '@/types/api';
import type { UserLookupResult } from './useUserLookup';
import type {
  InstitutionalRequest,
  InstitutionalRequestKind,
  InstitutionalRequestStatus,
} from '@/types/institutionalRequest';

interface InstitutionalRequestsQuery {
  page?: number;
  kind?: InstitutionalRequestKind;
  search?: string;
}

export function useInstitutionalRequests() {
  const requests = ref<InstitutionalRequest[]>([]);
  const pagination = ref<PaginatedEnvelope<InstitutionalRequest>['pagination'] | null>(null);
  const loading = ref(false);
  const showLoading = ref(false);
  const error = ref<string | null>(null);
  const forwardingIds = ref(new Set<number>());
  const forwardError = ref<string | null>(null);
  const statusChangingIds = ref(new Set<number>());
  const statusError = ref<string | null>(null);
  const accountCreatingIds = ref(new Set<number>());
  const accountCreatedIds = ref(new Set<number>());
  const emailSentIds = ref(new Set<number>());
  const emailErrors = ref(new Map<number, string>());
  const accountError = ref<string | null>(null);

  function isRowBusy(id: number): boolean {
    return forwardingIds.value.has(id) || statusChangingIds.value.has(id) || accountCreatingIds.value.has(id);
  }

  // Uma busca/filtro/paginação nova invalida qualquer resposta de uma
  // chamada anterior ainda em voo — sem isso, uma resposta atrasada de um
  // filtro velho pode sobrescrever o resultado do filtro atual.
  let loadVersion = 0;

  async function load(params: InstitutionalRequestsQuery = {}) {
    const version = ++loadVersion;
    loading.value = true;
    error.value = null;
    const delayTimer = setTimeout(() => {
      if (loading.value) showLoading.value = true;
    }, 300);

    const query = new URLSearchParams({ page: String(params.page ?? 1), per_page: '10' });
    if (params.kind) query.set('kind', params.kind);
    if (params.search) query.set('search', params.search);

    try {
      const res = await backApi<PaginatedEnvelope<InstitutionalRequest>>(`/api/v1/institutional-requests?${query}`);
      if (version !== loadVersion) return;
      requests.value = res.data;
      pagination.value = res.pagination;
    } catch {
      if (version === loadVersion) error.value = 'Não foi possível carregar a fila institucional. Tente novamente em instantes.';
    } finally {
      clearTimeout(delayTimer);
      if (version === loadVersion) {
        loading.value = false;
        showLoading.value = false;
      }
    }
  }

  async function forward(id: number, professionalId: number) {
    if (isRowBusy(id)) return false;
    forwardError.value = null;
    forwardingIds.value.add(id);
    try {
      const res = await backApi<ApiEnvelope<InstitutionalRequest>>(`/api/v1/institutional-requests/${id}/forward`, {
        method: 'POST',
        body: JSON.stringify({ professional: professionalId }),
      });
      const index = requests.value.findIndex((r) => r.id === id);
      if (index !== -1) requests.value[index] = res.data;
      return true;
    } catch (err) {
      // Motivo real ("já encaminhado", "profissional inativo"...) é mais útil
      // aqui do que uma mensagem genérica — há mais de uma causa possível.
      forwardError.value = err instanceof ApiError ? err.message : 'Não foi possível encaminhar. Tente novamente.';
      return false;
    } finally {
      forwardingIds.value.delete(id);
    }
  }

  // Sem guarda de isRowBusy - usada tanto pelo setStatus público (que guarda)
  // quanto por createAccessAccount, que já segura a linha via
  // accountCreatingIds e precisaria se auto-bloquear se chamasse setStatus.
  async function performStatusChange(id: number, status: InstitutionalRequestStatus) {
    statusError.value = null;
    statusChangingIds.value.add(id);
    try {
      const res = await backApi<ApiEnvelope<InstitutionalRequest>>(`/api/v1/institutional-requests/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      const index = requests.value.findIndex((r) => r.id === id);
      if (index !== -1) requests.value[index] = res.data;
      return true;
    } catch (err) {
      statusError.value = err instanceof ApiError ? err.message : 'Não foi possível mudar o status. Tente novamente.';
      return false;
    } finally {
      statusChangingIds.value.delete(id);
    }
  }

  async function setStatus(id: number, status: InstitutionalRequestStatus) {
    if (isRowBusy(id)) return false;
    return performStatusChange(id, status);
  }

  /**
   * Cria a conta de acesso (Oauth) para um interesse de terapeuta na fila -
   * primeiro passo do onboarding, que hoje era inteiramente manual. A senha
   * gerada aqui nunca é usada: logo em seguida disparamos o fluxo de
   * "esqueci minha senha" (já existente, mesmo endpoint da tela de
   * recuperação) pra a própria pessoa definir a senha dela.
   */
  async function createAccessAccount(id: number, email: string) {
    if (isRowBusy(id)) return false;
    accountError.value = null;
    accountCreatingIds.value.add(id);
    try {
      if (!accountCreatedIds.value.has(id)) await oauthApi('/oauth/v1/users', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password: crypto.randomUUID(),
          role: 'THERAPIST',
        }),
      });
      accountCreatedIds.value.add(id);
      const emailOk = await performEmailSend(id, email);
      const current = requests.value.find((r) => r.id === id);
      const statusOk = current?.status !== 'NEW' || await performStatusChange(id, 'IN_PROGRESS');
      return emailOk && statusOk;
    } catch (err) {
      accountError.value = err instanceof ApiError ? err.message : 'Não foi possível criar a conta de acesso. Tente novamente.';
      return false;
    } finally {
      accountCreatingIds.value.delete(id);
    }
  }

  async function performEmailSend(id: number, email: string) {
    emailSentIds.value.delete(id);
    emailErrors.value.delete(id);
    try {
      const result = await requestPasswordForgot({ email });
      if (!result.sent) throw new Error('Envio não confirmado');
      emailSentIds.value.add(id);
      return true;
    } catch {
      emailErrors.value.set(id, 'A conta está disponível, mas o envio do e-mail não foi confirmado. Tente enviar novamente.');
      return false;
    }
  }

  async function resendAccessEmail(id: number, email: string) {
    if (isRowBusy(id) || !accountCreatedIds.value.has(id)) return false;
    accountCreatingIds.value.add(id);
    try {
      return await performEmailSend(id, email);
    } finally {
      accountCreatingIds.value.delete(id);
    }
  }

  // Retoma após recarregar sem criar outra identidade nem reenviar e-mail
  // automaticamente. O Back só encontra a conta após a sincronização.
  async function resumeAccessAccount(id: number, email: string) {
    if (isRowBusy(id)) return false;
    accountError.value = null;
    accountCreatingIds.value.add(id);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      let page = 1;
      let account: UserLookupResult | undefined;
      do {
        const result = await backApi<PaginatedEnvelope<UserLookupResult>>(
          `/api/v1/users?${new URLSearchParams({ search: email.trim(), page: String(page), per_page: '100' })}`,
        );
        account = result.data.find((user) => user.email.toLowerCase() === normalizedEmail);
        if (account || page >= result.pagination.total_pages) break;
        page += 1;
      } while (true);
      if (!account) {
        accountError.value = 'Conta ainda não localizada. Se já foi criada, aguarde a sincronização e tente retomar novamente.';
        return false;
      }
      if (account.role !== 'THERAPIST' || !account.active) {
        accountError.value = 'A conta localizada precisa ser de terapeuta e estar ativa. Revise o cadastro antes de continuar.';
        return false;
      }
      accountCreatedIds.value.add(id);
      const current = requests.value.find((r) => r.id === id);
      return current?.status !== 'NEW' || await performStatusChange(id, 'IN_PROGRESS');
    } catch (err) {
      accountError.value = err instanceof ApiError ? err.message : 'Não foi possível localizar a conta. Tente novamente.';
      return false;
    } finally {
      accountCreatingIds.value.delete(id);
    }
  }

  return {
    requests,
    pagination,
    loading,
    showLoading,
    error,
    forwardingIds,
    forwardError,
    statusChangingIds,
    statusError,
    accountCreatingIds,
    accountCreatedIds,
    emailSentIds,
    emailErrors,
    accountError,
    isRowBusy,
    load,
    forward,
    setStatus,
    createAccessAccount,
    resendAccessEmail,
    resumeAccessAccount,
  };
}
