import "server-only";

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Variável de ambiente ausente: ${name}`);
  }
  return value;
}

export const env = {
  backApiUrl: required("BACK_API_URL", process.env.BACK_API_URL),
};
