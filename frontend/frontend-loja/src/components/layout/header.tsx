"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Brand } from "./brand";

export function Header() {
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const segment = usePathname().split("/")[1];
  const isProfessional = Boolean(segment) && !["sobre", "contato", "privacidade", "termos", "terapeutas"].includes(segment);
  const navItems = isProfessional
    ? [{ href: `/${segment}#sobre`, label: "Sobre o profissional" }, { href: `/${segment}#servicos`, label: "Atendimentos" }, { href: "/#a-vivamente", label: "A VivaMente" }]
    : [{ href: "/#a-vivamente", label: "A VivaMente" }, { href: "/#para-voce", label: "Para você" }, { href: "/terapeutas", label: "Terapeutas" }, { href: "/#para-terapeutas", label: "Para terapeutas" }];
  const cta = isProfessional
    ? { href: `/${segment}/agendar`, label: "Entrar em contato" }
    : { href: "/contato?interesse=atendimento", label: "Encontre seu caminho" };

  return (
    <header className="site-header" onKeyDown={(event) => { if (event.key === "Escape" && open) { setOpen(false); menuButton.current?.focus(); } }}>
      <div className="landing-container header-inner">
        <Link href="/" className="brand-link" onClick={() => setOpen(false)}><Brand /></Link>
        <nav aria-label="Principal" className="desktop-navigation">
          {navItems.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
        </nav>
        <Link href={cta.href} className="header-cta">{cta.label} <ArrowUpRight size={16} aria-hidden /></Link>

        <button
          ref={menuButton}
          type="button"
          className="mobile-menu-button"
          aria-expanded={open}
          aria-controls="menu-mobile"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X aria-hidden size={24} /> : <Menu aria-hidden size={24} />}
        </button>
      </div>

      {open && (
        <nav id="menu-mobile" aria-label="Principal móvel" className="mobile-navigation">
          {navItems.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}</Link>)}
          <Link href={cta.href} onClick={() => setOpen(false)}>{cta.label} <ArrowUpRight size={16} aria-hidden /></Link>
        </nav>
      )}
    </header>
  );
}
