import type { Metadata } from "next";
import { PendingContentNotice } from "@/components/pending-content-notice";

export const metadata: Metadata = {
  title: "Termos de Uso",
  robots: { index: false },
};

export default function TermosPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="font-display text-h3 text-text sm:text-h2">Termos de Uso</h1>
      <div className="mt-6">
        <PendingContentNotice>
          Pendência de conteúdo: o texto jurídico dos Termos de Uso ainda não foi definido. Não
          publique esta página em produção sem revisão jurídica.
        </PendingContentNotice>
      </div>
    </div>
  );
}
