// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { AppointmentForm } from "./form";

// Sem vitest.config.ts com `globals: true` nesse projeto, o auto-cleanup do
// RTL (que depende de um afterEach global) não se registra sozinho.
afterEach(cleanup);

// submitAppointmentRequest importa appointment-requests.ts -> back-client.ts,
// que tem `import "server-only"` (lança fora do runtime do Next) - mockado
// por inteiro. Mesmo padrão de regressão do /contato (form.test.tsx): a
// action volta com fieldErrors sem lançar, que é o gatilho do reset nativo
// do <form> em React 19 com Server Actions.
vi.mock("./actions", () => ({
  submitAppointmentRequest: vi.fn(async (_slug: string, _prev: unknown, formData: FormData) => {
    const email = String(formData.get("email") ?? "");
    if (!email.includes("@")) {
      return { fieldErrors: { email: "Informe um e-mail válido." }, formError: null };
    }
    return { fieldErrors: {}, formError: null };
  }),
}));

const SERVICES = [{ id: 1, name: "Terapia individual" }] as never;
const SLOTS = [{ id: "s1", starts_at: "2026-10-01T14:00:00Z" }] as never;

describe("AppointmentForm — preservação de valores após erro de validação", () => {
  it("mantém nome, telefone, serviço e mensagem depois de um erro de validação", async () => {
    render(<AppointmentForm slug="dra-exemplo" services={SERVICES} slots={SLOTS} />);

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Joana Silva" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "email-invalido" } });
    fireEvent.change(screen.getByLabelText("Telefone (opcional)"), { target: { value: "11999998888" } });
    fireEvent.change(screen.getByLabelText("Serviço (opcional)"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Mensagem"), { target: { value: "Preciso de ajuda" } });

    fireEvent.click(screen.getByRole("button", { name: /enviar solicitação/i }));

    await waitFor(() => expect(screen.getByText("Informe um e-mail válido.")).toBeTruthy());

    expect((screen.getByLabelText("Nome") as HTMLInputElement).value).toBe("Joana Silva");
    expect((screen.getByLabelText("E-mail") as HTMLInputElement).value).toBe("email-invalido");
    expect((screen.getByLabelText("Telefone (opcional)") as HTMLInputElement).value).toBe("11999998888");
    expect((screen.getByLabelText("Serviço (opcional)") as HTMLSelectElement).value).toBe("1");
    expect((screen.getByLabelText("Mensagem") as HTMLTextAreaElement).value).toBe("Preciso de ajuda");
  });
});
