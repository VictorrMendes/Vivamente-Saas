// Valores confirmados em apps/*/views.py (chamadas a log_action) no Back real.
// Fallback pro valor cru cobre qualquer action/resource futuro não mapeado aqui.
const ACTION_LABEL: Record<string, string> = {
  create: 'Criou',
  update: 'Atualizou',
  delete: 'Excluiu',
  status_change: 'Mudou status de',
  convert: 'Converteu',
  view: 'Visualizou',
  confirmed: 'Confirmou',
  cancelled: 'Cancelou',
  completed: 'Concluiu',
};

const RESOURCE_LABEL: Record<string, string> = {
  availability_slot: 'horário de disponibilidade',
  appointment: 'agendamento',
  client: 'cliente',
  clinical_record: 'registro de prontuário',
  lead: 'lead',
  package: 'pacote',
  payment: 'pagamento',
  professional: 'profissional',
  service: 'serviço',
};

export function describeActivity(action: string, resource: string): string {
  const actionLabel = ACTION_LABEL[action] ?? action;
  const resourceLabel = RESOURCE_LABEL[resource] ?? resource;
  return `${actionLabel} ${resourceLabel}`;
}
