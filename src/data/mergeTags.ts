export interface MergeTag {
  tag: string;
  description: string;
  category: string;
  example?: string;
}

export const AVAILABLE_MERGE_TAGS: MergeTag[] = [
  // Categoria: Cliente
  { 
    tag: '{{client_name}}', 
    description: 'Nome do cliente/condomínio', 
    category: 'Cliente',
    example: 'Condomínio Azul'
  },
  { 
    tag: '{{client_email}}', 
    description: 'E-mail principal do cliente', 
    category: 'Cliente',
    example: 'contato@condominio.com.br'
  },
  { 
    tag: '{{client_phone}}', 
    description: 'Telefone do cliente', 
    category: 'Cliente',
    example: '(71) 99999-0000'
  },
  { 
    tag: '{{client_cnpj}}', 
    description: 'CNPJ do cliente', 
    category: 'Cliente',
    example: '12.345.678/0001-90'
  },
  { 
    tag: '{{client_address}}', 
    description: 'Endereço completo', 
    category: 'Cliente',
    example: 'Av. Principal, 100 - Salvador/BA'
  },
  { 
    tag: '{{company_name}}', 
    description: 'Razão social', 
    category: 'Cliente',
    example: 'Condomínio Azul LTDA'
  },
  
  // Categoria: Assinatura
  { 
    tag: '{{subscription_plan}}', 
    description: 'Nome do plano de assinatura', 
    category: 'Assinatura',
    example: 'Pro'
  },
  
  // Categoria: Links
  { 
    tag: '{{login_url}}', 
    description: 'Link direto para login', 
    category: 'Links',
    example: 'https://cotiz.com.br/login'
  },
  { 
    tag: '{{dashboard_url}}', 
    description: 'Link para dashboard', 
    category: 'Links',
    example: 'https://cotiz.com.br/dashboard'
  },
  { 
    tag: '{{profile_url}}', 
    description: 'Link para perfil', 
    category: 'Links',
    example: 'https://cotiz.com.br/settings/profile'
  },
  { 
    tag: '{{support_url}}', 
    description: 'Link para suporte', 
    category: 'Links',
    example: 'https://cotiz.com.br/support'
  },
  
  // Categoria: Sistema
  { 
    tag: '{{current_date}}', 
    description: 'Data atual formatada', 
    category: 'Sistema',
    example: '18 de novembro de 2025'
  },
  { 
    tag: '{{current_year}}', 
    description: 'Ano atual', 
    category: 'Sistema',
    example: '2025'
  },
  
  // Categoria: Destinatário
  { 
    tag: '{{recipient_name}}', 
    description: 'Nome do destinatário', 
    category: 'Destinatário',
    example: 'João Silva'
  },
  { 
    tag: '{{recipient_email}}', 
    description: 'E-mail do destinatário', 
    category: 'Destinatário',
    example: 'joao@exemplo.com'
  },
];

export const MERGE_TAG_CATEGORIES = [
  'Cliente',
  'Assinatura',
  'Links',
  'Sistema',
  'Destinatário'
];
