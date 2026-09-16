export type ContactFieldErrors = Partial<Record<"name" | "email" | "message", string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContactFields(input: {
  name: string;
  email: string;
  message: string;
}): ContactFieldErrors {
  const errors: ContactFieldErrors = {};
  if (!input.name) errors.name = "Informe seu nome.";
  if (!input.email) {
    errors.email = "Informe seu e-mail.";
  } else if (!EMAIL_RE.test(input.email)) {
    errors.email = "Informe um e-mail válido.";
  }
  if (!input.message) errors.message = "Escreva uma mensagem para o profissional.";
  return errors;
}
