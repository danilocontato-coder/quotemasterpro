/**
 * ⚠️ DEPRECATED - Mock Data File
 * 
 * Este arquivo contém dados de exemplo para compatibilidade com código legado.
 * 
 * ✅ TODO: Este arquivo será removido após migração completa para Supabase.
 * 
 * 📌 Uso APENAS permitido para:
 * - Testes unitários
 * - Desenvolvimento offline
 * - Tipos/interfaces (exportar apenas tipos, não dados)
 * 
 * ❌ NÃO USE este arquivo em produção ou em componentes reais.
 * Use os hooks do Supabase: useSupabaseDashboard, useSupabaseQuotes, etc.
 */

// Mock data for the system
export interface Quote {
  id: string;
  title: string;
  description: string;
  total: number;
  status: 'active' | 'draft' | 'receiving' | 'approved' | 'finalized' | 'trash';
  clientId: string;
  clientName: string;
  supplierId?: string;
  supplierName?: string;
  itemsCount: number;
  responsesCount: number;
  responseTotal: number;
  deadline?: string;
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

export interface SupplierGroup {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
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
  groupId?: string;
  specialties?: string[];
  type: 'local' | 'global'; // Local: específico do cliente, Global: disponível para todos
  clientId?: string; // Para fornecedores locais, especifica qual cliente
  region?: string; // Para fornecedores globais, região de atuação preferencial
  rating?: number; // Avaliação média (1-5)
  completedOrders?: number; // Número de pedidos completados
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
  supplierId?: string;
  status: 'active' | 'inactive';
}

// Mock data
export const mockQuotes: Quote[] = [
  {
    id: 'RFQ011',
    title: 'Materiais de Construção',
    description: 'Materiais de construção para reforma do bloco A',
    total: 0,
    status: 'draft',
    clientId: '1',
    clientName: 'Condomínio Jardim das Flores',
    itemsCount: 3,
    responsesCount: 0,
    responseTotal: 0,
    createdAt: '2025-08-18T10:30:00Z',
    updatedAt: '2025-08-18T10:30:00Z',
    items: [
      {
        id: '1',
        productId: '1',
        productName: 'Cimento Portland 50kg',
        quantity: 10,
        unitPrice: 32.50,
        total: 325.00
      },
      {
        id: '2',
        productId: '8',
        productName: 'Lâmpada LED 12W',
        quantity: 20,
        unitPrice: 15.90,
        total: 318.00
      }
    ],
  },
  {
    id: 'RFQ010',
    title: 'Equipamentos de Limpeza',
    description: 'Equipamentos de limpeza para áreas comuns',
    total: 0,
    status: 'draft',
    clientId: '1',
    clientName: 'Condomínio Jardim das Flores',
    itemsCount: 2,
    responsesCount: 0,
    responseTotal: 0,
    createdAt: '2025-08-18T14:20:00Z',
    updatedAt: '2025-08-18T14:20:00Z',
    items: [
      {
        id: '3',
        productId: '5',
        productName: 'Detergente Neutro 5L',
        quantity: 5,
        unitPrice: 28.90,
        total: 144.50
      }
    ],
  },
  {
    id: 'RFQ009',
    title: 'Manutenção Elétrica',
    description: 'Manutenção do sistema elétrico predial',
    total: 0,
    status: 'receiving',
    clientId: '1',
    clientName: 'Condomínio Jardim das Flores',
    itemsCount: 2,
    responsesCount: 3,
    responseTotal: 3,
    deadline: '2025-08-28T23:59:59Z',
    createdAt: '2025-08-18T16:45:00Z',
    updatedAt: '2025-08-18T16:45:00Z',
    items: [
      {
        id: '4',
        productId: '1',
        productName: 'Cimento Portland 50kg',
        quantity: 10,
        unitPrice: 32.50,
        total: 325.00
      },
      {
        id: '5',
        productId: '8',
        productName: 'Lâmpada LED 12W',
        quantity: 20,
        unitPrice: 15.90,
        total: 318.00
      }
    ],
  },
  {
    id: 'RFQ008',
    title: 'Serviços de Jardinagem',
    description: 'Manutenção e paisagismo das áreas verdes',
    total: 0,
    status: 'approved',
    clientId: '1',
    clientName: 'Condomínio Jardim das Flores',
    itemsCount: 3,
    responsesCount: 2,
    responseTotal: 2,
    deadline: '2025-08-20T23:59:59Z',
    createdAt: '2025-08-18T11:20:00Z',
    updatedAt: '2025-08-19T14:30:00Z',
    items: [],
  },
];

// Available specialties for suppliers
// @deprecated Use STANDARD_SPECIALTIES from @/components/common/SpecialtiesInput
// Esta lista está sincronizada com a fonte única de verdade e será removida em versão futura
export { STANDARD_SPECIALTIES as supplierSpecialties } from '@/components/common/SpecialtiesInput';

// Mock supplier groups - REMOVED
export const mockSupplierGroups: SupplierGroup[] = [];

export const mockSuppliers: Supplier[] = [];

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
  // Materiais de Construção
  {
    id: '1',
    code: 'MAT001',
    name: 'Cimento Portland 50kg',
    description: 'Cimento Portland comum para construção civil',
    category: 'Materiais de Construção',
    stockQuantity: 150,
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
    supplierId: '1',
    status: 'active',
  },
  {
    id: '3',
    code: 'MAT003',
    name: 'Brita 1 (m³)',
    description: 'Brita número 1 para concreto',
    category: 'Materiais de Construção',
    stockQuantity: 15,
    supplierId: '1',
    status: 'active',
  },
  {
    id: '4',
    code: 'MAT004',
    name: 'Tijolo Cerâmico 6 furos',
    description: 'Tijolo cerâmico estrutural 6 furos 14x19x29cm',
    category: 'Materiais de Construção',
    stockQuantity: 2000,
    supplierId: '1',
    status: 'active',
  },
  // Produtos de Limpeza
  {
    id: '5',
    code: 'LMP001',
    name: 'Detergente Neutro 5L',
    description: 'Detergente neutro concentrado para limpeza geral',
    category: 'Produtos de Limpeza',
    stockQuantity: 80,
    supplierId: '2',
    status: 'active',
  },
  {
    id: '6',
    code: 'LMP002',
    name: 'Desinfetante 2L',
    description: 'Desinfetante bactericida para áreas comuns',
    category: 'Produtos de Limpeza',
    stockQuantity: 45,
    supplierId: '2',
    status: 'active',
  },
  {
    id: '7',
    code: 'LMP003',
    name: 'Papel Higiênico Duplo',
    description: 'Papel higiênico folha dupla pacote com 12 rolos',
    category: 'Produtos de Limpeza',
    stockQuantity: 120,
    supplierId: '2',
    status: 'active',
  },
  // Elétrica e Iluminação
  {
    id: '8',
    code: 'ELE001',
    name: 'Lâmpada LED 12W',
    description: 'Lâmpada LED bulbo 12W luz branca 6500K',
    category: 'Elétrica e Iluminação',
    stockQuantity: 200,
    supplierId: '3',
    status: 'active',
  },
  {
    id: '9',
    code: 'ELE002',
    name: 'Cabo Flexível 2,5mm',
    description: 'Cabo flexível 2,5mm² para instalações elétricas (metro)',
    category: 'Elétrica e Iluminação',
    stockQuantity: 500,
    supplierId: '3',
    status: 'active',
  },
  {
    id: '10',
    code: 'ELE003',
    name: 'Disjuntor 20A',
    description: 'Disjuntor monopolar 20A padrão DIN',
    category: 'Elétrica e Iluminação',
    stockQuantity: 30,
    supplierId: '3',
    status: 'active',
  },
  // Jardinagem
  {
    id: '11',
    code: 'JAR001',
    name: 'Terra Vegetal (saco 20kg)',
    description: 'Terra vegetal adubada para jardinagem',
    category: 'Jardinagem',
    stockQuantity: 60,
    status: 'active',
  },
  {
    id: '12',
    code: 'JAR002',
    name: 'Adubo NPK 10-10-10',
    description: 'Adubo granulado NPK 10-10-10 saco 25kg',
    category: 'Jardinagem',
    stockQuantity: 25,
    status: 'active',
  },
  // Ferramentas
  {
    id: '13',
    code: 'FER001',
    name: 'Martelo Unha 500g',
    description: 'Martelo unha cabo de madeira 500g',
    category: 'Ferramentas',
    stockQuantity: 15,
    status: 'active',
  },
  {
    id: '14',
    code: 'FER002',
    name: 'Furadeira 1/2" 850W',
    description: 'Furadeira de impacto 1/2" 850W com maleta',
    category: 'Ferramentas',
    stockQuantity: 8,
    status: 'active',
  },
  // Produtos com estoque baixo
  {
    id: '15',
    code: 'HID001',
    name: 'Registro de Gaveta 3/4"',
    description: 'Registro de gaveta bronze 3/4" com canopla',
    category: 'Hidráulica',
    stockQuantity: 3,
    status: 'active',
  },
  // Serviços
  {
    id: '16',
    code: 'SRV001',
    name: 'Limpeza de Caixa d\'Água',
    description: 'Serviço de limpeza e desinfecção de reservatório',
    category: 'Serviços',
    stockQuantity: 0,
    status: 'active',
  },
  {
    id: '17',
    code: 'SRV002',
    name: 'Manutenção Preventiva Elevador',
    description: 'Serviço mensal de manutenção preventiva de elevadores',
    category: 'Serviços',
    stockQuantity: 0,
    status: 'active',
  },
];

