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
  Building2,
  Sparkles
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { TransitionNavLink } from "./TransitionNavLink";
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

const navigationItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Cotações", url: "/quotes", icon: FileText },
  { title: "Fornecedores", url: "/suppliers", icon: Users },
  { title: "Itens", url: "/products", icon: Package },
];

const approvalItems = [
  { title: "Aprovações", url: "/approvals", icon: CheckCircle },
  { title: "Níveis de Aprovação", url: "/approval-levels", icon: Layers },
  { title: "Negociações IA", url: "/ai-negotiations", icon: Brain },
];

const financialItems = [
  { title: "Pagamentos", url: "/payments", icon: CreditCard },
];

const communicationItems = [
  { title: "Comunicação", url: "/communication", icon: Mail },
];

// Removed admin items section

const systemItems = [
  { title: "Usuários", url: "/users", icon: UserCog },
  { title: "Permissões", url: "/permissions", icon: Shield },
  { title: "Relatórios", url: "/reports", icon: BarChart3 },
  { title: "Planos", url: "/plans", icon: Crown },
  { title: "Configurações", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar className="border-r border-sidebar-border/50 bg-gradient-to-b from-sidebar-background to-sidebar-background/95 backdrop-blur-xl">
      {/* Enhanced Logo/Brand */}
      <div className="p-6 border-b border-sidebar-border/30 relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-sidebar-primary via-sidebar-primary to-sidebar-primary/80 rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <Building2 className="h-6 w-6 text-sidebar-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-sidebar-foreground bg-gradient-to-r from-sidebar-foreground to-sidebar-foreground/80 bg-clip-text">
                  QuoteMaster
                </h1>
                <Sparkles className="h-4 w-4 text-sidebar-primary animate-pulse" />
              </div>
              <p className="text-xs text-sidebar-foreground/60 font-medium tracking-wide">Pro Edition</p>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <div className="absolute -bottom-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-sidebar-border/50 to-transparent" />
        )}
      </div>

      <SidebarContent className="py-6 px-4">
        {/* Enhanced Main Navigation */}
        <SidebarGroup className="space-y-2">
          <SidebarGroupLabel className="text-sidebar-foreground/60 font-semibold text-xs uppercase tracking-wider mb-4 px-3">
            {!isCollapsed && "Principal"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-11 rounded-xl">
                    <TransitionNavLink 
                      to={item.url} 
                      className={`nav-modern group ${isActive(item.url) ? 'active' : ''}`}
                    >
                      <item.icon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
                      {!isCollapsed && (
                        <span className="font-medium transition-colors duration-200">{item.title}</span>
                      )}
                    </TransitionNavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Enhanced Financial Section */}
        <SidebarGroup className="space-y-2 pt-6">
          <SidebarGroupLabel className="text-sidebar-foreground/60 font-semibold text-xs uppercase tracking-wider mb-4 px-3">
            {!isCollapsed && "Financeiro"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {financialItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-11 rounded-xl">
                    <TransitionNavLink 
                      to={item.url} 
                      className={`nav-modern group ${isActive(item.url) ? 'active' : ''}`}
                    >
                      <item.icon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
                      {!isCollapsed && (
                        <span className="font-medium transition-colors duration-200">{item.title}</span>
                      )}
                    </TransitionNavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Enhanced Approval Section */}
        <SidebarGroup className="space-y-2 pt-6">
          <SidebarGroupLabel className="text-sidebar-foreground/60 font-semibold text-xs uppercase tracking-wider mb-4 px-3">
            {!isCollapsed && "Aprovações"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {approvalItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-11 rounded-xl">
                    <TransitionNavLink 
                      to={item.url} 
                      className={`nav-modern group ${isActive(item.url) ? 'active' : ''}`}
                    >
                      <item.icon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
                      {!isCollapsed && (
                        <span className="font-medium transition-colors duration-200">{item.title}</span>
                      )}
                    </TransitionNavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Enhanced Communication Section */}
        <SidebarGroup className="space-y-2 pt-6">
          <SidebarGroupLabel className="text-sidebar-foreground/60 font-semibold text-xs uppercase tracking-wider mb-4 px-3">
            {!isCollapsed && "Comunicação"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {communicationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-11 rounded-xl">
                    <TransitionNavLink 
                      to={item.url} 
                      className={`nav-modern group ${isActive(item.url) ? 'active' : ''}`}
                    >
                      <item.icon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
                      {!isCollapsed && (
                        <span className="font-medium transition-colors duration-200">{item.title}</span>
                      )}
                    </TransitionNavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Enhanced System Section */}
        <SidebarGroup className="space-y-2 pt-6">
          <SidebarGroupLabel className="text-sidebar-foreground/60 font-semibold text-xs uppercase tracking-wider mb-4 px-3">
            {!isCollapsed && "Sistema"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {systemItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-11 rounded-xl">
                    <TransitionNavLink 
                      to={item.url} 
                      className={`nav-modern group ${isActive(item.url) ? 'active' : ''}`}
                    >
                      <item.icon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
                      {!isCollapsed && (
                        <span className="font-medium transition-colors duration-200">{item.title}</span>
                      )}
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