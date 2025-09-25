import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NotificationDropdown } from "./NotificationDropdown";
import { UserDropdown } from "./UserDropdown";
import { SystemStatusHeader } from "./SystemStatusHeader";
import { useSimpleRefreshPrevention } from "@/hooks/useSimpleRefreshPrevention";

// useStableRealtime removido - usando sistema centralizado
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useRef } from "react";
import { useClientStatusMonitor } from "@/hooks/useClientStatusMonitor";
import { ClientStatusToast } from "@/components/auth/ClientStatusToast";

export function MainLayout() {
  const { user } = useAuth();
  
  // Prevenção simples de refresh que não interfere com auth
  useSimpleRefreshPrevention();
  
  // Monitorar status do cliente em tempo real
  useClientStatusMonitor();
  
  // Real-time centralizado ativo via AppWithProviders
  // useStableRealtime(); // Removido

  return (
    <>
      <ClientStatusToast />
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          
          <div className="flex-1 flex flex-col">
            {/* System Status Header - only for admin */}
            {user?.role === 'admin' && <SystemStatusHeader />}
            
            {/* Top Header */}
            <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar cotações, fornecedores..."
                    className="pl-10 w-80"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <NotificationDropdown />
                <UserDropdown />
              </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
              <div className="p-6">
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </>
  );
}

export default MainLayout;