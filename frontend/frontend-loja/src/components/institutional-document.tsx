import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./institutional-document.module.css";

export type DocumentSection = { id: string; title: string; content: ReactNode };

export function InstitutionalDocument({ title, introduction, sections, updatedAt }: {
  title: string;
  introduction: string;
  sections: DocumentSection[];
  updatedAt?: string;
}) {
  return (
    <div className={`landing-container ${styles.document}`}>
      <header className={styles.heading} data-reveal>
        <Link href="/" className="landing-text-link">Voltar para a VivaMente</Link>
        <p className="eyebrow">VIVAMENTE TERAPIAS</p>
        <h1 className="section-title">{title}</h1>
        <p className={styles.introduction}>{introduction}</p>
        {updatedAt && <p className={styles.updated}>Atualizado em {updatedAt}</p>}
      </header>
      <div className={styles.layout}>
        <nav aria-label={`Nesta página: ${title}`} className={styles.contents}>
          <p>Nesta página</p>
          <ol>{sections.map((section) => <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>)}</ol>
        </nav>
        <article className={styles.body}>
          {sections.map((section) => (
            <section id={section.id} key={section.id} aria-labelledby={`${section.id}-title`}>
              <h2 id={`${section.id}-title`}>{section.title}</h2>
              {section.content}
            </section>
          ))}
          <nav aria-label="Mais sobre a VivaMente" className={styles.related}>
            <Link href="/sobre">Sobre a VivaMente</Link>
            <Link href="/privacidade">Privacidade</Link>
            <Link href="/termos">Termos de Uso</Link>
          </nav>
        </article>
      </div>
    </div>
  );
}
