import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { PublicProfessional } from "@/lib/api/types";
import { ProfessionalStorefront } from "./professional-storefront";

// O runner ainda não resolve aliases do Next; usa as funções reais neste caminho.
vi.mock("@/lib/format", () => import("../lib/format"));

const professional: PublicProfessional = {
  slug: "ana-teste", full_name: "Ana Teste", registration: "Registro de teste",
  photo_url: "", bio: "Apresentação cadastrada.", specialties: [{ id: 1, name: "Especialidade de teste" }],
  services: [{ id: 1, name: "Atendimento de teste", description: "Descrição cadastrada.", duration_minutes: 50, price: null, modality: "ONLINE" }],
};

describe("vitrine do terapeuta", () => {
  it("mantém dados públicos e contato direcionado ao profissional", () => {
    const html = renderToStaticMarkup(<ProfessionalStorefront professional={professional} />);
    expect(html).toContain('href="/ana-teste/agendar"');
    expect(html).toContain("Atendimento de teste");
    expect(html).toContain("Especialidade de teste");
    expect(html).not.toContain("Valor sob consulta");
    expect(html).not.toMatch(/50 minutos|duração/i);
    expect(html).toContain("Enviar uma solicitação não confirma uma consulta.");
    for (const id of ["servicos", "sobre", "como-funciona", "duvidas"]) {
      expect(html).toContain(`href="#${id}"`);
      expect(html).toContain(`id="${id}"`);
    }
  });

  it("não anuncia preços nem duração mesmo quando cadastrados no serviço", () => {
    const html = renderToStaticMarkup(<ProfessionalStorefront professional={{ ...professional, services: [{ ...professional.services[0], price: "9876.54" }] }} />);
    expect(html).not.toMatch(/R\$|9\.876|9876|sob consulta/i);
    expect(html).toContain("Atendimento de teste");
    expect(html).not.toMatch(/50 minutos|duration_minutes|duração/i);
    expect(html).toContain('href="/ana-teste/agendar"');
  });

  it("oferece contato sem inventar serviços quando o cadastro está vazio", () => {
    const html = renderToStaticMarkup(<ProfessionalStorefront professional={{ ...professional, bio: "", services: [], specialties: [], registration: "" }} />);
    expect(html).toContain("Os atendimentos ainda não foram publicados");
    expect(html).toContain("Pedir informações");
    expect(html).not.toContain("Atendimento de teste");
    expect(html).not.toContain("Áreas de atuação");
  });

  it("renderiza o conteúdo do cadastro como texto, sem executar HTML", () => {
    const html = renderToStaticMarkup(<ProfessionalStorefront professional={{ ...professional, bio: '<script>alert("teste")</script>' }} />);
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain('<script>alert("teste")</script>');
  });
});
