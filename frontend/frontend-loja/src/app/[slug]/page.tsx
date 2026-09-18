import type { Metadata } from "next";
import { loadPublicProfessional, backendErrorMessage } from "@/lib/api/professionals";
import { ProfessionalStorefront } from "@/components/professional-storefront";

type Props = {
  params: Promise<{ slug: string }>;
};

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
    <div className="professional-landing">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(personJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <ProfessionalStorefront professional={professional} />
    </div>
  );
}
