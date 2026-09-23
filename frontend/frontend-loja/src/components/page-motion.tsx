"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";

/** Progressive enhancement: content stays visible without JS or observer support. */
export function PageMotion({ children }: { children: ReactNode }) {
  const main = useRef<HTMLElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const root = main.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;
    let updates: MutationObserver | undefined;
    const animations = new Set<Animation>();

    const configure = () => {
      observer?.disconnect();
      updates?.disconnect();
      animations.forEach((animation) => animation.cancel());
      animations.clear();
      if (preference.matches) return;

      const observed = new WeakSet<Element>();
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer?.unobserve(entry.target);
          if (typeof entry.target.animate !== "function") return;
          // Web Animations leaves React's streamed/hydrating attributes untouched.
          const animation = entry.target.animate([
            { opacity: 0, transform: "translateY(24px)" },
            { opacity: 1, transform: "translateY(0)" },
          ], { duration: 700, easing: "cubic-bezier(.16, 1, .3, 1)" });
          animations.add(animation);
          animation.onfinish = () => animations.delete(animation);
        });
      }, { threshold: 0, rootMargin: "0px 0px -24px 0px" });
      const observeContent = () => {
        root.querySelectorAll("[data-reveal]").forEach((element) => {
          if (observed.has(element)) return;
          observed.add(element);
          observer?.observe(element);
        });
      };
      observeContent();
      // Next can stream route content after the layout has mounted.
      updates = new MutationObserver(observeContent);
      updates.observe(root, { childList: true, subtree: true });
    };

    configure();
    preference.addEventListener("change", configure);
    return () => {
      observer?.disconnect();
      updates?.disconnect();
      animations.forEach((animation) => animation.cancel());
      preference.removeEventListener("change", configure);
    };
  }, [pathname, children]);

  return <main id="conteudo" ref={main} className="min-w-0 flex-1">{children}</main>;
}
