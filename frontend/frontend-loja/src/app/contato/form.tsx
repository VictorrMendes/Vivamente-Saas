"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Check, FlaskConical } from "lucide-react";

export function CompanyContactForm({ audience }: { audience: "atendimento" | "terapeuta" }) {
  const [submitted, setSubmitted] = useState(false);
  const isTherapist = audience === "terapeuta";

  function simulateSubmission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Mock visual: nao le, transmite ou persiste os dados preenchidos.
    setSubmitted(true);
  }

  return (
    <div className="company-contact-panel">
      <div className="demo-notice"><FlaskConical size={18} aria-hidden /><p><strong>Formulário de demonstração</strong><span>Use dados fictícios. Nada será enviado ou salvo.</span></p></div>
      {submitted ? (
        <div className="contact-success" role="status"><span className="section-symbol"><Check size={27} aria-hidden /></span><h2 className="section-title">Primeiro passo<br /><em>simulado.</em></h2><p>{isTherapist ? "A demonstração do interesse em fazer parte da VivaMente foi concluída." : "A demonstração do pedido de indicação foi concluída."} Nenhuma mensagem foi enviada à equipe.</p><button type="button" className="landing-button" onClick={() => setSubmitted(false)}>Testar novamente <ArrowRight size={17} aria-hidden /></button><Link href="/" className="landing-text-link">Voltar para a página inicial</Link></div>
      ) : (
        <form onSubmit={simulateSubmission} className="company-contact-form">
          <h2>{isTherapist ? "Quero fazer parte" : "Quero uma indicação"}</h2>
          <div className="contact-field"><label htmlFor="company-name">Seu nome</label><input id="company-name" name="name" autoComplete="name" maxLength={200} required /></div>
          <div className="contact-field"><label htmlFor="company-email">E-mail</label><input id="company-email" name="email" type="email" autoComplete="email" maxLength={254} required /></div>
          <div className="contact-field"><label htmlFor="company-phone">Telefone <span>(opcional)</span></label><input id="company-phone" name="phone" type="tel" autoComplete="tel" maxLength={30} /></div>
          {isTherapist && <div className="contact-field"><label htmlFor="company-specialty">Sua área de atuação</label><input id="company-specialty" name="specialty" maxLength={200} required /></div>}
          <div className="contact-field"><label htmlFor="company-message">{isTherapist ? "Conte um pouco sobre seu trabalho" : "O que você está buscando?"}</label><textarea id="company-message" name="message" rows={4} maxLength={2000} required /></div>
          <button type="submit" className="landing-button">Simular {isTherapist ? "interesse" : "solicitação"} <ArrowRight size={18} aria-hidden /></button>
          <p className="text-caption text-text-muted">Esta prévia não cria cadastro nem confirma atendimento.</p>
        </form>
      )}
    </div>
  );
}
