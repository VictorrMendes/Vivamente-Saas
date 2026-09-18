import { describe, expect, it, vi } from "vitest";

// back-client.ts e institutional-requests.ts têm `import "server-only"`, que
// lança fora do runtime do Next — mockados por inteiro aqui, com as mesmas
// classes de erro que actions.ts usa em `instanceof`, pra nunca carregar o
// módulo real.
class BackApiError extends Error {
  constructor(public status: number, public body: { detail?: string } | null) {
    super(body?.detail ?? `Back respondeu ${status}`);
    this.name = "BackApiError";
  }
}
class BackUnavailableError extends Error {
  constructor(public cause: unknown) {
    super("Não foi possível conectar ao Back.");
    this.name = "BackUnavailableError";
  }
}
vi.mock("@/lib/api/back-client", () => ({ BackApiError, BackUnavailableError }));

const createInstitutionalRequest = vi.fn();
vi.mock("@/lib/api/institutional-requests", () => ({
  createInstitutionalRequest: (...args: unknown[]) => createInstitutionalRequest(...args),
}));

const { submitCompanyContact } = await import("./actions");

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

const initialState = { fieldErrors: {}, formError: null, success: false };

describe("submitCompanyContact", () => {
  it("valida localmente e nunca chama o Back com campo obrigatório vazio", async () => {
    const state = await submitCompanyContact(
      "atendimento", initialState,
      formData({ name: "", email: "joao@x.com", phone: "", specialty: "", message: "Oi" }),
    );

    expect(state.success).toBe(false);
    expect(state.fieldErrors.name).toBeTruthy();
    expect(createInstitutionalRequest).not.toHaveBeenCalled();
  });

  it("mapeia audience=atendimento para kind=PATIENT", async () => {
    createInstitutionalRequest.mockResolvedValueOnce({ id: 1, status: "NEW" });

    const state = await submitCompanyContact(
      "atendimento", initialState,
      formData({ name: "Maria", email: "maria@x.com", phone: "", specialty: "", message: "Preciso de ajuda" }),
    );

    expect(state.success).toBe(true);
    expect(createInstitutionalRequest).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "PATIENT", name: "Maria", message: "Preciso de ajuda" }),
    );
  });

  it("mapeia audience=terapeuta para kind=THERAPIST_INTEREST e prefixa a especialidade na mensagem", async () => {
    createInstitutionalRequest.mockResolvedValueOnce({ id: 2, status: "NEW" });

    await submitCompanyContact(
      "terapeuta", initialState,
      formData({ name: "Ana", email: "ana@x.com", phone: "", specialty: "Terapia de casal", message: "Quero participar" }),
    );

    expect(createInstitutionalRequest).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "THERAPIST_INTEREST", message: "Área de atuação: Terapia de casal\nQuero participar" }),
    );
  });

  it("429 vira mensagem específica de limite de requisições", async () => {
    createInstitutionalRequest.mockRejectedValueOnce(new BackApiError(429, null));

    const state = await submitCompanyContact(
      "atendimento", initialState,
      formData({ name: "X", email: "x@x.com", phone: "", specialty: "", message: "Y" }),
    );

    expect(state.success).toBe(false);
    expect(state.formError).toMatch(/muitas mensagens/i);
  });

  it("400 do Back mostra o detail real, não a mensagem genérica de indisponibilidade", async () => {
    createInstitutionalRequest.mockRejectedValueOnce(new BackApiError(400, { detail: "kind: valor inválido" }));

    const state = await submitCompanyContact(
      "atendimento", initialState,
      formData({ name: "X", email: "x@x.com", phone: "", specialty: "", message: "Y" }),
    );

    expect(state.formError).toBe("kind: valor inválido");
  });

  it("indisponibilidade de rede vira mensagem genérica de tente mais tarde", async () => {
    createInstitutionalRequest.mockRejectedValueOnce(new BackUnavailableError(new Error("ECONNREFUSED")));

    const state = await submitCompanyContact(
      "atendimento", initialState,
      formData({ name: "X", email: "x@x.com", phone: "", specialty: "", message: "Y" }),
    );

    expect(state.success).toBe(false);
    expect(state.formError).toMatch(/não foi possível enviar/i);
  });
});
