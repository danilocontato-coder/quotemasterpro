// Communication data interfaces and mock data

export interface Chat {
  id: string;
  quoteId: string;
  quoteName: string;
  supplierId: string;
  supplierName: string;
  supplierAvatar?: string;
  clientId: string;
  clientName: string;
  status: 'active' | 'closed';
  unreadCount: number;
  lastMessage: string;
  lastMessageTime: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderType: 'client' | 'supplier' | 'admin';
  content: string;
  attachments: string[];
  timestamp: string;
  read: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'urgent';
  priority: 'low' | 'medium' | 'high';
  targetAudience: 'all' | 'clients' | 'suppliers';
  createdBy: string;
  createdByName: string;
  createdAt: string;
  expiresAt?: string;
  read: boolean;
  attachments: string[];
}

export interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  clientId: string;
  clientName: string;
  createdBy: string;
  createdByName: string;
  assignedTo: string | null;
  assignedToName: string | null;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderType: 'client' | 'support' | 'admin';
  content: string;
  attachments: string[];
  timestamp: string;
  isInternal: boolean; // Mensagens internas do suporte
}

// Mock data
export const mockChats: Chat[] = [
  {
    id: 'CHAT001',
    quoteId: 'RFQ009',
    quoteName: 'Manutenção Elétrica',
    supplierId: '3',
    supplierName: 'Elétrica Silva & Cia',
    supplierAvatar: undefined,
    clientId: '1',
    clientName: 'Condomínio Jardim das Flores',
    status: 'active',
    unreadCount: 2,
    lastMessage: 'Posso fazer um desconto de 5% no valor total',
    lastMessageTime: '2025-08-20T14:30:00Z',
    createdAt: '2025-08-19T10:00:00Z',
    updatedAt: '2025-08-20T14:30:00Z',
    messages: [
      {
        id: 'MSG001',
        chatId: 'CHAT001',
        senderId: 'USR001',
        senderName: 'João Silva (Cliente)',
        senderType: 'client',
        content: 'Boa tarde! Gostaria de discutir alguns detalhes da cotação.',
        attachments: [],
        timestamp: '2025-08-19T10:00:00Z',
        read: true,
      },
      {
        id: 'MSG002',
        chatId: 'CHAT001',
        senderId: 'SUP003',
        senderName: 'Carlos Silva (Elétrica Silva)',
        senderType: 'supplier',
        content: 'Boa tarde! Claro, estou à disposição. Em que posso ajudá-lo?',
        attachments: [],
        timestamp: '2025-08-19T10:15:00Z',
        read: true,
      },
      {
        id: 'MSG003',
        chatId: 'CHAT001',
        senderId: 'USR001',
        senderName: 'João Silva (Cliente)',
        senderType: 'client',
        content: 'O prazo de entrega pode ser reduzido? Temos urgência neste serviço.',
        attachments: [],
        timestamp: '2025-08-19T14:20:00Z',
        read: true,
      },
      {
        id: 'MSG004',
        chatId: 'CHAT001',
        senderId: 'SUP003',
        senderName: 'Carlos Silva (Elétrica Silva)',
        senderType: 'supplier',
        content: 'Posso entregar em 3 dias úteis ao invés de 5. Seria adequado?',
        attachments: [],
        timestamp: '2025-08-19T15:45:00Z',
        read: true,
      },
      {
        id: 'MSG005',
        chatId: 'CHAT001',
        senderId: 'SUP003',
        senderName: 'Carlos Silva (Elétrica Silva)',
        senderType: 'supplier',
        content: 'Posso fazer um desconto de 5% no valor total',
        attachments: [],
        timestamp: '2025-08-20T14:30:00Z',
        read: false,
      }
    ]
  },
  {
    id: 'CHAT002',
    quoteId: 'RFQ008',
    quoteName: 'Serviços de Jardinagem',
    supplierId: '4',
    supplierName: 'Jardins Verdes',
    clientId: '1',
    clientName: 'Condomínio Jardim das Flores',
    status: 'active',
    unreadCount: 0,
    lastMessage: 'Perfeito! Confirmo o serviço para segunda-feira.',
    lastMessageTime: '2025-08-20T09:15:00Z',
    createdAt: '2025-08-18T08:00:00Z',
    updatedAt: '2025-08-20T09:15:00Z',
    messages: [
      {
        id: 'MSG006',
        chatId: 'CHAT002',
        senderId: 'USR001',
        senderName: 'João Silva (Cliente)',
        senderType: 'client',
        content: 'Quando podemos agendar o início dos serviços?',
        attachments: [],
        timestamp: '2025-08-18T08:00:00Z',
        read: true,
      },
      {
        id: 'MSG007',
        chatId: 'CHAT002',
        senderId: 'SUP004',
        senderName: 'Maria Verde (Jardins Verdes)',
        senderType: 'supplier',
        content: 'Podemos começar na próxima segunda-feira, às 8h. Seria possível?',
        attachments: [],
        timestamp: '2025-08-18T09:30:00Z',
        read: true,
      },
      {
        id: 'MSG008',
        chatId: 'CHAT002',
        senderId: 'USR001',
        senderName: 'João Silva (Cliente)',
        senderType: 'client',
        content: 'Perfeito! Confirmo o serviço para segunda-feira.',
        attachments: [],
        timestamp: '2025-08-20T09:15:00Z',
        read: true,
      }
    ]
  }
];

