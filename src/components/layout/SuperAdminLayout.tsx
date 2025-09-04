import React from 'react';
import { Outlet } from 'react-router-dom';
import { SuperAdminSidebar } from './SuperAdminSidebar';
import { UserDropdown } from './UserDropdown';
import { RoleBasedNotificationDropdown } from './RoleBasedNotificationDropdown';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Bell, 
  Settings, 
  Shield,
  Activity,
  Users,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { Input } from '@/components/ui/input';

export const SuperAdminLayout = () => {
  console.log('SuperAdminLayout component rendering');
  // Mock quick stats for header
  const quickStats = {
    activeUsers: 1247,
    systemLoad: '23%',
    alertsCount: 3,
    uptime: '99.9%'
  };

  return (
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
            
            {/* Quick Stats */}
            <div className="hidden lg:flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="font-medium">{quickStats.activeUsers}</span>
                <span className="text-muted-foreground">usuários online</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4 text-green-500" />
                <span className="font-medium">{quickStats.systemLoad}</span>
                <span className="text-muted-foreground">carga</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span className="font-medium">{quickStats.uptime}</span>
                <span className="text-muted-foreground">uptime</span>
              </div>
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {/* Alerts */}
            {quickStats.alertsCount > 0 && (
              <Button variant="outline" size="sm" className="relative">
                <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2" />
                {quickStats.alertsCount} Alertas
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {quickStats.alertsCount}
                </Badge>
              </Button>
            )}
            
            {/* Quick Actions */}
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Config
            </Button>
            
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
  );
};

export default SuperAdminLayout;