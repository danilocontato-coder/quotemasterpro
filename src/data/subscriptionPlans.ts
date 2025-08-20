export interface SubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  price: number;
  currency: string;
  pricing: {
    monthly: number;
    yearly: number;
    discount?: number;
    discountYearly?: number;
  };
  features: Array<{
    id: string;
    name: string;
    included: boolean;
  }>;
  limits: {
    maxQuotes: number;
    maxSuppliers: number;
    maxUsers: number;
    storageGB: number;
    maxQuotesPerMonth: number;
    maxUsersPerClient: number;
    maxSuppliersPerQuote: number;
    maxStorageGB: number;
    maxQuoteResponsesPerMonth: number;
    maxProductsInCatalog: number;
    maxCategoriesPerSupplier: number;
  };
  status: 'active' | 'inactive';
  targetAudience: 'clients' | 'suppliers' | 'both';
  isPopular: boolean;
  customizations: {
    allowBranding: boolean;
    allowCustomDomain: boolean;
    color?: string;
  };
  usageStats: {
    activeClients: number;
    totalRevenue: number;
    clientsSubscribed?: number;
    suppliersSubscribed?: number;
  };
}

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'basic',
    displayName: 'Plano Básico',
    description: 'Ideal para condomínios pequenos que estão começando',
    price: 99.90,
    currency: 'BRL',
    pricing: {
      monthly: 99.90,
      yearly: 999.00,
      discount: 15
    },
    features: [
      { id: 'quotes', name: 'Até 50 cotações por mês', included: true },
      { id: 'suppliers', name: 'Até 10 fornecedores', included: true },
      { id: 'users', name: 'Até 3 usuários', included: true },
      { id: 'email-support', name: 'Suporte por email', included: true },
      { id: 'basic-reports', name: 'Relatórios básicos', included: true }
    ],
    limits: {
      maxQuotes: 50,
      maxSuppliers: 10,
      maxUsers: 3,
      storageGB: 5,
      maxQuotesPerMonth: 50,
      maxUsersPerClient: 3,
      maxSuppliersPerQuote: 5,
      maxStorageGB: 5,
      maxQuoteResponsesPerMonth: 50,
      maxProductsInCatalog: 100,
      maxCategoriesPerSupplier: 10
    },
    status: 'active',
    targetAudience: 'clients',
    isPopular: false,
    customizations: {
      allowBranding: false,
      allowCustomDomain: false
    },
    usageStats: {
      activeClients: 150,
      totalRevenue: 14985
    }
  },
  {
    id: 'premium',
    name: 'premium', 
    displayName: 'Plano Premium',
    description: 'Perfeito para condomínios médios com necessidades avançadas',
    price: 199.90,
    currency: 'BRL',
    pricing: {
      monthly: 199.90,
      yearly: 1999.00,
      discount: 15
    },
    features: [
      { id: 'quotes', name: 'Até 200 cotações por mês', included: true },
      { id: 'suppliers', name: 'Até 50 fornecedores', included: true },
      { id: 'users', name: 'Até 10 usuários', included: true },
      { id: 'priority-support', name: 'Suporte prioritário', included: true },
      { id: 'advanced-reports', name: 'Relatórios avançados', included: true },
      { id: 'market-analysis', name: 'Análise de mercado', included: true },
      { id: 'whatsapp', name: 'Integração WhatsApp', included: true },
      { id: 'backup', name: 'Backup automático', included: true }
    ],
    limits: {
      maxQuotes: 200,
      maxSuppliers: 50,
      maxUsers: 10,
      storageGB: 20,
      maxQuotesPerMonth: 200,
      maxUsersPerClient: 10,
      maxSuppliersPerQuote: 15,
      maxStorageGB: 20,
      maxQuoteResponsesPerMonth: 200,
      maxProductsInCatalog: 500,
      maxCategoriesPerSupplier: 25
    },
    status: 'active',
    targetAudience: 'clients',
    isPopular: true,
    customizations: {
      allowBranding: true,
      allowCustomDomain: false
    },
    usageStats: {
      activeClients: 89,
      totalRevenue: 17791
    }
  },
  {
    id: 'enterprise',
    name: 'enterprise',
    displayName: 'Plano Enterprise',
    description: 'Solução completa para grandes condomínios e administradoras',
    price: 399.90,
    currency: 'BRL',
    pricing: {
      monthly: 399.90,
      yearly: 3999.00,
      discount: 15
    },
    features: [
      { id: 'quotes', name: 'Cotações ilimitadas', included: true },
      { id: 'suppliers', name: 'Fornecedores ilimitados', included: true },
      { id: 'users', name: 'Usuários ilimitados', included: true },
      { id: '247-support', name: 'Suporte 24/7', included: true },
      { id: 'custom-reports', name: 'Relatórios personalizados', included: true },
      { id: 'api', name: 'API completa', included: true },
      { id: 'integrations', name: 'Integrações avançadas', included: true },
      { id: 'manager', name: 'Manager dedicado', included: true },
      { id: 'training', name: 'Treinamento incluído', included: true }
    ],
    limits: {
      maxQuotes: -1,
      maxSuppliers: -1,
      maxUsers: -1,
      storageGB: 100,
      maxQuotesPerMonth: -1,
      maxUsersPerClient: -1,
      maxSuppliersPerQuote: -1,
      maxStorageGB: 100,
      maxQuoteResponsesPerMonth: -1,
      maxProductsInCatalog: -1,
      maxCategoriesPerSupplier: -1
    },
    status: 'active',
    targetAudience: 'clients',
    isPopular: false,
    customizations: {
      allowBranding: true,
      allowCustomDomain: true
    },
    usageStats: {
      activeClients: 23,
      totalRevenue: 9197
    }
  }
];

export const getPlanById = (planId: string): SubscriptionPlan | undefined => {
  return subscriptionPlans.find(plan => plan.id === planId);
};

export const getPlanDisplayName = (planId: string): string => {
  const plan = getPlanById(planId);
  return plan ? plan.displayName : 'Plano não encontrado';
};