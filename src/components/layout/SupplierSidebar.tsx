import { 
  BarChart3, 
  FileText, 
  Package2, 
  Settings, 
  Home,
  Truck,
  MessageSquare,
  DollarSign,
  History
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
  { title: "Dashboard", url: "/supplier", icon: Home },
  { title: "Cotações", url: "/supplier/quotes", icon: FileText },
  { title: "Meus Produtos", url: "/supplier/products", icon: Package2 },
  { title: "Financeiro", url: "/supplier/financial", icon: DollarSign },
  { title: "Entregas", url: "/supplier/deliveries", icon: Truck },
];

const systemItems = [
  { title: "Histórico", url: "/supplier/history", icon: History },
  { title: "Configurações", url: "/supplier/settings", icon: Settings },
];

export function SupplierSidebar() {
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
              <p className="text-xs text-sidebar-foreground/70">Fornecedor</p>
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

        {/* Communication Section */}
        <SidebarGroup className="px-3 pt-4">
          <SidebarGroupLabel className="text-sidebar-foreground/60 font-medium mb-3 px-2">
            {!isCollapsed && "Comunicação"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10">
                  <NavLink 
                    to="/supplier/messages" 
                    end
                    className={`nav-item ${isActive("/supplier/messages") ? 'active' : ''}`}
                  >
                    <MessageSquare className="h-5 w-5" />
                    {!isCollapsed && <span>Mensagens</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
      </SidebarContent>
    </Sidebar>
  );
}