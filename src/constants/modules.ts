import { 
  FileText, 
  Users, 
  CreditCard, 
  BarChart3, 
  Brain, 
  Sparkles, 
  HeadphonesIcon, 
  Palette,
  MessageSquare,
  Truck,
  CheckCircle,
  TreePine
} from 'lucide-react';

export interface ModuleDefinition {
  key: string;
  name: string;
  description: string;
  icon: any;
  category: 'core' | 'advanced' | 'ai' | 'premium';
}

export const AVAILABLE_MODULES: ModuleDefinition[] = [
  // Core modules
  {
    key: 'quotes',
    name: 'Gestão de Cotações',
    description: 'Criar, enviar e gerenciar cotações',
    icon: FileText,
    category: 'core'
  },
  {
    key: 'suppliers',
    name: 'Gestão de Fornecedores',
    description: 'Cadastro e relacionamento com fornecedores',
    icon: Users,
    category: 'core'
  },
  {
    key: 'payments',
    name: 'Pagamentos',
    description: 'Gestão de pagamentos e faturamento',
    icon: CreditCard,
    category: 'core'
  },
  {
    key: 'approvals',
    name: 'Aprovações',
    description: 'Fluxo de aprovação de cotações',
    icon: CheckCircle,
    category: 'advanced'
  },
  {
    key: 'cost_centers',
    name: 'Centros de Custo',
    description: 'Organização financeira por centro de custo',
    icon: TreePine,
    category: 'advanced'
  },
  
  // Advanced modules
  {
    key: 'advanced_reports',
    name: 'Relatórios Avançados',
    description: 'Análises detalhadas e dashboards customizados',
    icon: BarChart3,
    category: 'advanced'
  },
  {
    key: 'delivery_management',
    name: 'Gestão de Entregas',
    description: 'Controle de entregas com códigos de confirmação',
    icon: Truck,
    category: 'advanced'
  },
  
  // AI modules
  {
    key: 'ai_quote_analysis',
    name: 'Análise de Cotações por IA',
    description: 'Análise inteligente de propostas e recomendações',
    icon: Brain,
    category: 'ai'
  },
  {
    key: 'ai_negotiation',
    name: 'Negociação Automática por IA',
    description: 'IA negocia automaticamente com fornecedores',
    icon: Sparkles,
    category: 'ai'
  },
  
  // Premium modules
  {
    key: 'priority_support',
    name: 'Suporte Prioritário',
    description: 'Atendimento prioritário e dedicado',
    icon: HeadphonesIcon,
    category: 'premium'
  },
  {
    key: 'custom_branding',
    name: 'Marca Personalizada',
    description: 'Logo, cores e domínio personalizado',
    icon: Palette,
    category: 'premium'
  },
  {
    key: 'whatsapp_integration',
    name: 'Integração WhatsApp',
    description: 'Notificações e comunicação via WhatsApp',
    icon: MessageSquare,
    category: 'premium'
  }
];

export const MODULE_CATEGORIES = [
  { key: 'core', name: 'Módulos Essenciais', color: 'bg-blue-500' },
  { key: 'advanced', name: 'Módulos Avançados', color: 'bg-purple-500' },
  { key: 'ai', name: 'Inteligência Artificial', color: 'bg-green-500' },
  { key: 'premium', name: 'Premium', color: 'bg-yellow-500' }
];
