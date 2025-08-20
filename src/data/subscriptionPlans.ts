export interface SubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  price: number;
  currency: string;
  features: string[];
  limits: {
    maxQuotes: number;
    maxSuppliers: number;
    maxUsers: number;
    storageGB: number;
  };
  status: 'active' | 'inactive';
}

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'basic',
    displayName: 'Plano Básico',
    price: 99.90,
    currency: 'BRL',
    features: [
      'Até 50 cotações por mês',
      'Até 10 fornecedores',
      'Até 3 usuários',
      'Suporte por email',
      'Relatórios básicos'
    ],
    limits: {
      maxQuotes: 50,
      maxSuppliers: 10,
      maxUsers: 3,
      storageGB: 5
    },
    status: 'active'
  },
  {
    id: 'premium',
    name: 'premium', 
    displayName: 'Plano Premium',
    price: 199.90,
    currency: 'BRL',
    features: [
      'Até 200 cotações por mês',
      'Até 50 fornecedores',
      'Até 10 usuários',
      'Suporte prioritário',
      'Relatórios avançados',
      'Análise de mercado',
      'Integração WhatsApp',
      'Backup automático'
    ],
    limits: {
      maxQuotes: 200,
      maxSuppliers: 50,
      maxUsers: 10,
      storageGB: 20
    },
    status: 'active'
  },
  {
    id: 'enterprise',
    name: 'enterprise',
    displayName: 'Plano Enterprise',
    price: 399.90,
    currency: 'BRL',
    features: [
      'Cotações ilimitadas',
      'Fornecedores ilimitados',
      'Usuários ilimitados',
      'Suporte 24/7',
      'Relatórios personalizados',
      'API completa',
      'Integrações avançadas',
      'Manager dedicado',
      'Treinamento incluído'
    ],
    limits: {
      maxQuotes: -1, // -1 = unlimited
      maxSuppliers: -1,
      maxUsers: -1,
      storageGB: 100
    },
    status: 'active'
  }
];

export const getPlanById = (planId: string): SubscriptionPlan | undefined => {
  return subscriptionPlans.find(plan => plan.id === planId);
};

export const getPlanDisplayName = (planId: string): string => {
  const plan = getPlanById(planId);
  return plan ? plan.displayName : 'Plano não encontrado';
};