export const mockAnnouncements: Announcement[] = [
  {
    id: 'ANN001',
    title: 'Atualização do Sistema - Melhorias na Plataforma',
    content: 'Implementamos novas funcionalidades no sistema de cotações e pagamentos. Confira as novidades: chat integrado com fornecedores, sistema de garantia para pagamentos seguros e relatórios avançados.',
    type: 'info',
    priority: 'medium',
    targetAudience: 'all',
    createdBy: 'ADMIN001',
    createdByName: 'Administrador',
    createdAt: '2025-08-20T10:00:00Z',
    read: false,
    attachments: ['manual_atualizacao.pdf'],
  },
  {
    id: 'ANN002',
    title: 'Manutenção Programada - Sistema Offline',
    content: 'Informamos que o sistema passará por manutenção no domingo, dia 25/08, das 2h às 6h. Durante este período, a plataforma ficará temporariamente indisponível. Pedimos desculpas pelo inconveniente.',
    type: 'warning',
    priority: 'high',
    targetAudience: 'all',
    createdBy: 'ADMIN001',
    createdByName: 'Administrador',
    createdAt: '2025-08-18T16:00:00Z',
    expiresAt: '2025-08-26T00:00:00Z',
    read: true,
    attachments: [],
  },
  {
    id: 'ANN003',
    title: 'Novos Fornecedores Parceiros',
    content: 'Temos o prazer de anunciar novos fornecedores parceiros em nossa plataforma. Agora você tem ainda mais opções para suas cotações com empresas pré-qualificadas e avaliadas.',
    type: 'success',
    priority: 'low',
    targetAudience: 'clients',
    createdBy: 'ADMIN001',
    createdByName: 'Administrador',
    createdAt: '2025-08-15T14:30:00Z',
    read: false,
    attachments: ['lista_novos_fornecedores.pdf'],
  },
  {
    id: 'ANN004',
    title: 'URGENTE: Problema Técnico Resolvido',
    content: 'O problema técnico que estava afetando o envio de cotações foi resolvido. Todas as funcionalidades estão operando normalmente. Agradecemos a paciência.',
    type: 'urgent',
    priority: 'high',
    targetAudience: 'all',
    createdBy: 'ADMIN001',
    createdByName: 'Administrador',
    createdAt: '2025-08-20T08:00:00Z',
    read: true,
    attachments: [],
  }
];

