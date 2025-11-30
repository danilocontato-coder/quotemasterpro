import React from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { CondominioSidebar } from './CondominioSidebar';
import { UserDropdown } from './UserDropdown';
import { RoleBasedNotificationDropdown } from './RoleBasedNotificationDropdown';
import { useSimpleRefreshPrevention } from '@/hooks/useSimpleRefreshPrevention';
import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';
import { useSystemBranding } from '@/hooks/useSystemBranding';
import { useAuth } from '@/contexts/AuthContext';

export const CondominioLayout = () => {
  const { settings: brandingSettings } = useSystemBranding();
  const { user } = useAuth();

  useSimpleRefreshPrevention();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <CondominioSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Top Header - Azul para diferenciar da administradora */}
          <header className="h-14 md:h-16 border-b border-blue-200 bg-blue-50 flex items-center justify-between px-3 md:px-6">
            <div className="flex items-center gap-2 md:gap-4">
              <SidebarTrigger className="text-blue-700" />
              
              {/* Nome do Condomínio */}
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900 hidden sm:inline">
                  Portal do Síndico
                </span>
              </div>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-2 md:gap-3">
              <RoleBasedNotificationDropdown />
              <UserDropdown />
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto">
            <div className="p-3 md:p-6">
              <Outlet />
            </div>
          </main>
          
          {/* Footer */}
          <footer className="hidden md:flex h-12 bg-blue-50 border-t border-blue-200 items-center justify-between px-6 text-sm text-blue-700 flex-shrink-0">
            <div className="flex items-center gap-4">
              <span className="hidden lg:inline">© 2024 {brandingSettings.platformName} - Portal do Síndico</span>
              <Badge variant="outline" className="text-xs border-blue-300">
                <Building2 className="h-3 w-3 mr-1" />
                Condomínio
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Online</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default CondominioLayout;
