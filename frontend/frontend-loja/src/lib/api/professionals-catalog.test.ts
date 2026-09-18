import { describe, expect, it, vi } from "vitest";

// back-client.ts e mocks.ts têm `import "server-only"`, que lança fora do
// runtime do Next — mockados por inteiro, mesmo padrão de contato/actions.test.ts.
class BackApiError extends Error {
  constructor(public status: number, public body: { detail?: string } | null) {
    super(body?.detail ?? `Back respondeu ${status}`);
    this.name = "BackApiError";
  }
}
const backFetchPaginated = vi.fn();
vi.mock("./back-client", () => ({ backFetchPaginated: (...args: unknown[]) => backFetchPaginated(...args), BackApiError }));

const isMockEnabled = vi.fn(() => false);
vi.mock("./mocks", () => ({
  isMockEnabled: () => isMockEnabled(),
  mockProfessionalCatalog: vi.fn(),
  mockSpecialties: vi.fn(() => [{ id: 1, name: "Ansiedade (mock)" }]),
}));

const { loadCatalogSpecialties, loadProfessionalsCatalog } = await import("./professionals-catalog");

describe("loadProfessionalsCatalog — filtro por especialidade", () => {
  it("inclui ?specialties=<id> quando specialty é passado", async () => {
    backFetchPaginated.mockResolvedValueOnce({ data: [], pagination: { page: 1, per_page: 20, total: 0, total_pages: 1 } });

    await loadProfessionalsCatalog({ page: 1, specialty: 5 });

    expect(backFetchPaginated).toHaveBeenCalledWith(
      expect.stringContaining("specialties=5"),
      expect.anything(),
    );
  });

  it("não inclui specialties na query quando specialty não é passado", async () => {
    backFetchPaginated.mockResolvedValueOnce({ data: [], pagination: { page: 1, per_page: 20, total: 0, total_pages: 1 } });

    await loadProfessionalsCatalog({ page: 1 });

    expect(backFetchPaginated).toHaveBeenCalledWith(
      expect.not.stringContaining("specialties="),
      expect.anything(),
    );
  });
});

describe("loadCatalogSpecialties", () => {
  it("retorna a lista do Back em caso de sucesso", async () => {
    backFetchPaginated.mockResolvedValueOnce({ data: [{ id: 1, name: "Ansiedade" }], pagination: { page: 1, per_page: 100, total: 1, total_pages: 1 } });

    const result = await loadCatalogSpecialties();

    expect(result).toEqual([{ id: 1, name: "Ansiedade" }]);
  });

  it("retorna lista vazia (não lança) se o Back falhar — filtro é complemento, não bloqueia a página", async () => {
    backFetchPaginated.mockRejectedValueOnce(new BackApiError(500, null));

    const result = await loadCatalogSpecialties();

    expect(result).toEqual([]);
  });
});
