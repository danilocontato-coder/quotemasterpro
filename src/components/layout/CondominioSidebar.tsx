import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  CheckCircle,
  Truck,
  DollarSign,
  BarChart3,
  Users,
  Settings,
  HelpCircle,
  Brain
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
import { BrandedLogo } from '@/components/branding/BrandedLogo';

const menuItems = [
  { title: 'Dashboard', url: '/condominio', icon: LayoutDashboard },
  { title: 'Cotações', url: '/condominio/cotacoes', icon: FileText },
  { title: 'Aprovações', url: '/condominio/aprovacoes', icon: CheckCircle },
  { title: 'Entregas', url: '/condominio/entregas', icon: Truck },
  { title: 'Pagamentos', url: '/condominio/pagamentos', icon: DollarSign },
];

const analyticsItems = [
  { title: 'Fornecedores', url: '/condominio/fornecedores', icon: Users },
  { title: 'Análise de IA', url: '/condominio/analise-ia', icon: Brain },
  { title: 'Relatórios', url: '/condominio/relatorios', icon: BarChart3 },
];

const systemItems = [
  { title: 'Configurações', url: '/condominio/configuracoes', icon: Settings },
  { title: 'Ajuda', url: '/condominio/ajuda', icon: HelpCircle },
];

export const CondominioSidebar: React.FC = () => {
  const location = useLocation();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const isActive = (path: string) => {
    if (path === '/condominio') {
      return location.pathname === '/condominio';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-blue-200 bg-blue-50">
      <SidebarContent>
        {/* Logo/Brand */}
        <div className="px-4 py-6 border-b border-blue-200 flex justify-center">
          <BrandedLogo 
            size={isCollapsed ? "md" : "lg"}
            showCompanyName={false}
          />
        </div>

        {/* Menu Principal */}
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-blue-700">Principal</SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      end={item.url === '/condominio'}
                      className={({ isActive: navIsActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                          navIsActive
                            ? 'bg-blue-600 text-white'
                            : 'text-blue-900 hover:bg-blue-100'
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

        {/* Análises */}
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-blue-700">Análises</SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {analyticsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      className={({ isActive: navIsActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                          navIsActive
                            ? 'bg-blue-600 text-white'
                            : 'text-blue-900 hover:bg-blue-100'
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
            <SidebarGroupLabel className="text-blue-700">Sistema</SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      className={({ isActive: navIsActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                          navIsActive
                            ? 'bg-blue-600 text-white'
                            : 'text-blue-900 hover:bg-blue-100'
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
