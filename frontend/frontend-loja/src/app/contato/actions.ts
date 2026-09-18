"use server";

import { createInstitutionalRequest } from "@/lib/api/institutional-requests";
import { BackApiError, BackUnavailableError } from "@/lib/api/back-client";
import { validateContactFields, type ContactFieldErrors } from "../[slug]/agendar/validate";
import type { InstitutionalRequestKind } from "@/lib/api/types";

export type ContactActionState = {
  fieldErrors: ContactFieldErrors;
  formError: string | null;
  success: boolean;
};

const GENERIC_UNAVAILABLE =
  "Não foi possível enviar sua mensagem agora. Tente novamente mais tarde.";

const KIND_BY_AUDIENCE: Record<"atendimento" | "terapeuta", InstitutionalRequestKind> = {
  atendimento: "PATIENT",
  terapeuta: "THERAPIST_INTEREST",
};

export async function submitCompanyContact(
  audience: "atendimento" | "terapeuta",
  _prevState: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const specialty = String(formData.get("specialty") ?? "").trim();
  let message = String(formData.get("message") ?? "").trim();

  const fieldErrors = validateContactFields({ name, email, message });
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, formError: null, success: false };
  }

  if (audience === "terapeuta" && specialty) {
    message = `Área de atuação: ${specialty}\n${message}`;
  }

  try {
    await createInstitutionalRequest({
      kind: KIND_BY_AUDIENCE[audience],
      name,
      email,
      phone: phone || undefined,
      message,
    });
  } catch (error) {
    if (error instanceof BackApiError && error.status === 429) {
      return {
        fieldErrors: {},
        formError: "Estamos recebendo muitas mensagens agora. Tente novamente em instantes.",
        success: false,
      };
    }
    if (error instanceof BackApiError && error.status === 400) {
      // Não é "indisponível" - é um erro de validação de verdade (ex: telefone
      // além do limite do Back). Campo/campo não é necessário aqui (todo
      // input já é limitado no HTML com os mesmos limites do Back), mas a
      // mensagem não pode dizer "tente mais tarde" pra um erro que não some sozinho.
      return { fieldErrors: {}, formError: error.body?.detail ?? GENERIC_UNAVAILABLE, success: false };
    }
    if (error instanceof BackUnavailableError || error instanceof BackApiError) {
      return { fieldErrors: {}, formError: GENERIC_UNAVAILABLE, success: false };
    }
    return { fieldErrors: {}, formError: GENERIC_UNAVAILABLE, success: false };
  }

  return { fieldErrors: {}, formError: null, success: true };
}
