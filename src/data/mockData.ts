// Mock data for QuoteMaster Pro
export interface Quote {
  id: string;
  description: string;
  total: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'completed';
  clientId: string;
  clientName: string;
  supplierId?: string;
  supplierName?: string;
  createdAt: string;
  updatedAt: string;
  items: QuoteItem[];
}

export interface QuoteItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Supplier {
  id: string;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  whatsapp?: string;
  address: string;
  status: 'active' | 'inactive';
  subscriptionPlan: 'basic' | 'premium' | 'enterprise';
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  status: 'active' | 'inactive';
  subscriptionPlan: 'basic' | 'premium' | 'enterprise';
  createdAt: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  stockQuantity: number;
  unitPrice: number;
  supplierId?: string;
  status: 'active' | 'inactive';
}

// Mock data
export const mockQuotes: Quote[] = [
  {
    id: '1',
    description: 'Materiais de construção para reforma do bloco A',
    total: 15750.00,
    status: 'pending',
    clientId: '1',
    clientName: 'Condomínio Jardim das Flores',
    supplierId: '1',
    supplierName: 'Materiais Santos Ltda',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    items: [
      {
        id: '1',
        productId: '1',
        productName: 'Cimento Portland 50kg',
        quantity: 20,
        unitPrice: 35.50,
        total: 710.00,
      },
      {
        id: '2',
        productId: '2',
        productName: 'Areia Fina (m³)',
        quantity: 5,
        unitPrice: 45.00,
        total: 225.00,
      },
    ],
  },
  {
    id: '2',
    description: 'Equipamentos de limpeza para áreas comuns',
    total: 2340.80,
    status: 'approved',
    clientId: '2',
    clientName: 'Residencial Vista Alegre',
    supplierId: '2',
    supplierName: 'Limpeza Total SA',
    createdAt: '2024-01-14T14:20:00Z',
    updatedAt: '2024-01-16T09:15:00Z',
    items: [],
  },
  {
    id: '3',
    description: 'Manutenção do sistema elétrico',
    total: 8900.00,
    status: 'completed',
    clientId: '1',
    clientName: 'Condomínio Jardim das Flores',
    supplierId: '3',
    supplierName: 'Elétrica Silva & Cia',
    createdAt: '2024-01-12T16:45:00Z',
    updatedAt: '2024-01-18T11:30:00Z',
    items: [],
  },
];

export const mockSuppliers: Supplier[] = [
  {
    id: '1',
    name: 'Materiais Santos Ltda',
    cnpj: '12.345.678/0001-90',
    email: 'contato@materiaisantos.com.br',
    phone: '(11) 3456-7890',
    whatsapp: '(11) 99876-5432',
    address: 'Rua das Flores, 123 - São Paulo, SP',
    status: 'active',
    subscriptionPlan: 'premium',
    createdAt: '2023-12-01T08:00:00Z',
  },
  {
    id: '2',
    name: 'Limpeza Total SA',
    cnpj: '98.765.432/0001-10',
    email: 'vendas@limpezatotal.com.br',
    phone: '(11) 2345-6789',
    whatsapp: '(11) 98765-4321',
    address: 'Av. Paulista, 456 - São Paulo, SP',
    status: 'active',
    subscriptionPlan: 'basic',
    createdAt: '2023-11-15T10:30:00Z',
  },
  {
    id: '3',
    name: 'Elétrica Silva & Cia',
    cnpj: '11.222.333/0001-44',
    email: 'eletrica@silva.com.br',
    phone: '(11) 1234-5678',
    address: 'Rua da Eletricidade, 789 - São Paulo, SP',
    status: 'active',
    subscriptionPlan: 'enterprise',
    createdAt: '2023-10-20T15:20:00Z',
  },
];

export const mockClients: Client[] = [
  {
    id: '1',
    name: 'Condomínio Jardim das Flores',
    cnpj: '22.333.444/0001-55',
    email: 'administracao@jardimflores.com.br',
    phone: '(11) 4567-8901',
    address: 'Rua das Rosas, 100 - São Paulo, SP',
    status: 'active',
    subscriptionPlan: 'premium',
    createdAt: '2023-09-10T12:00:00Z',
  },
  {
    id: '2',
    name: 'Residencial Vista Alegre',
    cnpj: '33.444.555/0001-66',
    email: 'gestao@vistaalegre.com.br',
    phone: '(11) 5678-9012',
    address: 'Av. da Vista, 200 - São Paulo, SP',
    status: 'active',
    subscriptionPlan: 'basic',
    createdAt: '2023-08-25T09:30:00Z',
  },
];

export const mockProducts: Product[] = [
  {
    id: '1',
    code: 'MAT001',
    name: 'Cimento Portland 50kg',
    description: 'Cimento Portland comum para construção civil',
    category: 'Materiais de Construção',
    stockQuantity: 150,
    unitPrice: 35.50,
    supplierId: '1',
    status: 'active',
  },
  {
    id: '2',
    code: 'MAT002',
    name: 'Areia Fina (m³)',
    description: 'Areia fina lavada para construção',
    category: 'Materiais de Construção',
    stockQuantity: 25,
    unitPrice: 45.00,
    supplierId: '1',
    status: 'active',
  },
  {
    id: '3',
    code: 'LMP001',
    name: 'Detergente Neutro 5L',
    description: 'Detergente neutro concentrado para limpeza geral',
    category: 'Produtos de Limpeza',
    stockQuantity: 80,
    unitPrice: 12.90,
    supplierId: '2',
    status: 'active',
  },
];

// Dashboard metrics
export const dashboardMetrics = {
  totalQuotes: 156,
  pendingApprovals: 23,
  activeSuppliers: 45,
  monthlySpending: 89750.50,
  completedThisMonth: 34,
  avgResponseTime: '2.5 dias',
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
    case 'approved':
    case 'active':
      return 'badge-success';
    case 'pending':
      return 'badge-warning';
    case 'rejected':
    case 'inactive':
      return 'badge-error';
    default:
      return 'badge-warning';
  }
};

export const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    draft: 'Rascunho',
    pending: 'Pendente',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    completed: 'Concluído',
    active: 'Ativo',
    inactive: 'Inativo',
    basic: 'Básico',
    premium: 'Premium',
    enterprise: 'Enterprise',
  };
  return statusMap[status] || status;
};