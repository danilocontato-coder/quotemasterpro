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
  Truck,
  MessageSquare,
  HelpCircle
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
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
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Cotações", url: "/quotes", icon: FileText },
  { title: "Fornecedores", url: "/suppliers", icon: Users },
  { title: "Itens", url: "/products", icon: Package },
];

const financialItems = [
  { title: "Pagamentos", url: "/payments", icon: CreditCard },
];

const communicationItems = [
  { title: "Comunicação", url: "/communication", icon: Mail },
];

const supplierItems = [
  { title: "Cotações", url: "/supplier/quotes", icon: FileText },
  { title: "Recebimento", url: "/supplier/receiving", icon: Truck },
  { title: "Configurações", url: "/supplier/settings", icon: Settings },
];

const supportItems = [
  { title: "Tickets", url: "/support/tickets", icon: HelpCircle },
];

const systemItems = [
  { title: "Usuários", url: "/users", icon: UserCog },
  { title: "Permissões", url: "/permissions", icon: Shield },
  { title: "Relatórios", url: "/reports", icon: BarChart3 },
  { title: "Configurações", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;
  
  // Mock user role - in real app, this would come from auth context  
  const userRole = 'admin' as 'admin' | 'manager' | 'collaborator' | 'supplier';
  
  // Determine which sections to show based on role
  const showSupplierSection = userRole === 'supplier' || userRole === 'admin';
  const showSupportSection = true; // All roles can access support
  const showMainNavigation = userRole !== 'supplier';
  const showFinancialSection = userRole !== 'supplier';
  const showCommunicationSection = true;
  const showSystemSection = userRole === 'admin' || userRole === 'manager';

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
        {showMainNavigation && (
          <SidebarGroup className="px-3">
            <SidebarGroupLabel className="text-sidebar-foreground/60 font-medium mb-3 px-2">
              {!isCollapsed && "Principal"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {navigationItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-10">
                      <NavLink 
                        to={item.url} 
                        end
                        className={`nav-item ${isActive(item.url) ? 'active' : ''}`}
                      >
                        <item.icon className="h-5 w-5" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Supplier Section */}
        {showSupplierSection && (
          <SidebarGroup className="px-3 pt-4">
            <SidebarGroupLabel className="text-sidebar-foreground/60 font-medium mb-3 px-2">
              {!isCollapsed && "Fornecedor"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {supplierItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-10">
                      <NavLink 
                        to={item.url} 
                        className={`nav-item ${currentPath.startsWith(item.url) ? 'active' : ''}`}
                      >
                        <item.icon className="h-5 w-5" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Financial Section */}
        {showFinancialSection && (
          <SidebarGroup className="px-3 pt-4">
            <SidebarGroupLabel className="text-sidebar-foreground/60 font-medium mb-3 px-2">
              {!isCollapsed && "Financeiro"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {financialItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-10">
                      <NavLink 
                        to={item.url} 
                        end
                        className={`nav-item ${isActive(item.url) ? 'active' : ''}`}
                      >
                        <item.icon className="h-5 w-5" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Communication Section */}
        {showCommunicationSection && (
          <SidebarGroup className="px-3 pt-4">
            <SidebarGroupLabel className="text-sidebar-foreground/60 font-medium mb-3 px-2">
              {!isCollapsed && "Comunicação"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {communicationItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-10">
                      <NavLink 
                        to={item.url} 
                        end
                        className={`nav-item ${isActive(item.url) ? 'active' : ''}`}
                      >
                        <item.icon className="h-5 w-5" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Support Section */}
        {showSupportSection && (
          <SidebarGroup className="px-3 pt-4">
            <SidebarGroupLabel className="text-sidebar-foreground/60 font-medium mb-3 px-2">
              {!isCollapsed && "Suporte"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {supportItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-10">
                      <NavLink 
                        to={item.url} 
                        className={`nav-item ${currentPath.startsWith(item.url) ? 'active' : ''}`}
                      >
                        <item.icon className="h-5 w-5" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* System Section */}
        {showSystemSection && (
          <SidebarGroup className="px-3 pt-4">
            <SidebarGroupLabel className="text-sidebar-foreground/60 font-medium mb-3 px-2">
              {!isCollapsed && "Sistema"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {systemItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-10">
                      <NavLink 
                        to={item.url} 
                        end
                        className={`nav-item ${isActive(item.url) ? 'active' : ''}`}
                      >
                        <item.icon className="h-5 w-5" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}