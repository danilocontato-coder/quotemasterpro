import { 
  BarChart3, 
  FileText, 
  Package2, 
  Settings, 
  Home,
  Truck,
  MessageSquare,
  DollarSign,
  History,
  Users,
  Palette
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

import { useBranding } from '@/contexts/BrandingContext';

const navigationItems = [
  { title: "Dashboard", url: "/supplier", icon: Home },
  { title: "Cotações", url: "/supplier/quotes", icon: FileText },
  { title: "Meus Produtos", url: "/supplier/products", icon: Package2 },
  { title: "Relatórios", url: "/supplier/reports", icon: BarChart3 },
  { title: "Recebimentos", url: "/supplier/receivables", icon: DollarSign },
  { title: "Entregas", url: "/supplier/deliveries", icon: Truck },
];

const systemItems = [
  { title: "Usuários", url: "/supplier/users", icon: Users },
  { title: "Histórico", url: "/supplier/history", icon: History },
  { title: "Configurações", url: "/supplier/settings", icon: Settings },
  { title: "Branding", url: "/supplier/branding", icon: Palette },
];

export function SupplierSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";
  const { settings } = useBranding();

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
              <h1 className="text-lg font-semibold text-sidebar-foreground">{settings.companyName}</h1>
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
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10">
                  <TransitionNavLink 
                    to="/supplier/messages" 
                    className={`nav-item ${isActive("/supplier/messages") ? 'active' : ''}`}
                  >
                    <MessageSquare className="h-5 w-5" />
                    {!isCollapsed && <span>Mensagens</span>}
                  </TransitionNavLink>
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