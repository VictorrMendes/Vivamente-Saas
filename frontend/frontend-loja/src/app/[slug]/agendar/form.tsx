"use client";

import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useFormStatus } from "react-dom";
import type { AvailabilitySlot, PublicService } from "@/lib/api/types";
import { submitAppointmentRequest, type ActionState } from "./actions";

const initialActionState: ActionState = { fieldErrors: {}, formError: null };

// Valores vivem aqui, fora do estado da action — um <form> de Server Action
// é resetado pelo React sempre que a action retorna sem lançar (inclusive em
// erro de validação), então um input sem controle perderia tudo que a
// pessoa digitou. Mesmo padrão do /contato (form.tsx).
type Values = { name: string; email: string; phone: string; service: string; preferredSlot: string; message: string };
const EMPTY_VALUES: Values = { name: "", email: "", phone: "", service: "", preferredSlot: "", message: "" };

type Props = {
  slug: string;
  services: PublicService[];
  slots: AvailabilitySlot[];
};

const FIELD_CLASS =
  "h-12 rounded-md border border-border bg-surface px-3 text-body text-text focus-visible:outline-none focus-visible:shadow-focus";
const LABEL_CLASS = "font-body text-label uppercase tracking-label text-text-muted";

function formatSlot(slot: AvailabilitySlot): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(slot.starts_at));
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex h-12 items-center justify-center rounded-md bg-primary-600 px-6 font-button text-button text-text-inverse hover:bg-primary-700 focus-visible:outline-none focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Enviando..." : "Enviar solicitação"}
    </button>
  );
}

export function AppointmentForm({ slug, services, slots }: Props) {
  const action = submitAppointmentRequest.bind(null, slug);
  const [state, formAction] = useActionState(action, initialActionState);
  const [values, setValues] = useState<Values>(EMPTY_VALUES);

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  // Depois que a action de Server Action retorna (mesmo sem lançar), o React
  // chama form.reset() nativo do browser. Para <input>/<textarea> controlados
  // o próprio React resincroniza o valor, mas para <select> não — o evento
  // 'reset' precisa ser interceptado via listener nativo (o `onReset`
  // sintético do React não chega a tempo, é despachado depois desse reset já
  // ter zerado o <select>). Bloqueando o reset inteiro: todos os campos aqui
  // já são controlados por `values`, então o form.reset() não faz falta.
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const preventReset = (event: Event) => event.preventDefault();
    form.addEventListener("reset", preventReset);
    return () => form.removeEventListener("reset", preventReset);
  }, []);

  return (
    <form ref={formRef} action={formAction} noValidate className="mt-8 flex flex-col gap-6">
      {state.formError && (
        <div
          role="alert"
          className="rounded-lg border border-error bg-error-bg px-4 py-3 text-body-sm text-error"
        >
          {state.formError}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="name" className={LABEL_CLASS}>
          Nome
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          value={values.name}
          onChange={handleChange}
          aria-invalid={Boolean(state.fieldErrors.name)}
          aria-describedby={state.fieldErrors.name ? "name-error" : undefined}
          className={FIELD_CLASS}
        />
        {state.fieldErrors.name && (
          <p id="name-error" className="text-body-sm text-error">
            {state.fieldErrors.name}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className={LABEL_CLASS}>
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={values.email}
          onChange={handleChange}
          aria-invalid={Boolean(state.fieldErrors.email)}
          aria-describedby={state.fieldErrors.email ? "email-error" : undefined}
          className={FIELD_CLASS}
        />
        {state.fieldErrors.email && (
          <p id="email-error" className="text-body-sm text-error">
            {state.fieldErrors.email}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="phone" className={LABEL_CLASS}>
          Telefone (opcional)
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          value={values.phone}
          onChange={handleChange}
          className={FIELD_CLASS}
        />
      </div>

      {services.length > 0 && (
        <div className="flex flex-col gap-1">
          <label htmlFor="service" className={LABEL_CLASS}>
            Serviço (opcional)
          </label>
          <select
            id="service"
            name="service"
            value={values.service}
            onChange={handleChange}
            aria-invalid={Boolean(state.fieldErrors.service)}
            aria-describedby={state.fieldErrors.service ? "service-error" : undefined}
            className={FIELD_CLASS}
          >
            <option value="">Não sei / quero orientação</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
          {state.fieldErrors.service && (
            <p id="service-error" className="text-body-sm text-error">
              {state.fieldErrors.service}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="preferredSlot" className={LABEL_CLASS}>
          Horário preferido (opcional)
        </label>
        {slots.length > 0 ? (
          <select
            id="preferredSlot"
            name="preferredSlot"
            value={values.preferredSlot}
            onChange={handleChange}
            className={FIELD_CLASS}
          >
            <option value="">Sem preferência de horário</option>
            {slots.map((slot) => (
              <option key={slot.id} value={slot.starts_at}>
                {formatSlot(slot)}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-body-sm text-text-muted">
            Nenhum horário livre no momento — envie sua solicitação e combinamos um horário por
            e-mail.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="message" className={LABEL_CLASS}>
          Mensagem
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          required
          value={values.message}
          onChange={handleChange}
          aria-invalid={Boolean(state.fieldErrors.message)}
          aria-describedby={state.fieldErrors.message ? "message-error" : undefined}
          className="rounded-md border border-border bg-surface px-3 py-2 text-body text-text focus-visible:outline-none focus-visible:shadow-focus"
        />
        {state.fieldErrors.message && (
          <p id="message-error" className="text-body-sm text-error">
            {state.fieldErrors.message}
          </p>
        )}
      </div>

      <SubmitButton />
    </form>
  );
}
