"use server";

import { redirect } from "next/navigation";
import { createAppointmentRequest } from "@/lib/api/appointment-requests";
import { BackApiError, BackUnavailableError } from "@/lib/api/back-client";
import { validateContactFields, type ContactFieldErrors } from "./validate";

export type ActionState = {
  fieldErrors: ContactFieldErrors & Partial<Record<"service", string>>;
  formError: string | null;
};

export const initialActionState: ActionState = { fieldErrors: {}, formError: null };

const GENERIC_UNAVAILABLE =
  "Não foi possível enviar sua solicitação agora. Tente novamente mais tarde.";

/**
 * O Back não devolve erro por campo estruturado nesse endpoint — só uma string
 * `detail`. Para os dois casos de validate() cruzado (professionalSlug/service
 * inválidos) ela vem limpa como "campo: mensagem"; para erros de campo padrão
 * do DRF ela vem com lixo de repr (`ErrorDetail(...)`), por isso validamos
 * name/email aqui antes de sequer chamar o Back.
 */
function parseBackDetail(detail: string | undefined): ActionState {
  if (!detail) return { fieldErrors: {}, formError: GENERIC_UNAVAILABLE };
  const match = /^service: (.+)$/.exec(detail);
  if (match) {
    return { fieldErrors: { service: match[1] }, formError: null };
  }
  return { fieldErrors: {}, formError: detail };
}

export async function submitAppointmentRequest(
  slug: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const serviceRaw = String(formData.get("service") ?? "");
  const preferredSlot = String(formData.get("preferredSlot") ?? "") || null;

  const fieldErrors: ActionState["fieldErrors"] = validateContactFields({ name, email, message });

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, formError: null };
  }

  try {
    await createAppointmentRequest({
      professionalSlug: slug,
      name,
      email,
      phone: phone || undefined,
      message: message || undefined,
      service: serviceRaw ? Number(serviceRaw) : null,
      preferredSlot,
    });
  } catch (error) {
    if (error instanceof BackApiError) {
      if (error.status === 429) {
        return {
          fieldErrors: {},
          formError: "Estamos recebendo muitas solicitações agora. Tente novamente em instantes.",
        };
      }
      if (error.status === 400) {
        return parseBackDetail(error.body?.detail);
      }
    }
    if (error instanceof BackUnavailableError || error instanceof BackApiError) {
      return { fieldErrors: {}, formError: GENERIC_UNAVAILABLE };
    }
    return { fieldErrors: {}, formError: GENERIC_UNAVAILABLE };
  }

  redirect(`/${slug}/agendar/sucesso`);
}
