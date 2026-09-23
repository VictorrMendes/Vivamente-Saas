// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { PageMotion } from "./page-motion";

vi.mock("next/navigation", () => ({ usePathname: () => "/ana-teste" }));

let enter: IntersectionObserverCallback;
const observe = vi.fn();
const unobserve = vi.fn();
const disconnect = vi.fn();
const cancel = vi.fn();
const animate = vi.fn(() => ({ cancel, onfinish: null }));
let preference: EventTarget & { matches: boolean };
const originalAnimate = Object.getOwnPropertyDescriptor(Element.prototype, "animate");
function entering(target: Element): IntersectionObserverEntry {
  const rect = target.getBoundingClientRect();
  return { target, isIntersecting: true, intersectionRatio: 1, boundingClientRect: rect, intersectionRect: rect, rootBounds: null, time: 0 };
}

beforeEach(() => {
  vi.clearAllMocks();
  preference = Object.assign(new EventTarget(), { matches: false });
  vi.stubGlobal("matchMedia", () => preference);
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: IntersectionObserverCallback) { enter = callback; }
    observe = observe;
    unobserve = unobserve;
    disconnect = disconnect;
  });
  Object.defineProperty(Element.prototype, "animate", { configurable: true, value: animate });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (originalAnimate) Object.defineProperty(Element.prototype, "animate", originalAnimate);
  else Reflect.deleteProperty(Element.prototype, "animate");
});

describe("movimento progressivo das páginas", () => {
  it("mantém conteúdo acessível e anima quando entra na tela, sem alterar atributos hidratados", () => {
    const { unmount } = render(<PageMotion><section data-reveal>Atendimentos</section></PageMotion>);
    const section = screen.getByText("Atendimentos");
    expect(observe).toHaveBeenCalledWith(section);
    expect(section.hidden).toBe(false);
    expect(animate).not.toHaveBeenCalled();
    act(() => enter([entering(section)], {} as IntersectionObserver));
    expect(animate).toHaveBeenCalledOnce();
    expect(unobserve).toHaveBeenCalledWith(section);
    expect(section.hasAttribute("style")).toBe(false);
    expect(section.hasAttribute("data-entered")).toBe(false);
    unmount();
    expect(disconnect).toHaveBeenCalled();
    expect(cancel).toHaveBeenCalled();
  });

  it("respeita movimento reduzido e cancela animações quando a preferência muda", () => {
    preference.matches = true;
    render(<PageMotion><section data-reveal>Sobre</section></PageMotion>);
    expect(observe).not.toHaveBeenCalled();
    expect(screen.getByText("Sobre").hidden).toBe(false);
    act(() => { preference.matches = false; preference.dispatchEvent(new Event("change")); });
    act(() => enter([entering(screen.getByText("Sobre"))], {} as IntersectionObserver));
    expect(animate).toHaveBeenCalledOnce();
    act(() => { preference.matches = true; preference.dispatchEvent(new Event("change")); });
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("observa conteúdo recebido depois do primeiro carregamento", async () => {
    render(<PageMotion><p>Carregando</p></PageMotion>);
    const section = document.createElement("section");
    section.dataset.reveal = "";
    section.textContent = "Serviço recebido";
    screen.getByRole("main").append(section);
    await waitFor(() => expect(observe).toHaveBeenCalledWith(section));
  });

  it("preserva o conteúdo quando o navegador não oferece IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<PageMotion><section data-reveal>Solicitar atendimento</section></PageMotion>);
    expect(screen.getByText("Solicitar atendimento").hidden).toBe(false);
    expect(animate).not.toHaveBeenCalled();
  });
});
