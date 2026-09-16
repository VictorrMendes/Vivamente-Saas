export function formatPrice(price: string | null): string {
  if (price === null) return "Valor sob consulta";
  const value = Number(price);
  if (Number.isNaN(value)) return "Valor sob consulta";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function getInitials(fullName: string): string {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
