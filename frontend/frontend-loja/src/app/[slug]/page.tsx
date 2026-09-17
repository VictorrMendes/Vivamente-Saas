import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Clock3, Leaf, MapPin, MessageCircle, Video } from "lucide-react";
import { loadPublicProfessional, backendErrorMessage } from "@/lib/api/professionals";
import { formatPrice } from "@/lib/format";
import { ProfessionalPortrait } from "@/components/professional-portrait";
import type { PublicService } from "@/lib/api/types";

type Props = {
  params: Promise<{ slug: string }>;
};

const MODALITY_LABEL: Record<PublicService["modality"], string> = {
  ONLINE: "Online",
  IN_PERSON: "Presencial",
  BOTH: "Online ou presencial",
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

      <section className="landing-container professional-hero" aria-labelledby="professional-name">
        <div className="professional-hero-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> UM ENCONTRO COM O CUIDADO</p>
          <h1 id="professional-name" className="professional-title">{professional.full_name}</h1>
          {professional.registration && <p className="professional-registration">{professional.registration}</p>}
          {professional.specialties.length > 0 && <ul className="specialty-list">{professional.specialties.map((specialty) => <li key={specialty.id}>{specialty.name}</li>)}</ul>}
          <p className="hero-description">Conheça meu trabalho e as possibilidades de atendimento. Quando fizer sentido para você, podemos começar uma conversa.</p>
          <div className="landing-actions"><Link className="landing-button" href={`/${slug}/agendar`}>Solicitar atendimento <ArrowUpRight size={18} aria-hidden /></Link><a className="landing-text-link" href="#sobre">Conheça meu trabalho <ArrowRight size={17} aria-hidden /></a></div>
          <p className="professional-network"><Leaf size={17} strokeWidth={1.5} aria-hidden /> Profissional na VivaMente Terapias</p>
        </div>
        <div className="portrait-composition"><span className="portrait-outline" aria-hidden /><ProfessionalPortrait name={professional.full_name} photoUrl={professional.photo_url} /><span className="portrait-note"><MessageCircle size={19} strokeWidth={1.4} aria-hidden /> O primeiro passo é uma conversa.</span></div>
      </section>

      <section id="sobre" className="professional-about section-anchor" aria-labelledby="about-title">
        <div className="landing-container professional-about-layout"><div><p className="eyebrow">PRAZER EM CONHECER VOCÊ</p><h2 id="about-title" className="section-title">Por trás de cada<br />atendimento,<br /><em>uma pessoa.</em></h2></div><div className="professional-bio">{professional.bio ? <p>{professional.bio}</p> : <p>Quer conhecer mais sobre meu trabalho? Entre em contato para conversar sobre os atendimentos e tirar suas dúvidas.</p>}<a href="#servicos" className="landing-text-link">Veja os atendimentos <ArrowRight size={17} aria-hidden /></a></div></div>
      </section>

      <section id="servicos" className="landing-container services-section section-anchor" aria-labelledby="services-title">
        <div className="section-heading"><div><p className="eyebrow">POSSIBILIDADES DE CUIDADO</p><h2 id="services-title" className="section-title">Como posso te acompanhar</h2></div><p>Conheça os serviços e encontre o ponto de partida para a nossa conversa.</p></div>
        {professional.services.length === 0 ? <div className="services-empty"><MessageCircle size={27} strokeWidth={1.3} aria-hidden /><h3>Vamos conversar sobre o que você procura?</h3><p>Os serviços ainda não foram apresentados nesta página. Você pode enviar uma mensagem para saber mais.</p><Link href={`/${slug}/agendar`} className="landing-text-link">Entrar em contato <ArrowRight size={17} aria-hidden /></Link></div> :
          <ul className="service-list">{professional.services.map((service, index) => <li key={service.id}><span className="service-number">{String(index + 1).padStart(2, "0")}</span><div className="service-description"><h3>{service.name}</h3>{service.description && <p>{service.description}</p>}<div className="service-facts"><span><Clock3 size={15} aria-hidden /> {service.duration_minutes} min</span><span>{service.modality === "IN_PERSON" ? <MapPin size={15} aria-hidden /> : <Video size={15} aria-hidden />} {MODALITY_LABEL[service.modality]}</span></div></div><div className="service-next"><p>{formatPrice(service.price)}</p><Link href={`/${slug}/agendar`} aria-label={`Consultar sobre ${service.name}`}>Conversar sobre este serviço <ArrowUpRight size={17} aria-hidden /></Link></div></li>)}</ul>}
      </section>

      <section className="professional-process" aria-labelledby="process-title"><div className="landing-container"><p className="eyebrow">NO SEU TEMPO</p><h2 id="process-title" className="section-title">Uma conversa de cada vez.</h2><ol className="professional-steps"><li><span>01</span><h3>Envie sua solicitação</h3><p>Conte brevemente o que procura. Se quiser, informe um serviço e um horário de preferência.</p></li><li><span>02</span><h3>Alinhe os detalhes</h3><p>O contato permite conversar sobre o atendimento, a modalidade e a disponibilidade.</p></li><li><span>03</span><h3>Confirme o encontro</h3><p>A consulta só fica confirmada depois que você e o profissional combinam os detalhes.</p></li></ol></div></section>

      <section className="landing-container professional-invitation" aria-labelledby="contact-title"><Leaf size={32} strokeWidth={1.2} aria-hidden /><p className="eyebrow">QUANDO FIZER SENTIDO PARA VOCÊ</p><h2 id="contact-title" className="section-title">Seu próximo passo pode ser<br /><em>uma conversa.</em></h2><p>Você não precisa ter tudo definido para entrar em contato.</p><Link href={`/${slug}/agendar`} className="landing-button">Falar com {professional.full_name} <ArrowUpRight size={18} aria-hidden /></Link><span className="text-caption text-text-muted">Enviar uma solicitação não confirma uma consulta.</span></section>
    </div>
  );
}
