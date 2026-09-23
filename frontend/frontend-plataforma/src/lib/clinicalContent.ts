export const clinicalFields = [
  { key: 'evolucao', label: 'Evolução da sessão', rows: 8 },
  { key: 'pontosImportantes', label: 'Pontos importantes', rows: 4 },
  { key: 'anotacoesCorriqueiras', label: 'Anotações corriqueiras', rows: 4 },
  { key: 'pontosAtencao', label: 'Pontos de atenção', rows: 4 },
] as const;
export type ClinicalContent = Record<typeof clinicalFields[number]['key'], string>;

export function parseClinicalContent(raw: string): ClinicalContent {
  const empty = { evolucao: '', pontosImportantes: '', anotacoesCorriqueiras: '', pontosAtencao: '' };
  try {
    const value = JSON.parse(raw);
    if (value && typeof value === 'object' && clinicalFields.some(({ key }) => typeof value[key] === 'string')) {
      for (const { key } of clinicalFields) empty[key] = typeof value[key] === 'string' ? value[key] : '';
      return empty;
    }
  } catch { /* Legacy plain-text notes stay readable and editable. */ }
  return { ...empty, evolucao: raw };
}

export function displayClinicalContent(raw: string): string {
  const content = parseClinicalContent(raw);
  return clinicalFields.filter(({ key }) => content[key].trim())
    .map(({ key, label }) => `${label}\n${content[key]}`).join('\n\n');
}
