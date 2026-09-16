import { describe, expect, it } from "vitest";
import { validateContactFields } from "./validate";

describe("validateContactFields", () => {
  it("aceita nome, e-mail e mensagem válidos", () => {
    expect(
      validateContactFields({ name: "Ana", email: "ana@teste.com", message: "Olá" }),
    ).toEqual({});
  });

  it("exige nome", () => {
    expect(validateContactFields({ name: "", email: "ana@teste.com", message: "Olá" })).toEqual({
      name: "Informe seu nome.",
    });
  });

  it("exige e-mail", () => {
    expect(validateContactFields({ name: "Ana", email: "", message: "Olá" })).toEqual({
      email: "Informe seu e-mail.",
    });
  });

  it("rejeita e-mail com formato inválido", () => {
    expect(
      validateContactFields({ name: "Ana", email: "nao-e-email", message: "Olá" }),
    ).toEqual({ email: "Informe um e-mail válido." });
  });

  it("exige mensagem (contato genérico precisa de mensagem)", () => {
    expect(validateContactFields({ name: "Ana", email: "ana@teste.com", message: "" })).toEqual({
      message: "Escreva uma mensagem para o profissional.",
    });
  });
});
