import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// back-client.ts (e env.ts, que ele importa) têm `import "server-only"`, que
// lança fora do runtime do Next — neutralizado só pra este arquivo de teste,
// mesmo mecanismo de vi.mock já usado nos outros testes deste projeto.
vi.mock("server-only", () => ({}));

beforeEach(() => {
  process.env.BACK_API_URL = "http://back.test";
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("back-client — timeout contra o Back", () => {
  it("passa um AbortSignal com timeout pro fetch, pra nunca esperar indefinidamente", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { ok: true } })));
    vi.stubGlobal("fetch", fetchMock);
    const { backFetch } = await import("./back-client");

    await backFetch("/api/v1/qualquer");

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.signal.aborted).toBe(false);
  });

  it("timeout (abort) vira BackUnavailableError, não erro cru nem 'não encontrado'", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new DOMException("signal timed out", "TimeoutError"));
    vi.stubGlobal("fetch", fetchMock);
    const { backFetch, BackUnavailableError } = await import("./back-client");

    await expect(backFetch("/api/v1/qualquer")).rejects.toBeInstanceOf(BackUnavailableError);
  });

  it("não sobrescreve um signal explícito passado por quem chamou", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: {} })));
    vi.stubGlobal("fetch", fetchMock);
    const { backFetch } = await import("./back-client");
    const controller = new AbortController();

    await backFetch("/api/v1/qualquer", { signal: controller.signal });

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.signal).toBe(controller.signal);
  });
});
