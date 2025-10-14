import React from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdministradoraSidebar } from './AdministradoraSidebar';
import { ClientContextSwitcher } from './ClientContextSwitcher';
import { UserDropdown } from './UserDropdown';
import { RoleBasedNotificationDropdown } from './RoleBasedNotificationDropdown';
import { useSimpleRefreshPrevention } from '@/hooks/useSimpleRefreshPrevention';
import { AdministradoraProvider } from '@/contexts/AdministradoraContext';
import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';
import { useSystemBranding } from '@/hooks/useSystemBranding';

export const AdministradoraLayout = () => {
  console.log('AdministradoraLayout component rendering');
  const { settings: brandingSettings } = useSystemBranding();

  // Prevenção simples de refresh que não interfere com auth
  useSimpleRefreshPrevention();

  return (
    <AdministradoraProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AdministradoraSidebar />
          
          <div className="flex-1 flex flex-col">
            {/* Top Header com fundo verde claro */}
            <header className="h-14 md:h-16 border-b border-green-200 bg-green-50 flex items-center justify-between px-3 md:px-6">
              <div className="flex items-center gap-2 md:gap-4">
                <SidebarTrigger className="text-green-700" />
                
                {/* Seletor de Contexto */}
                <ClientContextSwitcher />
              </div>

              {/* Right side actions */}
              <div className="flex items-center gap-2 md:gap-3">
                {/* Notifications */}
                <RoleBasedNotificationDropdown />
                
                {/* User Menu */}
                <UserDropdown />
              </div>
            </header>

            {/* Page Content */}
            <main className="flex-1 overflow-auto">
              <div className="p-3 md:p-6">
                <Outlet />
              </div>
            </main>
            
            {/* Footer - Hidden on mobile */}
            <footer className="hidden md:flex h-12 bg-green-50 border-t border-green-200 items-center justify-between px-6 text-sm text-green-700 flex-shrink-0">
              <div className="flex items-center gap-4">
                <span className="hidden lg:inline">© 2024 {brandingSettings.platformName} - Painel Administradora</span>
                <Badge variant="outline" className="text-xs border-green-300">
                  <Shield className="h-3 w-3 mr-1" />
                  Ambiente Seguro
                </Badge>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Online</span>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </SidebarProvider>
    </AdministradoraProvider>
  );
};

export default AdministradoraLayout;
