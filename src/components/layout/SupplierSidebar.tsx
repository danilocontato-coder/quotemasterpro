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
  HelpCircle
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
  { title: "Ajuda", url: "/help", icon: HelpCircle },
  { title: "Configurações", url: "/supplier/settings", icon: Settings },
  // Branding removido - só deve ser acessível por admins
];

export function SupplierSidebar() {
  const { state, isMobile, setOpen } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  // No mobile, nunca colapsar - sempre mostrar textos quando aberto
  const isCollapsed = !isMobile && state === "collapsed";
  const { settings } = useBranding();

  const isActive = (path: string) => currentPath === path;
  
  const handleLinkClick = () => {
    if (isMobile) {
      // Force close sidebar on mobile
      setOpen(false);
      // Also set to collapsed state for extra safety
      document.body.click(); // trigger outside click
    }
  };

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
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-10">
                    <TransitionNavLink 
                      to={item.url} 
                      className={`nav-item ${isActive(item.url) ? 'active' : ''}`}
                      onClick={handleLinkClick}
                      data-tour={
                        item.url === '/supplier/quotes' ? 'menu-quotes' :
                        item.url === '/supplier/products' ? 'menu-products' :
                        item.url === '/supplier/payments' ? 'menu-payments' :
                        item.url === '/supplier/profile' ? 'menu-profile' :
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
                    onClick={handleLinkClick}
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