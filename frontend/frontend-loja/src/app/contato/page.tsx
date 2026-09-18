import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, HeartHandshake, UsersRound } from "lucide-react";
import { isMockEnabled } from "@/lib/api/mocks";
import { CompanyContactForm } from "./form";

export const metadata: Metadata = { title: "Converse com a VivaMente", robots: { index: false, follow: false } };

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ interesse?: string }> }) {
  const { interesse } = await searchParams;
  const audience = interesse === "terapeuta" ? "terapeuta" : "atendimento";
  const isTherapist = audience === "terapeuta";
  return (
    <div className="landing-container company-contact-layout">
      <div className="contact-introduction">
        <Link href={isTherapist ? "/#para-terapeutas" : "/#para-voce"} className="landing-text-link"><ArrowLeft size={16} aria-hidden /> Voltar para a VivaMente</Link>
        <span className="section-symbol">{isTherapist ? <UsersRound size={28} strokeWidth={1.4} aria-hidden /> : <HeartHandshake size={28} strokeWidth={1.4} aria-hidden />}</span>
        <p className="eyebrow">{isTherapist ? "PARA QUEM ESCOLHEU CUIDAR" : "PARA QUEM BUSCA ATENDIMENTO"}</p>
        <h1 className="section-title">{isTherapist ? <>Vamos conhecer<br /><em>o seu trabalho?</em></> : <>Vamos encontrar<br /><em>um caminho?</em></>}</h1>
        <p className="section-description">{isTherapist ? "Apresente sua atuação e conte por que gostaria de fazer parte da VivaMente." : "Conte o que está buscando. A proposta é ajudar você a conhecer profissionais da rede VivaMente."}</p>
        <p className="contact-note">{isTherapist ? "Esta conversa é uma manifestação de interesse, não um cadastro automático na plataforma." : "Não é necessário compartilhar diagnósticos ou detalhes íntimos. Uma breve apresentação é suficiente para começar."}</p>
      </div>
      <CompanyContactForm key={audience} audience={audience} isMock={isMockEnabled()} />
    </div>
  );
}
