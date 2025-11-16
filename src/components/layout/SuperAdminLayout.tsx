import React from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SuperAdminSidebar } from './SuperAdminSidebar';
import { UserDropdown } from './UserDropdown';
import { RoleBasedNotificationDropdown } from './RoleBasedNotificationDropdown';
import { useSimpleRefreshPrevention } from '@/hooks/useSimpleRefreshPrevention';
import { useBranding } from '@/contexts/BrandingContext';

import { SystemMetricsBar } from '@/components/admin/SystemMetricsBar';
import { Badge } from '@/components/ui/badge';
import { Search, Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';

export const SuperAdminLayout = () => {
  console.log('SuperAdminLayout component rendering');
  const { settings } = useBranding();

  // Prevenção simples de refresh que não interfere com auth
  useSimpleRefreshPrevention();

  return (
    <>
      <SidebarProvider defaultOpen={true}>
        <div className="min-h-screen flex w-full bg-background">
          <SuperAdminSidebar />
          
          <div className="flex-1 flex flex-col">
            {/* Top Header - Mobile Optimized */}
            <header className="h-14 md:h-16 border-b border-border bg-card flex items-center justify-between px-3 md:px-6 sticky top-0 z-50">
              <div className="flex items-center gap-2 md:gap-4">
                <SidebarTrigger className="lg:hidden" />
                
                {/* Título do painel em mobile */}
                <div className="flex items-center gap-2 lg:hidden">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">SuperAdmin</span>
                </div>
                
                {/* Busca - Desktop only */}
                <div className="relative hidden lg:block">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar usuários, contas, logs..."
                    className="pl-10 w-60 xl:w-80"
                  />
                </div>
                
                {/* System Metrics Bar - Hidden on mobile */}
                <div className="hidden xl:block">
                  <SystemMetricsBar />
                </div>
              </div>

              {/* Right side actions - Compacto em mobile */}
              <div className="flex items-center gap-1 md:gap-3">
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
            
            {/* Footer - Versão compacta em mobile */}
            <footer className="flex h-10 md:h-12 bg-card border-t items-center justify-between px-3 md:px-6 text-xs md:text-sm text-muted-foreground flex-shrink-0">
              <div className="flex items-center gap-2 md:gap-4">
                <span className="hidden sm:inline">© 2024 {settings.companyName}</span>
                <span className="sm:hidden">© 2024</span>
                <Badge variant="outline" className="text-xs">
                  <Shield className="h-2 w-2 md:h-3 md:w-3 mr-1" />
                  <span className="hidden sm:inline">Seguro</span>
                  <span className="sm:hidden">🔒</span>
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Online</span>
              </div>
            </footer>
          </div>
        </div>
      </SidebarProvider>
    </>
  );
};

export default SuperAdminLayout;