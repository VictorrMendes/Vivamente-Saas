// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { CompanyContactForm } from "./form";

// Sem vitest.config.ts com `globals: true` nesse projeto, o auto-cleanup do
// RTL (que depende de um afterEach global) não se registra sozinho.
afterEach(cleanup);

// submitCompanyContact importa institutional-requests.ts -> back-client.ts,
// que tem `import "server-only"` (lança fora do runtime do Next) - mockado
// por inteiro, simulando exatamente o bug reportado: e-mail inválido volta
// com fieldErrors sem lançar (comportamento real do React 19 com Server
// Actions: a action retornar normalmente já é o gatilho do reset nativo do
// <form>, então esse é o cenário que precisa preservar os valores).
vi.mock("./actions", () => ({
  submitCompanyContact: vi.fn(async (_audience: string, _prev: unknown, formData: FormData) => {
    const email = String(formData.get("email") ?? "");
    if (!email.includes("@")) {
      return { fieldErrors: { email: "Informe um e-mail válido." }, formError: null, success: false };
    }
    return { fieldErrors: {}, formError: null, success: true };
  }),
}));

describe("CompanyContactForm — preservação de valores", () => {
  it("mantém nome, e-mail, telefone e mensagem depois de um erro de validação", async () => {
    render(<CompanyContactForm audience="atendimento" isMock={false} />);

    fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "Joana Silva" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "email-invalido" } });
    fireEvent.change(screen.getByLabelText(/Telefone/), { target: { value: "11999998888" } });
    fireEvent.change(screen.getByLabelText("O que você está buscando?"), { target: { value: "Preciso de indicação" } });

    fireEvent.click(screen.getByRole("button", { name: /enviar solicitação/i }));

    await waitFor(() => expect(screen.getByText("Informe um e-mail válido.")).toBeTruthy());

    expect((screen.getByLabelText("Seu nome") as HTMLInputElement).value).toBe("Joana Silva");
    expect((screen.getByLabelText("E-mail") as HTMLInputElement).value).toBe("email-invalido");
    expect((screen.getByLabelText(/Telefone/) as HTMLInputElement).value).toBe("11999998888");
    expect((screen.getByLabelText("O que você está buscando?") as HTMLTextAreaElement).value).toBe("Preciso de indicação");
  });

  it("mantém a especialidade preenchida (audience=terapeuta) depois de um erro", async () => {
    render(<CompanyContactForm audience="terapeuta" isMock={false} />);

    fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "Dra. Ana" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "sem-arroba" } });
    fireEvent.change(screen.getByLabelText(/Sua área de atuação/), { target: { value: "Terapia de casal" } });
    fireEvent.change(screen.getByLabelText("Conte um pouco sobre seu trabalho"), { target: { value: "Trabalho com..." } });

    fireEvent.click(screen.getByRole("button", { name: /enviar interesse/i }));

    await waitFor(() => expect(screen.getByText("Informe um e-mail válido.")).toBeTruthy());

    expect((screen.getByLabelText(/Sua área de atuação/) as HTMLInputElement).value).toBe("Terapia de casal");
  });

  it("mostra sucesso só depois da confirmação, e o aviso de simulação em modo mock", async () => {
    render(<CompanyContactForm audience="atendimento" isMock />);

    fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "Joana" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "joana@teste.com" } });
    fireEvent.change(screen.getByLabelText("O que você está buscando?"), { target: { value: "Ajuda" } });

    expect(screen.queryByRole("heading", { level: 2 })?.textContent).not.toMatch(/enviada/i);
    fireEvent.click(screen.getByRole("button", { name: /enviar solicitação/i }));

    // "Mensagem" e "enviada." ficam em nós de texto separados por causa do
    // <br/><em> no JSX — textContent junta os dois, getByText sozinho não acharia.
    await waitFor(() => expect(screen.getByRole("heading", { level: 2 }).textContent).toMatch(/mensagem.*enviada/i));
    expect(screen.getByText(/foi simulado/i)).toBeTruthy();
  });
});
