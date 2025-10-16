import { 
  BarChart3, 
  FileText, 
  Users, 
  Package, 
  CreditCard, 
  Mail, 
  Settings, 
  Home,
  UserCog,
  Shield,
  CheckCircle,
  Layers,
  Crown,
  Brain,
  TreePine,
  HelpCircle,
  FileSignature
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { TransitionNavLink } from "./TransitionNavLink";
import { BrandedLogo } from "@/components/branding/BrandedLogo";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import { useBranding } from '@/contexts/BrandingContext';
import { useModuleAccess, type ModuleKey } from '@/hooks/useModuleAccess';

interface NavItem {
  title: string;
  url: string;
  icon: any;
  requiredModule?: ModuleKey;
}

// Módulos CORE - sempre disponíveis
const navigationItems: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Cotações", url: "/quotes", icon: FileText, requiredModule: 'quotes' },
  { title: "Contratos", url: "/contracts", icon: FileSignature, requiredModule: 'contracts' },
  { title: "Fornecedores", url: "/suppliers", icon: Users, requiredModule: 'suppliers' },
  { title: "Itens", url: "/products", icon: Package },
];

// Módulos AVANÇADOS - aprovações
const approvalItems: NavItem[] = [
  { title: "Aprovações", url: "/approvals", icon: CheckCircle, requiredModule: 'approvals' },
  { title: "Níveis de Aprovação", url: "/approval-levels", icon: Layers, requiredModule: 'approvals' },
  { title: "Negociações IA", url: "/ai-negotiations", icon: Brain, requiredModule: 'ai_negotiation' },
];

// Módulos AVANÇADOS - financeiro
const financialItems: NavItem[] = [
  { title: "Pagamentos", url: "/payments", icon: CreditCard, requiredModule: 'payments' },
  { title: "Centros de Custo", url: "/cost-centers", icon: TreePine, requiredModule: 'cost_centers' },
];

// Módulos de comunicação
const communicationItems: NavItem[] = [
  { title: "Comunicação", url: "/communication", icon: Mail },
];

// Módulos de sistema
const systemItems: NavItem[] = [
  { title: "Usuários", url: "/users", icon: UserCog },
  { title: "Permissões", url: "/permissions", icon: Shield },
  { title: "Relatórios", url: "/reports", icon: BarChart3, requiredModule: 'advanced_reports' },
  { title: "Planos", url: "/plans", icon: Crown },
  { title: "Ajuda", url: "/help", icon: HelpCircle },
  { title: "Configurações", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state, isMobile, setOpen } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  // No mobile, nunca colapsar - sempre mostrar textos quando aberto
  const isCollapsed = !isMobile && state === "collapsed";
  const { settings } = useBranding();
  const { enabledModules, isLoading } = useModuleAccess();

  const isActive = (path: string) => currentPath === path;
  
  const handleLinkClick = () => {
    if (isMobile) {
      // Force close sidebar on mobile
      setOpen(false);
      // Also set to collapsed state for extra safety
      
    }
  };

  // Filtrar itens de navegação baseado em módulos habilitados
  const filterMenuItems = (items: NavItem[]) => {
    return items.filter(item => {
      // Se não requer módulo, sempre mostrar
      if (!item.requiredModule) return true;
      // Se está carregando, mostrar tudo (evitar UI flickering)
      if (isLoading) return true;
      // Verificar se o módulo está habilitado
      return enabledModules.includes(item.requiredModule);
    });
  };

  const filteredNavigationItems = filterMenuItems(navigationItems);
  const filteredApprovalItems = filterMenuItems(approvalItems);
  const filteredFinancialItems = filterMenuItems(financialItems);
  const filteredSystemItems = filterMenuItems(systemItems);

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      {/* Logo/Brand */}
      <div className="p-4 border-b border-sidebar-border flex justify-center">
        <BrandedLogo 
          size={isCollapsed ? "md" : "lg"}
          showCompanyName={false}
        />
      </div>

      <SidebarContent className="py-4">
        {/* Main Navigation */}
        <SidebarGroup className="px-3">
          <SidebarGroupLabel className="text-sidebar-foreground/60 font-medium mb-3 px-2">
            {!isCollapsed && "Principal"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {filteredNavigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-10">
                    <TransitionNavLink 
                      to={item.url} 
                      className={`nav-item ${isActive(item.url) ? 'active' : ''}`}
                      onClick={handleLinkClick}
                      data-tour={
                        item.url === '/quotes' ? 'menu-quotes' :
                        item.url === '/suppliers' ? 'menu-suppliers' :
                        item.url === '/products' ? 'menu-products' :
                        undefined
                      }
                    >
                      <item.icon className="h-5 w-5" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </TransitionNavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Financial Section */}
        {filteredFinancialItems.length > 0 && (
          <SidebarGroup className="px-3 pt-4">
            <SidebarGroupLabel className="text-sidebar-foreground/60 font-medium mb-3 px-2">
              {!isCollapsed && "Financeiro"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {filteredFinancialItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-10">
                      <TransitionNavLink 
                        to={item.url} 
                        className={`nav-item ${isActive(item.url) ? 'active' : ''}`}
                        onClick={handleLinkClick}
                      >
                        <item.icon className="h-5 w-5" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </TransitionNavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Approval Section */}
        {filteredApprovalItems.length > 0 && (
          <SidebarGroup className="px-3 pt-4">
            <SidebarGroupLabel className="text-sidebar-foreground/60 font-medium mb-3 px-2">
              {!isCollapsed && "Aprovações"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {filteredApprovalItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-10">
                      <TransitionNavLink 
                        to={item.url}
                        data-tour={item.url === '/approvals' ? 'menu-approvals' : undefined}
                        className={`nav-item ${isActive(item.url) ? 'active' : ''}`}
                        onClick={handleLinkClick}
                      >
                        <item.icon className="h-5 w-5" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </TransitionNavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Communication Section */}
        <SidebarGroup className="px-3 pt-4">
          <SidebarGroupLabel className="text-sidebar-foreground/60 font-medium mb-3 px-2">
            {!isCollapsed && "Comunicação"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {communicationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-10">
                    <TransitionNavLink 
                      to={item.url} 
                      className={`nav-item ${isActive(item.url) ? 'active' : ''}`}
                      onClick={handleLinkClick}
                    >
                      <item.icon className="h-5 w-5" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </TransitionNavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* System Section */}
        <SidebarGroup className="px-3 pt-4">
          <SidebarGroupLabel className="text-sidebar-foreground/60 font-medium mb-3 px-2">
            {!isCollapsed && "Sistema"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {filteredSystemItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-10">
                    <TransitionNavLink 
                      to={item.url} 
                      className={`nav-item ${isActive(item.url) ? 'active' : ''}`}
                      onClick={handleLinkClick}
                    >
                      <item.icon className="h-5 w-5" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </TransitionNavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}