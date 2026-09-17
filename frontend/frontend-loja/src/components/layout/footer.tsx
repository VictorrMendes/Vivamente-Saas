import Link from "next/link";
import { Brand } from "./brand";

const FOOTER_LINKS = [
  { href: "/#a-vivamente", label: "A VivaMente" },
  { href: "/privacidade", label: "Privacidade" },
  { href: "/termos", label: "Termos" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="landing-container footer-main">
        <div><Link href="/" className="brand-link"><Brand /></Link><p className="footer-description">Aproximando pessoas.<br />Abrindo caminhos para o cuidado.</p></div>
        <div className="footer-audiences"><Link href="/contato?interesse=atendimento">Estou buscando atendimento</Link><Link href="/contato?interesse=terapeuta">Quero fazer parte da VivaMente</Link></div>
      </div>
      <div className="landing-container footer-bottom">
        <p>© {year} VivaMente Terapias</p>
        <nav aria-label="Institucional" className="flex flex-wrap gap-4">
          {FOOTER_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-sm hover:text-primary-700 focus-visible:outline-none focus-visible:shadow-focus"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