export const mockTickets: Ticket[] = [
  {
    id: 'TKT001',
    subject: 'Problema no envio de cotação',
    description: 'Não consigo enviar uma cotação para fornecedores. O botão fica carregando indefinidamente.',
    status: 'in_progress',
    priority: 'high',
    category: 'Técnico',
    clientId: '1',
    clientName: 'Condomínio Jardim das Flores',
    createdBy: 'USR001',
    createdByName: 'João Silva',
    assignedTo: 'SUP001',
    assignedToName: 'Ana Suporte',
    createdAt: '2025-08-19T11:30:00Z',
    updatedAt: '2025-08-20T09:15:00Z',
    messages: [
      {
        id: 'TMSG001',
        ticketId: 'TKT001',
        senderId: 'USR001',
        senderName: 'João Silva',
        senderType: 'client',
        content: 'Não consigo enviar uma cotação para fornecedores. O botão fica carregando indefinidamente.',
        attachments: ['screenshot_erro.png'],
        timestamp: '2025-08-19T11:30:00Z',
        isInternal: false,
      },
      {
        id: 'TMSG002',
        ticketId: 'TKT001',
        senderId: 'SUP001',
        senderName: 'Ana Suporte',
        senderType: 'support',
        content: 'Olá João, obrigada por reportar o problema. Estou investigando a questão. Pode me informar qual navegador está usando?',
        attachments: [],
        timestamp: '2025-08-19T14:00:00Z',
        isInternal: false,
      },
      {
        id: 'TMSG003',
        ticketId: 'TKT001',
        senderId: 'USR001',
        senderName: 'João Silva',
        senderType: 'client',
        content: 'Estou usando Chrome versão 116. O problema acontece tanto no desktop quanto no mobile.',
        attachments: [],
        timestamp: '2025-08-19T16:45:00Z',
        isInternal: false,
      },
      {
        id: 'TMSG004',
        ticketId: 'TKT001',
        senderId: 'SUP001',
        senderName: 'Ana Suporte',
        senderType: 'support',
        content: 'Identifiquei o problema e nossa equipe técnica está trabalhando na correção. Deve estar resolvido até amanhã.',
        attachments: [],
        timestamp: '2025-08-20T09:15:00Z',
        isInternal: false,
      }
    ]
  },
  {
    id: 'TKT002',
    subject: 'Dúvida sobre sistema de pagamentos',
    description: 'Como funciona exatamente o sistema de garantia? Gostaria de entender melhor antes de processar um pagamento.',
    status: 'resolved',
    priority: 'medium',
    category: 'Dúvida',
    clientId: '1',
    clientName: 'Condomínio Jardim das Flores',
    createdBy: 'USR001',
    createdByName: 'João Silva',
    assignedTo: 'SUP002',
    assignedToName: 'Carlos Suporte',
    createdAt: '2025-08-17T10:00:00Z',
    updatedAt: '2025-08-18T15:30:00Z',
    messages: [
      {
        id: 'TMSG005',
        ticketId: 'TKT002',
        senderId: 'USR001',
        senderName: 'João Silva',
        senderType: 'client',
        content: 'Como funciona exatamente o sistema de garantia? Gostaria de entender melhor antes de processar um pagamento.',
        attachments: [],
        timestamp: '2025-08-17T10:00:00Z',
        isInternal: false,
      },
      {
        id: 'TMSG006',
        ticketId: 'TKT002',
        senderId: 'SUP002',
        senderName: 'Carlos Suporte',
        senderType: 'support',
        content: 'O sistema de garantia funciona como uma proteção. O valor fica retido conosco até você confirmar o recebimento dos produtos/serviços. Após 10 dias, se não houver manifestação, o valor é liberado automaticamente para o fornecedor.',
        attachments: ['guia_escrow.pdf'],
        timestamp: '2025-08-18T09:30:00Z',
        isInternal: false,
      },
      {
        id: 'TMSG007',
        ticketId: 'TKT002',
        senderId: 'USR001',
        senderName: 'João Silva',
        senderType: 'client',
        content: 'Perfeito! Agora entendi. Muito obrigado pela explicação detalhada.',
        attachments: [],
        timestamp: '2025-08-18T15:30:00Z',
        isInternal: false,
      }
    ]
  },
  {
    id: 'TKT003',
    subject: 'Solicitação de novo fornecedor',
    description: 'Gostaria de sugerir um fornecedor para ser incluído na plataforma. É uma empresa de confiança que já trabalha conosco.',
    status: 'open',
    priority: 'low',
    category: 'Solicitação',
    clientId: '1',
    clientName: 'Condomínio Jardim das Flores',
    createdBy: 'USR001',
    createdByName: 'João Silva',
    assignedTo: null,
    assignedToName: null,
    createdAt: '2025-08-20T13:00:00Z',
    updatedAt: '2025-08-20T13:00:00Z',
    messages: [
      {
        id: 'TMSG008',
        ticketId: 'TKT003',
        senderId: 'USR001',
        senderName: 'João Silva',
        senderType: 'client',
        content: 'Gostaria de sugerir um fornecedor para ser incluído na plataforma. É uma empresa de confiança que já trabalha conosco há 3 anos: Construções ABC (CNPJ: 12.345.678/0001-99).',
        attachments: ['dados_fornecedor.pdf'],
        timestamp: '2025-08-20T13:00:00Z',
        isInternal: false,
      }
    ]
  }
];

export const ticketCategories = [
  'Financeiro',
  'Suporte Técnico',
  'Comercial',
  'Dúvidas Gerais',
  'Reclamação',
  'Sugestão',
  'Acesso e Login',
  'Outros'
];

export const getAnnouncementTypeColor = (type: string) => {
  switch (type) {
    case 'info':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'warning':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'success':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'urgent':
      return 'text-red-600 bg-red-50 border-red-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

export const getTicketStatusColor = (status: string) => {
  switch (status) {
    case 'open':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'in_progress':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'resolved':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'closed':
      return 'text-gray-600 bg-gray-50 border-gray-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

export const getTicketPriorityColor = (priority: string) => {
  switch (priority) {
    case 'low':
      return 'text-gray-600 bg-gray-50 border-gray-200';
    case 'medium':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'high':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'urgent':
      return 'text-red-600 bg-red-50 border-red-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};