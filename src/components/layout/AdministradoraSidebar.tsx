import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  FileText,
  CheckCircle,
  DollarSign,
  BarChart3,
  Users,
  Settings,
  Package,
  TrendingUp
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar';
import { useBranding } from '@/contexts/BrandingContext';

const menuItems = [
  { title: 'Dashboard', url: '/administradora/dashboard', icon: LayoutDashboard },
  { title: 'Meus Condomínios', url: '/administradora/condominios', icon: Building2 },
  { title: 'Cotações', url: '/administradora/cotacoes', icon: FileText },
  { title: 'Aprovações', url: '/administradora/aprovacoes', icon: CheckCircle },
  { title: 'Pagamentos', url: '/administradora/pagamentos', icon: DollarSign },
  { title: 'Fornecedores', url: '/administradora/fornecedores', icon: Users },
  { title: 'Produtos', url: '/administradora/produtos', icon: Package },
];

const analyticsItems = [
  { title: 'Relatórios', url: '/administradora/relatorios', icon: BarChart3 },
  { title: 'Análise de Mercado', url: '/administradora/analise-mercado', icon: TrendingUp },
];

const systemItems = [
  { title: 'Configurações', url: '/administradora/configuracoes', icon: Settings },
];

export const AdministradoraSidebar: React.FC = () => {
  const location = useLocation();
  const { state } = useSidebar();
  const { settings } = useBranding();
  const isCollapsed = state === 'collapsed';

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon" className="border-r border-green-200 bg-green-50">
      <SidebarContent>
        {/* Logo/Brand */}
        <div className="flex items-center gap-2 px-4 py-6 border-b border-green-200">
          {!isCollapsed && (
            <>
              <Building2 className="h-6 w-6 text-green-600" />
              <div className="flex flex-col">
                <span className="font-bold text-green-900">
                  {settings.companyName}
                </span>
                <span className="text-xs text-green-600">Administradora</span>
              </div>
            </>
          )}
          {isCollapsed && (
            <Building2 className="h-6 w-6 text-green-600 mx-auto" />
          )}
        </div>

        {/* Menu Principal */}
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-green-700">Principal</SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                          isActive
                            ? 'bg-green-600 text-white'
                            : 'text-green-900 hover:bg-green-100'
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Analytics */}
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-green-700">Análises</SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {analyticsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                          isActive
                            ? 'bg-green-600 text-white'
                            : 'text-green-900 hover:bg-green-100'
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Sistema */}
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-green-700">Sistema</SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                          isActive
                            ? 'bg-green-600 text-white'
                            : 'text-green-900 hover:bg-green-100'
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4" />
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
};
