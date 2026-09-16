import Link from "next/link";

export default function ProfessionalNotFound() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="font-display text-h3 text-text">Terapeuta não encontrado</h1>
      <p className="max-w-md text-body text-text-muted">
        Esse perfil não existe ou não está mais disponível.
      </p>
      <Link
        href="/"
        className="rounded-sm font-body text-body text-primary-700 hover:underline focus-visible:outline-none focus-visible:shadow-focus"
      >
        Voltar para o início
      </Link>
    </div>
  );
}
