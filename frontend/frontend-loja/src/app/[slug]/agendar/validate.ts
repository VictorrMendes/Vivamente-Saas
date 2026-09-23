import { LIMITS } from "@/lib/field-limits";

export type ContactFieldErrors = Partial<Record<"name" | "email" | "phone" | "message", string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// O maxLength do input já barra a digitação; isto cobre quem burla o navegador
// (a action é o limite de verdade antes de chegar no Back).
function tooLong(label: string, max: number) {
  return `${label} pode ter no máximo ${max} caracteres.`;
}

export function validateContactFields(input: {
  name: string;
  email: string;
  message: string;
  phone?: string;
}): ContactFieldErrors {
  const errors: ContactFieldErrors = {};
  if (!input.name) errors.name = "Informe seu nome.";
  else if (input.name.length > LIMITS.name) errors.name = tooLong("O nome", LIMITS.name);
  if (!input.email) {
    errors.email = "Informe seu e-mail.";
  } else if (input.email.length > LIMITS.email) {
    errors.email = tooLong("O e-mail", LIMITS.email);
  } else if (!EMAIL_RE.test(input.email)) {
    errors.email = "Informe um e-mail válido.";
  }
  if (input.phone && input.phone.length > LIMITS.phone) errors.phone = tooLong("O telefone", LIMITS.phone);
  if (!input.message) errors.message = "Escreva uma mensagem para o profissional.";
  else if (input.message.length > LIMITS.message) errors.message = tooLong("A mensagem", LIMITS.message);
  return errors;
}
