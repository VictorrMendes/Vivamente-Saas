"use client";

import { useActionState, useState, type ChangeEvent } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { ArrowRight, Check, FlaskConical } from "lucide-react";
import { submitCompanyContact, type ContactActionState } from "./actions";

const initialActionState: ContactActionState = { fieldErrors: {}, formError: null, success: false };

// Valores vivem aqui, fora do estado da action — um <form> de Server Action
// é resetado pelo React sempre que a action retorna sem lançar (inclusive em
// erro de validação), então um input sem controle perderia tudo que a
// pessoa digitou. Mantendo o valor em estado do componente, o reset do DOM
// não importa: o React reaplica esse valor no controlled input no mesmo render.
type Values = { name: string; email: string; phone: string; specialty: string; message: string };
const EMPTY_VALUES: Values = { name: "", email: "", phone: "", specialty: "", message: "" };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="landing-button" disabled={pending} aria-busy={pending}>
      {pending ? "Enviando..." : label} <ArrowRight size={18} aria-hidden />
    </button>
  );
}

export function CompanyContactForm({ audience, isMock }: { audience: "atendimento" | "terapeuta"; isMock: boolean }) {
  const isTherapist = audience === "terapeuta";
  const action = submitCompanyContact.bind(null, audience);
  const [state, formAction] = useActionState(action, initialActionState);
  const [values, setValues] = useState<Values>(EMPTY_VALUES);

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  return (
    <div className="company-contact-panel">
      {isMock && (
        <div className="demo-notice">
          <FlaskConical size={18} aria-hidden />
          <p><strong>Ambiente de demonstração</strong><span>O Back real não está configurado nesta instância — nada é enviado de verdade.</span></p>
        </div>
      )}
      {state.success ? (
        <div className="contact-success" role="status">
          <span className="section-symbol"><Check size={27} aria-hidden /></span>
          <h2 className="section-title">Mensagem<br /><em>enviada.</em></h2>
          <p>
            {isMock
              ? "Isso foi simulado — ambiente de demonstração, nada foi enviado de verdade."
              : isTherapist
                ? "Recebemos sua manifestação de interesse. A equipe VivaMente vai entrar em contato."
                : "Recebemos seu pedido de indicação. A equipe VivaMente vai entrar em contato para ajudar você a encontrar um caminho."}
          </p>
          <Link href="/" className="landing-text-link">Voltar para a página inicial</Link>
        </div>
      ) : (
        <form action={formAction} noValidate className="company-contact-form">
          <h2>{isTherapist ? "Quero fazer parte" : "Quero uma indicação"}</h2>

          {state.formError && (
            <div role="alert" className="rounded-lg border border-error bg-error-bg px-4 py-3 text-body-sm text-error">
              {state.formError}
            </div>
          )}

          <div className="contact-field">
            <label htmlFor="company-name">Seu nome</label>
            <input
              id="company-name" name="name" autoComplete="name" maxLength={200} required
              value={values.name} onChange={handleChange}
              aria-invalid={Boolean(state.fieldErrors.name)}
              aria-describedby={state.fieldErrors.name ? "company-name-error" : undefined}
            />
            {state.fieldErrors.name && <p id="company-name-error" className="text-body-sm text-error">{state.fieldErrors.name}</p>}
          </div>

          <div className="contact-field">
            <label htmlFor="company-email">E-mail</label>
            <input
              id="company-email" name="email" type="email" autoComplete="email" maxLength={254} required
              value={values.email} onChange={handleChange}
              aria-invalid={Boolean(state.fieldErrors.email)}
              aria-describedby={state.fieldErrors.email ? "company-email-error" : undefined}
            />
            {state.fieldErrors.email && <p id="company-email-error" className="text-body-sm text-error">{state.fieldErrors.email}</p>}
          </div>

          <div className="contact-field">
            <label htmlFor="company-phone">Telefone <span>(opcional)</span></label>
            <input
              id="company-phone" name="phone" type="tel" autoComplete="tel" maxLength={30}
              value={values.phone} onChange={handleChange}
            />
          </div>

          {isTherapist && (
            <div className="contact-field">
              <label htmlFor="company-specialty">Sua área de atuação <span>(opcional)</span></label>
              <input
                id="company-specialty" name="specialty" maxLength={200}
                value={values.specialty} onChange={handleChange}
              />
            </div>
          )}

          <div className="contact-field">
            <label htmlFor="company-message">{isTherapist ? "Conte um pouco sobre seu trabalho" : "O que você está buscando?"}</label>
            <textarea
              id="company-message" name="message" rows={4} required
              value={values.message} onChange={handleChange}
              aria-invalid={Boolean(state.fieldErrors.message)}
              aria-describedby={state.fieldErrors.message ? "company-message-error" : undefined}
            />
            {state.fieldErrors.message && <p id="company-message-error" className="text-body-sm text-error">{state.fieldErrors.message}</p>}
          </div>

          <SubmitButton label={isTherapist ? "Enviar interesse" : "Enviar solicitação"} />
          <p className="text-caption text-text-muted">
            {isTherapist
              ? "Isso é uma manifestação de interesse — não cria conta nem publica um perfil automaticamente."
              : "Isso cria um pedido de contato — não é uma consulta confirmada."}
          </p>
        </form>
      )}
    </div>
  );
}
