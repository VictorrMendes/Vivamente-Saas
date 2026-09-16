import type { Metadata } from "next";
import { loadPublicProfessional, backendErrorMessage } from "@/lib/api/professionals";
import { getAvailableSlots } from "@/lib/api/availability";
import { AppointmentForm } from "./form";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: "Solicitar atendimento",
    alternates: { canonical: `/${slug}/agendar` },
  };
}

export default async function AgendarPage({ params }: Props) {
  const { slug } = await params;
  const result = await loadPublicProfessional(slug);

  if (!result.ok) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div
          role="alert"
          className="rounded-lg border border-error bg-error-bg px-4 py-3 text-body text-error"
        >
          {backendErrorMessage(result.reason)}
        </div>
      </div>
    );
  }

  const { professional } = result;
  // Horários são um extra do formulário, não um bloqueio: se a busca falhar,
  // a solicitação ainda pode ser enviada sem preferência de horário.
  const slots = await getAvailableSlots(slug).catch(() => []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <h1 className="font-display text-h3 text-text sm:text-h2">
        Solicitar atendimento com {professional.full_name}
      </h1>
      <p className="mt-2 text-body text-text-muted">
        Preencha seus dados abaixo. Isso cria uma solicitação de contato — não é uma consulta
        confirmada.
      </p>

      <AppointmentForm slug={slug} services={professional.services} slots={slots} />
    </div>
  );
}