// Available categories for products
export const productCategories = [
  'Materiais de Construção',
  'Produtos de Limpeza',
  'Elétrica e Iluminação',
  'Jardinagem',
  'Ferramentas',
  'Hidráulica',
  'Serviços',
  'Segurança',
  'Pintura',
  'Serralheria'
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
    case 'finalized':
    case 'approved':
    case 'active':
      return 'badge-success';
    case 'receiving':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'draft':
      return 'text-gray-600 bg-gray-50 border-gray-200';
    case 'trash':
    case 'inactive':
      return 'badge-error';
    // Payment statuses
    case 'in_escrow':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'waiting_confirmation':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'delivered':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'paid':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'disputed':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'cancelled':
      return 'text-gray-600 bg-gray-50 border-gray-200';
    case 'pending':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    default:
      return 'badge-warning';
  }
};

export const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    active: 'Ativa',
    draft: 'Rascunho',
    receiving: 'Recebendo',
    approved: 'Aprovada',
    finalized: 'Finalizada',
    trash: 'Lixeira',
    inactive: 'Inativo',
    basic: 'Básico',
    premium: 'Premium',
    enterprise: 'Enterprise',
    // Payment statuses
    pending: 'Pendente',
    in_escrow: 'Em Garantia',
    waiting_confirmation: 'Aguardando Confirmação',
    delivered: 'Entregue',
    paid: 'Pago',
    disputed: 'Em Disputa',
    cancelled: 'Cancelado',
  };
  return statusMap[status] || status;
};

