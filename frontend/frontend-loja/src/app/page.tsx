import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
      <section className="flex flex-col gap-6 text-center sm:text-left">
        <h1 className="font-display text-h2 text-text sm:text-h1">
          Terapia com quem entende você
        </h1>
        <p className="max-w-2xl text-body text-text-muted sm:text-h6">
          Conheça terapeutas, veja os serviços e horários disponíveis, e envie
          uma solicitação de atendimento — sem cadastro, sem compromisso.
        </p>
        <div>
          <Link
            href="/contato"
            className="inline-flex h-12 items-center justify-center rounded-md bg-primary-600 px-6 font-button text-button text-text-inverse hover:bg-primary-700 focus-visible:outline-none focus-visible:shadow-focus"
          >
            Falar com a gente
          </Link>
        </div>
      </section>
    </div>
  );
}
