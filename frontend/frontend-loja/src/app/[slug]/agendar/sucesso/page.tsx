import type { Metadata } from "next";
import Link from "next/link";

type Props = {
  params: Promise<{ slug: string }>;
};

export const metadata: Metadata = {
  title: "Solicitação enviada",
  robots: { index: false },
};

export default async function AgendarSucessoPage({ params }: Props) {
  const { slug } = await params;

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="font-display text-h3 text-text">Solicitação enviada</h1>
      <p className="max-w-md text-body text-text-muted">
        Recebemos sua solicitação de atendimento. Isso ainda não é uma consulta confirmada — o
        profissional vai entrar em contato para combinar os próximos passos.
      </p>
      <Link
        href={`/${slug}`}
        className="rounded-sm font-body text-body text-primary-700 hover:underline focus-visible:outline-none focus-visible:shadow-focus"
      >
        Voltar para o perfil
      </Link>
    </div>
  );
}
