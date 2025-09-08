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
  Brain
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
  { title: "Dashboard", url: "/app/dashboard", icon: Home },
  { title: "Cotações", url: "/app/quotes", icon: FileText },
  { title: "Fornecedores", url: "/app/suppliers", icon: Users },
  { title: "Itens", url: "/app/products", icon: Package },
];

const approvalItems = [
  { title: "Aprovações", url: "/app/approvals", icon: CheckCircle },
  { title: "Níveis de Aprovação", url: "/app/approval-levels", icon: Layers },
  { title: "Negociações IA", url: "/app/ai-negotiations", icon: Brain },
];

const financialItems = [
  { title: "Pagamentos", url: "/app/payments", icon: CreditCard },
];

const communicationItems = [
  { title: "Comunicação", url: "/app/communication", icon: Mail },
];

// Removed admin items section

const systemItems = [
  { title: "Usuários", url: "/app/users", icon: UserCog },
  { title: "Permissões", url: "/app/permissions", icon: Shield },
  { title: "Relatórios", url: "/app/reports", icon: BarChart3 },
  { title: "Planos", url: "/app/plans", icon: Crown },
  { title: "Configurações", url: "/app/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      {/* Logo/Brand */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-lg font-semibold text-sidebar-foreground">QuoteMaster</h1>
              <p className="text-xs text-sidebar-foreground/70">Pro</p>
            </div>
          )}
        </div>
      </div>

      <SidebarContent className="py-4">
        {/* Main Navigation */}
        <SidebarGroup className="px-3">
          <SidebarGroupLabel className="text-sidebar-foreground/60 font-medium mb-3 px-2">
            {!isCollapsed && "Principal"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-10">
                    <TransitionNavLink 
                      to={item.url} 
                      className={`nav-item ${isActive(item.url) ? 'active' : ''}`}
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
        <SidebarGroup className="px-3 pt-4">
          <SidebarGroupLabel className="text-sidebar-foreground/60 font-medium mb-3 px-2">
            {!isCollapsed && "Financeiro"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {financialItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-10">
                    <TransitionNavLink 
                      to={item.url} 
                      className={`nav-item ${isActive(item.url) ? 'active' : ''}`}
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

        {/* Approval Section */}
        <SidebarGroup className="px-3 pt-4">
          <SidebarGroupLabel className="text-sidebar-foreground/60 font-medium mb-3 px-2">
            {!isCollapsed && "Aprovações"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {approvalItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-10">
                    <TransitionNavLink 
                      to={item.url} 
                      className={`nav-item ${isActive(item.url) ? 'active' : ''}`}
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
              {systemItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-10">
                    <TransitionNavLink 
                      to={item.url} 
                      className={`nav-item ${isActive(item.url) ? 'active' : ''}`}
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