// Payment interfaces and data
export interface Payment {
  id: string;
  quoteId: string;
  quoteName: string;
  clientId: string;
  clientName: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  status: 'pending' | 'in_escrow' | 'waiting_confirmation' | 'delivered' | 'paid' | 'disputed' | 'cancelled';
  escrowReleaseDate: string; // Data de liberação automática (10 dias)
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  createdAt: string;
  updatedAt: string;
  transactions: PaymentTransaction[];
}

export interface PaymentTransaction {
  id: string;
  paymentId: string;
  type: 'payment_created' | 'payment_received' | 'funds_held' | 'delivery_confirmed' | 'funds_released' | 'dispute_opened' | 'payment_cancelled' | 'delay_reported';
  description: string;
  amount?: number;
  userId: string;
  userName: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

// Mock payments data
export const mockPayments: Payment[] = [
  {
    id: 'PAY001',
    quoteId: 'RFQ008',
    quoteName: 'Serviços de Jardinagem',
    clientId: '1',
    clientName: 'Condomínio Jardim das Flores',
    supplierId: '4',
    supplierName: 'Jardins Verdes',
    amount: 2450.00,
    status: 'waiting_confirmation',
    escrowReleaseDate: '2025-09-01T10:00:00Z',
    stripeSessionId: 'cs_test_123456789',
    stripePaymentIntentId: 'pi_test_987654321',
    createdAt: '2025-08-20T10:00:00Z',
    updatedAt: '2025-08-22T14:30:00Z',
    transactions: [
      {
        id: 'TXN001',
        paymentId: 'PAY001',
        type: 'payment_created',
        description: 'Pagamento criado pelo cliente',
        amount: 2450.00,
        userId: 'USR001',
        userName: 'João Silva (Cliente)',
        createdAt: '2025-08-20T10:00:00Z',
      },
      {
        id: 'TXN002',
        paymentId: 'PAY001',
        type: 'payment_received',
        description: 'Pagamento recebido via Stripe',
        amount: 2450.00,
        userId: 'SYSTEM',
        userName: 'Sistema',
        createdAt: '2025-08-20T10:05:00Z',
      },
      {
        id: 'TXN003',
        paymentId: 'PAY001',
        type: 'funds_held',
        description: 'Valores retidos em escrow - aguardando confirmação de entrega',
        amount: 2450.00,
        userId: 'SYSTEM',
        userName: 'Sistema',
        createdAt: '2025-08-20T10:05:00Z',
        metadata: { release_date: '2025-09-01T10:00:00Z' }
      }
    ]
  },
  {
    id: 'PAY002',
    quoteId: 'RFQ007',
    quoteName: 'Materiais Elétricos',
    clientId: '1',
    clientName: 'Condomínio Jardim das Flores',
    supplierId: '3',
    supplierName: 'Elétrica Silva & Cia',
    amount: 1890.50,
    status: 'paid',
    escrowReleaseDate: '2025-08-25T15:00:00Z',
    stripeSessionId: 'cs_test_abcdef123',
    stripePaymentIntentId: 'pi_test_fedcba321',
    createdAt: '2025-08-15T15:00:00Z',
    updatedAt: '2025-08-18T09:30:00Z',
    transactions: [
      {
        id: 'TXN004',
        paymentId: 'PAY002',
        type: 'payment_created',
        description: 'Pagamento criado pelo cliente',
        amount: 1890.50,
        userId: 'USR001',
        userName: 'João Silva (Cliente)',
        createdAt: '2025-08-15T15:00:00Z',
      },
      {
        id: 'TXN005',
        paymentId: 'PAY002',
        type: 'payment_received',
        description: 'Pagamento recebido via Stripe',
        amount: 1890.50,
        userId: 'SYSTEM',
        userName: 'Sistema',
        createdAt: '2025-08-15T15:05:00Z',
      },
      {
        id: 'TXN006',
        paymentId: 'PAY002',
        type: 'funds_held',
        description: 'Valores retidos em escrow',
        amount: 1890.50,
        userId: 'SYSTEM',
        userName: 'Sistema',
        createdAt: '2025-08-15T15:05:00Z',
      },
      {
        id: 'TXN007',
        paymentId: 'PAY002',
        type: 'delivery_confirmed',
        description: 'Entrega confirmada pelo cliente',
        userId: 'USR001',
        userName: 'João Silva (Cliente)',
        createdAt: '2025-08-18T09:30:00Z',
      },
      {
        id: 'TXN008',
        paymentId: 'PAY002',
        type: 'funds_released',
        description: 'Valores liberados para o fornecedor',
        amount: 1890.50,
        userId: 'SYSTEM',
        userName: 'Sistema',
        createdAt: '2025-08-18T09:30:00Z',
      }
    ]
  },
  {
    id: 'PAY003',
    quoteId: 'RFQ006',
    quoteName: 'Produtos de Limpeza',
    clientId: '2',
    clientName: 'Residencial Vista Alegre',
    supplierId: '2',
    supplierName: 'Limpeza Total SA',
    amount: 987.30,
    status: 'disputed',
    escrowReleaseDate: '2025-08-30T12:00:00Z',
    stripeSessionId: 'cs_test_dispute123',
    stripePaymentIntentId: 'pi_test_dispute321',
    createdAt: '2025-08-10T12:00:00Z',
    updatedAt: '2025-08-19T16:45:00Z',
    transactions: [
      {
        id: 'TXN009',
        paymentId: 'PAY003',
        type: 'payment_created',
        description: 'Pagamento criado pelo cliente',
        amount: 987.30,
        userId: 'USR002',
        userName: 'Maria Santos (Cliente)',
        createdAt: '2025-08-10T12:00:00Z',
      },
      {
        id: 'TXN010',
        paymentId: 'PAY003',
        type: 'payment_received',
        description: 'Pagamento recebido via Stripe',
        amount: 987.30,
        userId: 'SYSTEM',
        userName: 'Sistema',
        createdAt: '2025-08-10T12:05:00Z',
      },
      {
        id: 'TXN011',
        paymentId: 'PAY003',
        type: 'funds_held',
        description: 'Valores retidos em escrow',
        amount: 987.30,
        userId: 'SYSTEM',
        userName: 'Sistema',
        createdAt: '2025-08-10T12:05:00Z',
      },
      {
        id: 'TXN012',
        paymentId: 'PAY003',
        type: 'dispute_opened',
        description: 'Disputa aberta - produtos não conformes',
        userId: 'USR002',
        userName: 'Maria Santos (Cliente)',
        createdAt: '2025-08-19T16:45:00Z',
        metadata: { reason: 'Produtos recebidos não conferem com o pedido' }
      }
    ]
  }
];