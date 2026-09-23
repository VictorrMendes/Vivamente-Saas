// Contador "n/máx" dos campos longos: o maxLength do navegador corta em
// silêncio (principalmente ao colar), o contador mostra quanto falta.
export function FieldCount({ value, max }: { value: string; max: number }) {
  const near = value.length >= max * 0.9;
  return (
    <p
      className={`text-right text-caption ${near ? "text-error" : "text-text-muted"}`}
      aria-live={near ? "polite" : "off"}
    >
      {value.length}/{max}
    </p>
  );
}
