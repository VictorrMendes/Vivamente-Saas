import type { Metadata } from "next";
import { PendingContentNotice } from "@/components/pending-content-notice";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  robots: { index: false },
};

export default function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="font-display text-h3 text-text sm:text-h2">Política de Privacidade</h1>
      <div className="mt-6">
        <PendingContentNotice>
          Pendência de conteúdo: o texto jurídico da Política de Privacidade ainda não foi
          definido. Não publique esta página em produção sem revisão jurídica.
        </PendingContentNotice>
      </div>
    </div>
  );
}
