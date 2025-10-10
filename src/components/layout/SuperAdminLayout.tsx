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
      <SidebarProvider defaultOpen={false}>
        <div className="min-h-screen flex w-full bg-background">
          <SuperAdminSidebar />
          
          <div className="flex-1 flex flex-col">
            {/* Top Header */}
            <header className="h-14 md:h-16 border-b border-border bg-card flex items-center justify-between px-3 md:px-6">
              <div className="flex items-center gap-2 md:gap-4">
                <SidebarTrigger />
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
            <footer className="hidden md:flex h-12 bg-card border-t items-center justify-between px-6 text-sm text-muted-foreground flex-shrink-0">
              <div className="flex items-center gap-4">
                <span className="hidden lg:inline">© 2024 {settings.companyName} - SuperAdmin Panel</span>
                <Badge variant="outline" className="text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  Ambiente Seguro
                </Badge>
              </div>
              <div className="flex items-center gap-4">
                <span className="hidden xl:inline">Última atualização: Hoje às 15:30</span>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Online</span>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </SidebarProvider>
    </>
  );
};

export default SuperAdminLayout;