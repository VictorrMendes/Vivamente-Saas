import type { Metadata } from "next";
import { PendingContentNotice } from "@/components/pending-content-notice";

export const metadata: Metadata = {
  title: "Sobre",
  robots: { index: false },
};

export default function SobrePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="font-display text-h3 text-text sm:text-h2">Sobre a VivaMente Terapias</h1>
      <div className="mt-6">
        <PendingContentNotice>
          Pendência de conteúdo: o texto institucional sobre a VivaMente Terapias ainda não foi
          definido. Esta página não deve ser publicada em produção até que o conteúdo real seja
          fornecido.
        </PendingContentNotice>
      </div>
    </div>
  );
}
