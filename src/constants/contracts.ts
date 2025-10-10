export const CONTRACT_TYPES = {
  fornecimento: 'Fornecimento',
  servico: 'Serviço',
  locacao: 'Locação',
  manutencao: 'Manutenção',
  outros: 'Outros'
} as const;

export const CONTRACT_STATUSES = {
  rascunho: 'Rascunho',
  ativo: 'Ativo',
  suspenso: 'Suspenso',
  renovacao_pendente: 'Renovação Pendente',
  expirado: 'Expirado',
  cancelado: 'Cancelado'
} as const;

export const CONTRACT_STATUS_COLORS = {
  rascunho: 'bg-gray-100 text-gray-800',
  ativo: 'bg-green-100 text-green-800',
  suspenso: 'bg-yellow-100 text-yellow-800',
  renovacao_pendente: 'bg-orange-100 text-orange-800',
  expirado: 'bg-red-100 text-red-800',
  cancelado: 'bg-gray-100 text-gray-600'
} as const;

export const ALERT_TYPES = {
  vencimento_proximo: 'Vencimento Próximo',
  renovacao_pendente: 'Renovação Pendente',
  reajuste_programado: 'Reajuste Programado',
  revisao_necessaria: 'Revisão Necessária',
  pagamento_pendente: 'Pagamento Pendente',
  documento_expirado: 'Documento Expirado'
} as const;

export const ALERT_SEVERITIES = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica'
} as const;

export const ALERT_SEVERITY_COLORS = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
} as const;

export const EVENT_TYPES = {
  criacao: 'Criação',
  ativacao: 'Ativação',
  reajuste: 'Reajuste',
  aditivo: 'Aditivo',
  renovacao: 'Renovação',
  suspensao: 'Suspensão',
  reativacao: 'Reativação',
  cancelamento: 'Cancelamento',
  expiracao: 'Expiração',
  revisao: 'Revisão'
} as const;

export type ContractType = keyof typeof CONTRACT_TYPES;
export type ContractStatus = keyof typeof CONTRACT_STATUSES;
export type AlertType = keyof typeof ALERT_TYPES;
export type AlertSeverity = keyof typeof ALERT_SEVERITIES;
export type EventType = keyof typeof EVENT_TYPES;
