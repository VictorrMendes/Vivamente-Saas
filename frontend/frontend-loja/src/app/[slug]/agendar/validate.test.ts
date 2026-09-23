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

  it("rejeita valores acima dos limites do Back (nome 200, e-mail 254, telefone 30, mensagem 2000)", () => {
    const errors = validateContactFields({
      name: "n".repeat(201),
      email: `${"e".repeat(250)}@x.com`,
      phone: "1".repeat(31),
      message: "m".repeat(2001),
    });
    expect(Object.keys(errors).sort()).toEqual(["email", "message", "name", "phone"]);
    expect(errors.message).toBe("A mensagem pode ter no máximo 2000 caracteres.");
  });

  it("aceita exatamente no limite", () => {
    expect(
      validateContactFields({ name: "n".repeat(200), email: "a@x.com", phone: "1".repeat(30), message: "m".repeat(2000) }),
    ).toEqual({});
  });
});
