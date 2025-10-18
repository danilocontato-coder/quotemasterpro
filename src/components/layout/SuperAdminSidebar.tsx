import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { TransitionNavLink } from './TransitionNavLink';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useSidebar } from '@/components/ui/sidebar';
import { useBranding } from '@/contexts/BrandingContext';
import { BrandedLogo } from '@/components/branding/BrandedLogo';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ChevronDown } from 'lucide-react';
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
  Globe,
  HelpCircle,
  UserCog,
  Palette,
  Send
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
        name: 'Gestão de Cupons',
        href: '/admin/coupons',
        icon: CreditCard,
        description: 'Cupons de desconto'
      }
    ]
  },
  {
    name: 'Analytics & Financeiro',
    items: [
      {
        name: 'Prospecção Inteligente',
        href: '/admin/prospecting',
        icon: Bot,
        description: 'IA para crescimento',
        badge: 'IA'
      },
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
        icon: Mail,
        description: 'Campanhas de e-mail',
        badge: 'IA',
        items: [
          {
            name: 'Dashboard',
            href: '/admin/email-marketing',
            icon: Mail
          },
          {
            name: 'Campanhas',
            href: '/admin/email-marketing/campaigns',
            icon: Send
          },
          {
            name: 'Contatos',
            href: '/admin/email-marketing/contacts',
            icon: Users
          }
        ]
      },
      {
        name: 'Templates & Mensagens',
        href: '/admin/templates',
        icon: MessageSquare,
        description: 'WhatsApp, Email, SMS'
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
    name: 'Sistema & Configurações',
    items: [
      {
        name: 'Configurações',
        href: '/admin/system',
        icon: Settings,
        description: 'Configurações do sistema'
      },
      {
        name: 'Marca',
        href: '/admin/brand',
        icon: Palette,
        description: 'Logo e identidade visual'
      },
      {
        name: 'Domínio',
        href: '/admin/domain',
        icon: Globe,
        description: 'Domínio personalizado'
      },
      {
        name: 'Integrações & APIs',
        href: '/admin/integrations',
        icon: Zap,
        description: 'APIs externas'
      },
      {
        name: 'Configuração IA',
        href: '/admin/ai-config',
        icon: Bot,
        description: 'Negociação automática'
      },
      {
        name: 'Configuração de E-mails',
        href: '/admin/email-settings',
        icon: Send,
        description: 'SMTP e Resend'
      }
    ]
  },
  {
    name: 'Administração',
    items: [
      {
        name: 'Auditoria',
        href: '/admin/audit',
        icon: Shield,
        description: 'Logs e histórico'
      },
      {
        name: 'Logs do Sistema',
        href: '/admin/logs',
        icon: Activity,
        description: 'Logs de atividade'
      },
      {
        name: 'Banco de Dados',
        href: '/admin/database',
        icon: Database,
        description: 'Gerenciamento DB'
      },
      {
        name: 'Monitoramento',
        href: '/admin/monitoring',
        icon: Server,
        description: 'Status dos serviços'
      },
      {
        name: 'Ajuda',
        href: '/help',
        icon: HelpCircle,
        description: 'Central de ajuda'
      }
    ]
  }
];

export const SuperAdminSidebar = () => {
  const location = useLocation();
  const { settings } = useBranding();
  const [expandedSections, setExpandedSections] = useState<string[]>(['Comunicação']);

  const isActive = (href: string, exact = false) => {
    if (exact) {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };
  
  const { isMobile, setOpen } = useSidebar();
  
  const handleLinkClick = () => {
    if (isMobile) {
      setOpen(false);
    }
  };

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r">
      {/* Header */}
      <div data-tour="superadmin-header" className="flex flex-col items-center px-6 py-6 border-b gap-3">
        <BrandedLogo size="md" showCompanyName={false} />
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">Administrador Master</p>
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
                  onClick={handleLinkClick}
                  className={({ isActive: navIsActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted',
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
                      item.items ? (
                        // Item com subitens (accordion)
                        <Accordion 
                          key={item.name}
                          type="multiple" 
                          value={expandedSections} 
                          onValueChange={setExpandedSections}
                          className="w-full"
                        >
                          <AccordionItem value={item.name} className="border-none">
                            <AccordionTrigger 
                              className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted hover:no-underline group",
                                "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <item.icon className="h-4 w-4" />
                                <div className="flex-1 text-left">
                                  <div className="font-medium flex items-center gap-2">
                                    {item.name}
                                    {item.badge && (
                                      <Badge variant="secondary" className="text-xs px-1 py-0">
                                        {item.badge}
                                      </Badge>
                                    )}
                                  </div>
                                  {item.description && (
                                    <div className="text-xs text-muted-foreground group-hover:text-foreground/70">
                                      {item.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-1 pt-1">
                              <div className="space-y-1 pl-7">
                                {item.items.map((subItem) => (
                                  <TransitionNavLink
                                    key={subItem.href}
                                    to={subItem.href}
                                    onClick={handleLinkClick}
                                    className={({ isActive: navIsActive }) =>
                                      cn(
                                        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted',
                                        navIsActive || isActive(subItem.href)
                                          ? 'bg-primary/10 text-primary font-medium'
                                          : 'text-muted-foreground hover:text-foreground'
                                      )
                                    }
                                  >
                                    <subItem.icon className="h-3.5 w-3.5" />
                                    {subItem.name}
                                  </TransitionNavLink>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      ) : (
                        // Item normal sem subitens
                        <TransitionNavLink
                          key={item.href}
                          to={item.href}
                          onClick={handleLinkClick}
                          data-tour={
                            item.href === '/admin/clients' ? 'menu-clients' :
                            item.href === '/admin/suppliers' ? 'menu-suppliers' :
                            item.href === '/admin/plans' ? 'menu-plans' :
                            item.href === '/admin/analytics' ? 'menu-analytics' :
                            undefined
                          }
                          className={({ isActive: navIsActive }) =>
                            cn(
                              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted group',
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
                      )
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
          <p>{settings.companyName}</p>
          <p>Admin Panel v2.0</p>
        </div>
      </div>
    </div>
  );
};