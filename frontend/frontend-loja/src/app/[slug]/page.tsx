import type { Metadata } from "next";
import Link from "next/link";
import { loadPublicProfessional, backendErrorMessage } from "@/lib/api/professionals";
import type { PublicService } from "@/lib/api/types";

type Props = {
  params: Promise<{ slug: string }>;
};

const MODALITY_LABEL: Record<PublicService["modality"], string> = {
  ONLINE: "Online",
  IN_PERSON: "Presencial",
  BOTH: "Online ou presencial",
};

function getInitials(fullName: string): string {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatPrice(price: string | null): string {
  if (price === null) return "Valor sob consulta";
  const value = Number(price);
  if (Number.isNaN(value)) return "Valor sob consulta";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadPublicProfessional(slug);
  if (!result.ok) {
    return { title: "Terapeuta" };
  }

  const { professional } = result;
  const description =
    professional.bio || `Conheça ${professional.full_name} na VivaMente Terapias.`;

  return {
    title: professional.full_name,
    description,
    alternates: { canonical: `/${slug}` },
    openGraph: {
      title: professional.full_name,
      description,
      url: `/${slug}`,
      type: "profile",
      images: professional.photo_url ? [{ url: professional.photo_url }] : undefined,
    },
    twitter: {
      card: professional.photo_url ? "summary_large_image" : "summary",
      title: professional.full_name,
      description,
    },
  };
}

export default async function ProfessionalPage({ params }: Props) {
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: professional.full_name,
    description: professional.bio || undefined,
    image: professional.photo_url || undefined,
    url: `${siteUrl}/${slug}`,
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(personJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <header className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
        {professional.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- foto vem de URL externa arbitrária do Back, sem domínio fixo para configurar em next/image
          <img
            src={professional.photo_url}
            alt={professional.full_name}
            className="h-24 w-24 rounded-pill object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-24 w-24 items-center justify-center rounded-pill bg-primary-100 font-display text-h4 text-primary-700"
          >
            {getInitials(professional.full_name)}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <h1 className="font-display text-h3 text-text sm:text-h2">{professional.full_name}</h1>
          {professional.registration && (
            <p className="text-body-sm text-text-muted">{professional.registration}</p>
          )}
          {professional.specialties.length > 0 && (
            <ul className="flex flex-wrap justify-center gap-2 sm:justify-start">
              {professional.specialties.map((specialty) => (
                <li
                  key={specialty.id}
                  className="rounded-pill bg-primary-50 px-3 py-1 text-label uppercase tracking-label text-primary-700"
                >
                  {specialty.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      {professional.bio && (
        <p className="mt-8 text-body text-text-muted whitespace-pre-line">{professional.bio}</p>
      )}

      <section className="mt-12" aria-labelledby="servicos-heading">
        <h2 id="servicos-heading" className="font-display text-h4 text-text">
          Serviços
        </h2>

        {professional.services.length === 0 ? (
          <p className="mt-4 text-body text-text-muted">
            Nenhum serviço cadastrado no momento.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-4">
            {professional.services.map((service) => (
              <li
                key={service.id}
                className="rounded-lg border border-border bg-surface p-4 sm:p-6"
              >
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                  <div>
                    <h3 className="font-body text-h6 text-text">{service.name}</h3>
                    {service.description && (
                      <p className="mt-1 text-body-sm text-text-muted">{service.description}</p>
                    )}
                  </div>
                  <p className="whitespace-nowrap font-body text-body-sm text-text">
                    {formatPrice(service.price)}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-caption text-text-muted">
                  <span>{service.duration_minutes} min</span>
                  <span aria-hidden="true">·</span>
                  <span>{MODALITY_LABEL[service.modality]}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-12">
        <Link
          href={`/${slug}/agendar`}
          className="inline-flex h-12 items-center justify-center rounded-md bg-primary-600 px-6 font-button text-button text-text-inverse hover:bg-primary-700 focus-visible:outline-none focus-visible:shadow-focus"
        >
          Solicitar atendimento
        </Link>
      </div>
    </div>
  );
}
