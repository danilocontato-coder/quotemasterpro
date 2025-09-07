// Mock data for AI Negotiations

export interface MockAINegotiation {
  id: string;
  quote_id: string;
  status: 'pending' | 'analyzing' | 'negotiating' | 'completed' | 'approved' | 'rejected';
  original_amount: number;
  negotiated_amount?: number;
  analysis_reason?: string;
  negotiation_strategy?: string;
  conversation_log?: Array<{
    role: 'ai' | 'supplier';
    message: string;
    timestamp: string;
  }>;
  created_at: string;
  updated_at: string;
  // Dados da cotação relacionada
  quote?: {
    id: string;
    description: string;
    supplier?: {
      id: string;
      name: string;
    };
  };
}

export const mockAINegotiations: MockAINegotiation[] = [
  {
    id: 'neg-001',
    quote_id: 'quote-001',
    status: 'completed',
    original_amount: 15000.00,
    negotiated_amount: 13500.00,
    analysis_reason: 'Preço 15% acima da média de mercado para produtos similares. Margem de negociação identificada baseada no histórico do fornecedor.',
    negotiation_strategy: 'Abordagem colaborativa enfatizando relacionamento de longo prazo e volume de compras futuras.',
    conversation_log: [
      {
        role: 'ai',
        message: 'Olá! Analisamos sua proposta de R$ 15.000,00 e identificamos uma oportunidade de otimização. Baseado no histórico de compras e na parceria de longo prazo, gostaríamos de discutir um ajuste no valor.',
        timestamp: '2024-12-07T10:30:00Z'
      },
      {
        role: 'supplier',
        message: 'Entendo. Qual seria a proposta de vocês?',
        timestamp: '2024-12-07T10:35:00Z'
      },
      {
        role: 'ai',
        message: 'Considerando o volume e a frequência de nossas compras, propomos R$ 13.500,00. Isso representaria uma economia significativa para nós e manteria a margem adequada para vocês.',
        timestamp: '2024-12-07T10:40:00Z'
      },
      {
        role: 'supplier',
        message: 'É uma proposta interessante. Posso fechar nesse valor considerando o relacionamento e o volume mensal.',
        timestamp: '2024-12-07T10:45:00Z'
      },
      {
        role: 'ai',
        message: 'Perfeito! Muito obrigado pela flexibilidade. Vou encaminhar para aprovação final da equipe.',
        timestamp: '2024-12-07T10:50:00Z'
      }
    ],
    created_at: '2024-12-07T10:00:00Z',
    updated_at: '2024-12-07T10:50:00Z',
    quote: {
      id: 'quote-001',
      description: 'Material de limpeza para dezembro',
      supplier: {
        id: 'supplier-001',
        name: 'Fornecedor Alpha Ltda'
      }
    }
  },
  {
    id: 'neg-002',
    quote_id: 'quote-002',
    status: 'approved',
    original_amount: 8500.00,
    negotiated_amount: 7800.00,
    analysis_reason: 'Preço competitivo, mas com margem para negociação devido ao prazo de pagamento estendido solicitado.',
    negotiation_strategy: 'Negociação baseada em prazo de pagamento e garantia de pedidos futuros.',
    conversation_log: [
      {
        role: 'ai',
        message: 'Boa tarde! Sua proposta de R$ 8.500,00 está bem alinhada com o mercado. Gostaríamos de propor R$ 7.800,00 em troca de um prazo de pagamento de 45 dias.',
        timestamp: '2024-12-06T14:20:00Z'
      },
      {
        role: 'supplier',
        message: 'O prazo de 45 dias é interessante para nosso fluxo de caixa. Aceito a proposta de R$ 7.800,00.',
        timestamp: '2024-12-06T14:30:00Z'
      }
    ],
    created_at: '2024-12-06T14:00:00Z',
    updated_at: '2024-12-06T14:30:00Z',
    quote: {
      id: 'quote-002',
      description: 'Equipamentos de segurança',
      supplier: {
        id: 'supplier-002',
        name: 'Beta Equipamentos'
      }
    }
  },
  {
    id: 'neg-003',
    quote_id: 'quote-003',
    status: 'negotiating',
    original_amount: 22000.00,
    analysis_reason: 'Preço elevado comparado a propostas similares. Histórico mostra que fornecedor costuma aceitar redução de 8-12%.',
    negotiation_strategy: 'Apresentar comparativo de mercado e propor desconto por volume.',
    conversation_log: [
      {
        role: 'ai',
        message: 'Olá! Recebemos sua proposta de R$ 22.000,00. Após análise de mercado, identificamos que o valor está 12% acima da média. Poderíamos trabalhar com R$ 19.500,00?',
        timestamp: '2024-12-07T09:15:00Z'
      },
      {
        role: 'supplier',
        message: 'O valor proposto está muito baixo considerando a qualidade dos produtos. Posso oferecer R$ 21.000,00 como desconto máximo.',
        timestamp: '2024-12-07T09:45:00Z'
      },
      {
        role: 'ai',
        message: 'Compreendo a preocupação com a qualidade. Que tal encontrarmos um meio termo em R$ 20.200,00? Isso representaria uma economia para nós mantendo uma margem justa para vocês.',
        timestamp: '2024-12-07T10:00:00Z'
      }
    ],
    created_at: '2024-12-07T09:00:00Z',
    updated_at: '2024-12-07T10:00:00Z',
    quote: {
      id: 'quote-003',
      description: 'Reforma do salão de festas',
      supplier: {
        id: 'supplier-003',
        name: 'Gamma Construções'
      }
    }
  },
  {
    id: 'neg-004',
    quote_id: 'quote-004',
    status: 'analyzing',
    original_amount: 5600.00,
    analysis_reason: 'Analisando histórico de preços e comparando com outras propostas recebidas.',
    created_at: '2024-12-07T11:00:00Z',
    updated_at: '2024-12-07T11:00:00Z',
    quote: {
      id: 'quote-004',
      description: 'Manutenção de elevadores',
      supplier: {
        id: 'supplier-004',
        name: 'Delta Elevadores'
      }
    }
  },
  {
    id: 'neg-005',
    quote_id: 'quote-005',
    status: 'rejected',
    original_amount: 18000.00,
    negotiated_amount: 16200.00,
    analysis_reason: 'Preço muito acima do orçamento disponível. Tentativa de negociação não obteve sucesso.',
    negotiation_strategy: 'Abordagem direta com limite orçamentário claro.',
    conversation_log: [
      {
        role: 'ai',
        message: 'Sua proposta de R$ 18.000,00 está acima do nosso orçamento de R$ 16.000,00. Seria possível um ajuste?',
        timestamp: '2024-12-05T15:20:00Z'
      },
      {
        role: 'supplier',
        message: 'Infelizmente não conseguimos trabalhar abaixo de R$ 17.500,00 devido aos custos dos materiais.',
        timestamp: '2024-12-05T15:45:00Z'
      },
      {
        role: 'ai',
        message: 'Compreendo as limitações. Nosso orçamento máximo seria R$ 16.200,00. É possível?',
        timestamp: '2024-12-05T16:00:00Z'
      },
      {
        role: 'supplier',
        message: 'Lamento, mas não conseguimos atender a essa solicitação mantendo a qualidade.',
        timestamp: '2024-12-05T16:15:00Z'
      }
    ],
    created_at: '2024-12-05T15:00:00Z',
    updated_at: '2024-12-05T16:15:00Z',
    quote: {
      id: 'quote-005',
      description: 'Jardinagem e paisagismo',
      supplier: {
        id: 'supplier-005',
        name: 'Epsilon Jardins'
      }
    }
  },
  {
    id: 'neg-006',
    quote_id: 'quote-006',
    status: 'pending',
    original_amount: 12500.00,
    analysis_reason: 'Aguardando análise completa de todas as propostas recebidas para esta cotação.',
    created_at: '2024-12-07T12:00:00Z',
    updated_at: '2024-12-07T12:00:00Z',
    quote: {
      id: 'quote-006',
      description: 'Sistema de monitoramento',
      supplier: {
        id: 'supplier-006',
        name: 'Zeta Segurança'
      }
    }
  }
];

// Função helper para obter negociações por status
export const getNegotiationsByStatus = (status: MockAINegotiation['status']) => {
  return mockAINegotiations.filter(neg => neg.status === status);
};

// Função helper para obter estatísticas das negociações
export const getNegotiationStats = () => {
  const total = mockAINegotiations.length;
  const completed = mockAINegotiations.filter(n => n.status === 'completed' || n.status === 'approved').length;
  const totalSavings = mockAINegotiations
    .filter(n => n.negotiated_amount && n.original_amount)
    .reduce((sum, n) => sum + (n.original_amount - n.negotiated_amount!), 0);
  
  const negotiationsWithSavings = mockAINegotiations.filter(n => n.negotiated_amount && n.original_amount);
  const averageDiscount = negotiationsWithSavings.length > 0 
    ? negotiationsWithSavings.reduce((sum, n) => sum + ((n.original_amount - n.negotiated_amount!) / n.original_amount * 100), 0) / negotiationsWithSavings.length
    : 0;
  
  const successRate = total > 0 ? (completed / total) * 100 : 0;

  return {
    total,
    completed,
    totalSavings,
    averageDiscount,
    successRate
  };
};