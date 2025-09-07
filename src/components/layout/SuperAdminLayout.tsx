import React from 'react';
import { Outlet } from 'react-router-dom';
import { SuperAdminSidebar } from './SuperAdminSidebar';
import { UserDropdown } from './UserDropdown';
import { RoleBasedNotificationDropdown } from './RoleBasedNotificationDropdown';
import { NotificationToast } from '@/components/common/NotificationToast';
import { SystemMetricsBar } from '@/components/admin/SystemMetricsBar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';

export const SuperAdminLayout = () => {
  console.log('SuperAdminLayout component rendering');

  return (
    <>
      <NotificationToast />
      <div className="h-screen bg-background flex">
      {/* Sidebar */}
      <SuperAdminSidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-card border-b flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuários, contas, logs..."
                className="pl-10"
              />
            </div>
            
            {/* System Metrics Bar - Funcional */}
            <SystemMetricsBar />
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <RoleBasedNotificationDropdown />
            
            {/* User Menu */}
            <UserDropdown />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <Outlet />
          </div>
        </main>
        
        {/* Footer */}
        <footer className="h-12 bg-card border-t flex items-center justify-between px-6 text-sm text-muted-foreground flex-shrink-0">
          <div className="flex items-center gap-4">
            <span>© 2024 QuoteMaster Pro - SuperAdmin Panel</span>
            <Badge variant="outline" className="text-xs">
              <Shield className="h-3 w-3 mr-1" />
              Ambiente Seguro
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <span>Última atualização: Hoje às 15:30</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Online</span>
            </div>
          </div>
        </footer>
      </div>
      </div>
    </>
  );
};

export default SuperAdminLayout;