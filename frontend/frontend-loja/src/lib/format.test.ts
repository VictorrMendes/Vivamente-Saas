import { describe, expect, it } from "vitest";
import { formatPrice, getInitials } from "./format";

describe("formatPrice", () => {
  it("mostra 'sob consulta' quando o preço é null", () => {
    expect(formatPrice(null)).toBe("Valor sob consulta");
  });

  it("formata string decimal do Back como BRL", () => {
    expect(formatPrice("150.00")).toBe("R$ 150,00");
  });

  it("cai em 'sob consulta' se a string não for numérica", () => {
    expect(formatPrice("abc")).toBe("Valor sob consulta");
  });
});

describe("getInitials", () => {
  it("pega a primeira letra dos dois primeiros nomes", () => {
    expect(getInitials("Ana Silva Souza")).toBe("AS");
  });

  it("funciona com um único nome", () => {
    expect(getInitials("Ana")).toBe("A");
  });
});
