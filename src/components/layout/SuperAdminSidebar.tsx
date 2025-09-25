import React from 'react';
import { useLocation } from 'react-router-dom';
import { TransitionNavLink } from './TransitionNavLink';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Users,
  Building2,
  Truck,
  HeadphonesIcon,
  Settings,
  Database,
  Zap,
  Shield,
  TrendingUp,
  Bell,
  FileText,
  CreditCard,
  Mail,
  MessageSquare,
  Key,
  Activity,
  BarChart3,
  Server,
  Bot,
  Globe
} from 'lucide-react';

const navigation = [
  {
    name: 'Dashboard Principal',
    href: '/admin/superadmin',
    icon: LayoutDashboard,
    exact: true
  },
  {
    name: 'Gerenciamento',
    items: [
      {
        name: 'Contas',
        href: '/admin/accounts',
        icon: Users,
        description: 'Todos os usuários'
      },
      {
        name: 'Clientes',
        href: '/admin/clients',
        icon: Building2,
        description: 'Condomínios e empresas'
      },
      {
        name: 'Fornecedores',
        href: '/admin/suppliers',
        icon: Truck,
        description: 'Parceiros fornecedores'
      },
      {
        name: 'Planos',
        href: '/admin/plans',
        icon: CreditCard,
        description: 'Planos de assinatura'
      },
      {
        name: 'Equipe Suporte',
        href: '/admin/support-team',
        icon: HeadphonesIcon,
        description: 'Agentes de suporte'
      }
    ]
  },
  {
    name: 'Sistema',
    items: [
      {
        name: 'Configurações',
        href: '/admin/system',
        icon: Settings,
        description: 'Config. do sistema'
      },
      {
        name: 'Marca',
        href: '/admin/brand',
        icon: Building2,
        description: 'Logo e identidade'
      },
      {
        name: 'Integrações',
        href: '/admin/integrations',
        icon: Zap,
        description: 'APIs externas'
      },
      {
        name: 'Segurança',
        href: '/admin/security',
        icon: Shield,
        description: 'Logs e auditoria'
      },
      {
        name: 'Banco de Dados',
        href: '/admin/database',
        icon: Database,
        description: 'Gerenciamento DB'
      },
      {
        name: 'Configuração IA',
        href: '/admin/ai-config',
        icon: Bot,
        description: 'Negociação automática'
      },
      {
        name: 'Configuração de Domínio',
        href: '/admin/domain',
        icon: Globe,
        description: 'URL base para links'
      }
    ]
  },
  {
    name: 'Analytics & Reports',
    items: [
      {
        name: 'Analytics',
        href: '/admin/analytics',
        icon: TrendingUp,
        description: 'Métricas globais'
      },
      {
        name: 'Relatórios',
        href: '/admin/reports',
        icon: FileText,
        description: 'Relatórios gerenciais'
      },
      {
        name: 'Financeiro',
        href: '/admin/financial',
        icon: CreditCard,
        description: 'Receitas e pagamentos'
      }
    ]
  },
  {
    name: 'Comunicação',
    items: [
      {
        name: 'Central de Comunicação',
        href: '/admin/communication',
        icon: MessageSquare,
        description: 'Comunicados e tickets'
      },
      {
        name: 'Notificações',
        href: '/admin/notifications',
        icon: Bell,
        description: 'Central de notificações'
      },
      {
        name: 'E-mail Marketing',
        href: '/admin/email',
        icon: Mail,
        description: 'Campanhas de e-mail'
      },
      {
        name: 'Templates WhatsApp',
        href: '/admin/whatsapp-templates',
        icon: MessageSquare,
        description: 'Modelos de mensagem'
      },
      {
        name: 'Gestão de Cupons',
        href: '/admin/coupons',
        icon: CreditCard,
        description: 'Cupons de desconto'
      }
    ]
  },
  {
    name: 'Administração',
    items: [
      {
        name: 'Logs do Sistema',
        href: '/admin/logs',
        icon: Activity,
        description: 'Logs de atividade'
      },
      {
        name: 'Monitoramento',
        href: '/admin/monitoring',
        icon: Server,
        description: 'Status dos serviços'
      },
      {
        name: 'Configuração de APIs',
        href: '/admin/api',
        icon: Key,
        description: 'Chaves de API e integrações'
      }
    ]
  }
];

export const SuperAdminSidebar = () => {
  const location = useLocation();

  const isActive = (href: string, exact = false) => {
    if (exact) {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r">
      {/* Header */}
      <div className="flex h-16 items-center px-6 border-b">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">SuperAdmin</h2>
            <p className="text-xs text-muted-foreground">Controle Total</p>
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <div className="px-6 py-4">
        <Badge variant="secondary" className="w-full justify-center bg-green-50 text-green-700 border-green-200">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
          Sistema Online
        </Badge>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-4">
        <nav className="space-y-6">
          {navigation.map((section) => (
            <div key={section.name}>
              {/* Single item or section header */}
              {section.href ? (
                <TransitionNavLink
                  to={section.href}
                  className={({ isActive: navIsActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-muted',
                      (navIsActive && section.exact) || (isActive(section.href, section.exact))
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground'
                    )
                  }
                >
                  <section.icon className="h-4 w-4" />
                  {section.name}
                </TransitionNavLink>
              ) : (
                <>
                  <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.name}
                  </h3>
                  <div className="space-y-1">
                    {section.items?.map((item) => (
                      <TransitionNavLink
                        key={item.href}
                        to={item.href}
                        className={({ isActive: navIsActive }) =>
                          cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-muted group',
                            navIsActive || isActive(item.href)
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-muted-foreground hover:text-foreground'
                          )
                        }
                      >
                        <item.icon className="h-4 w-4" />
                        <div className="flex-1">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground group-hover:text-foreground/70">
                            {item.description}
                          </div>
                        </div>
                        {(isActive(item.href) && !isActive(item.href, true)) && (
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                        )}
                      </TransitionNavLink>
                    ))}
                  </div>
                </>
              )}
              
              {section !== navigation[navigation.length - 1] && (
                <Separator className="my-4" />
              )}
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="text-center text-xs text-muted-foreground">
          <p>Sistema de Cotações</p>
          <p>Admin Panel v2.0</p>
        </div>
      </div>
    </div>
  );
};