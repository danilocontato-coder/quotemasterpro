export interface WeightConfig {
  price: number;          // 0-100
  deliveryTime: number;   // 0-100
  shippingCost: number;   // 0-100
  warranty: number;       // 0-100
  deliveryScore: number;  // 0-100 (substitui sla)
  reputation: number;     // 0-100
}

export interface ProposalMetrics {
  price: number;
  deliveryTime: number;
  shippingCost: number;
  warranty: number;
  deliveryScore: number;  // substitui sla
  reputation: number;
}

/**
 * Normaliza um valor para escala 0-100
 * @param value - Valor a normalizar
 * @param min - Valor mínimo da escala
 * @param max - Valor máximo da escala
 * @param inverse - Se true, inverte a escala (para custos: menor é melhor)
 */
const normalize = (
  value: number, 
  min: number, 
  max: number, 
  inverse: boolean = false
): number => {
  if (max === min) return 50; // todos iguais = score neutro
  const normalized = ((value - min) / (max - min)) * 100;
  return inverse ? 100 - normalized : normalized;
};

/**
 * Calcula score ponderado de uma proposta
 * @param proposal - Métricas da proposta a avaliar
 * @param allProposals - Todas as propostas para calcular min/max
 * @param weights - Pesos configurados (soma deve ser 100)
 * @returns Score ponderado de 0-100
 */
export const calculateWeightedScore = (
  proposal: ProposalMetrics,
  allProposals: ProposalMetrics[],
  weights: WeightConfig
): number => {
  // Calcular min/max de cada métrica
  const priceRange = {
    min: Math.min(...allProposals.map(p => p.price)),
    max: Math.max(...allProposals.map(p => p.price))
  };
  
  const timeRange = {
    min: Math.min(...allProposals.map(p => p.deliveryTime)),
    max: Math.max(...allProposals.map(p => p.deliveryTime))
  };
  
  const shippingRange = {
    min: Math.min(...allProposals.map(p => p.shippingCost)),
    max: Math.max(...allProposals.map(p => p.shippingCost))
  };
  
  const deliveryScoreRange = {
    min: Math.min(...allProposals.map(p => p.deliveryScore)),
    max: Math.max(...allProposals.map(p => p.deliveryScore))
  };
  
  const warrantyRange = {
    min: Math.min(...allProposals.map(p => p.warranty)),
    max: Math.max(...allProposals.map(p => p.warranty))
  };
  
  const reputationRange = {
    min: Math.min(...allProposals.map(p => p.reputation)),
    max: Math.max(...allProposals.map(p => p.reputation))
  };
  
  // Normalizar cada dimensão (inverse=true para custos)
  const priceScore = normalize(proposal.price, priceRange.min, priceRange.max, true);
  const timeScore = normalize(proposal.deliveryTime, timeRange.min, timeRange.max, true);
  const shippingScore = normalize(proposal.shippingCost, shippingRange.min, shippingRange.max, true);
  const deliveryScoreNormalized = normalize(proposal.deliveryScore, deliveryScoreRange.min, deliveryScoreRange.max, false); // maior = melhor
  const warrantyScore = normalize(proposal.warranty, warrantyRange.min, warrantyRange.max, false);
  const reputationScore = normalize(proposal.reputation, reputationRange.min, reputationRange.max, false);
  
  // Aplicar pesos (dividir por 100 para converter % em decimal)
  const weightedScore = 
    (priceScore * weights.price / 100) +
    (timeScore * weights.deliveryTime / 100) +
    (shippingScore * weights.shippingCost / 100) +
    (deliveryScoreNormalized * weights.deliveryScore / 100) +
    (warrantyScore * weights.warranty / 100) +
    (reputationScore * weights.reputation / 100);
  
  return Math.round(weightedScore * 10) / 10; // arredondar para 1 casa decimal
};

/**
 * Valida se os pesos somam 100%
 */
export const validateWeights = (weights: WeightConfig): boolean => {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  return Math.abs(sum - 100) < 0.01; // tolerância para erros de arredondamento
};

/**
 * Templates de pesos pré-definidos
 */
export const DEFAULT_WEIGHT_TEMPLATES = {
  equilibrado: {
    price: 40,
    deliveryTime: 20,
    shippingCost: 15,
    warranty: 12,
    deliveryScore: 8,
    reputation: 5
  },
  focoPreco: {
    price: 70,
    deliveryTime: 10,
    shippingCost: 15,
    warranty: 3,
    deliveryScore: 0,
    reputation: 2
  },
  focoQualidade: {
    price: 20,
    deliveryTime: 15,
    shippingCost: 10,
    warranty: 25,
    deliveryScore: 15,
    reputation: 15
  },
  urgente: {
    price: 25,
    deliveryTime: 50,
    shippingCost: 10,
    warranty: 3,
    deliveryScore: 10,
    reputation: 2
  }
};
