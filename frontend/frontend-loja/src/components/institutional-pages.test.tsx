// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import SobrePage, { metadata as aboutMetadata } from "../app/sobre/page";
import PrivacidadePage, { metadata as privacyMetadata } from "../app/privacidade/page";
import TermosPage, { metadata as termsMetadata } from "../app/termos/page";

describe("páginas institucionais", () => {
  it.each([SobrePage, PrivacidadePage, TermosPage])("renderiza conteúdo completo e sumário com destinos válidos: %s", (Page) => {
    const html = renderToStaticMarkup(<Page />);
    const page = document.createElement("div");
    page.innerHTML = html;
    expect(page.querySelectorAll("h1")).toHaveLength(1);
    expect(page.querySelectorAll("article section").length).toBeGreaterThanOrEqual(5);
    expect(html).not.toContain("Pendência de conteúdo");
    for (const link of page.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')) {
      expect(page.querySelector(link.getAttribute("href")!)).not.toBeNull();
    }
  });

  it("oferece os dois caminhos de contato na página Sobre", () => {
    const html = renderToStaticMarkup(<SobrePage />);
    expect(html).toContain('/contato?interesse=atendimento');
    expect(html).toContain('/contato?interesse=terapeuta');
    expect(html).toContain('href="/terapeutas"');
    expect(aboutMetadata.robots).toBeUndefined();
  });

  it.each([[PrivacidadePage, privacyMetadata], [TermosPage, termsMetadata]] as const)("identifica os dados fictícios e mantém a versão jurídica fora da indexação: %s", (Page, metadata) => {
    const html = renderToStaticMarkup(<Page />);
    expect(html).toContain("Versão de desenvolvimento");
    expect(html).toContain("privacidade@vivamente.example");
    expect(html).toContain("não recebe mensagens");
    expect(html).not.toContain("mailto:");
    expect(metadata.robots).toEqual({ index: false });
  });
});
