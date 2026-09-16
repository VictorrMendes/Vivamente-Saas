import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/sobre", label: "Sobre" },
  { href: "/contato", label: "Contato" },
  { href: "/privacidade", label: "Privacidade" },
  { href: "/termos", label: "Termos" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 text-body-sm text-text-muted sm:flex-row sm:items-center sm:justify-between">
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
