import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NotificationDropdown } from "./NotificationDropdown";
import { UserDropdown } from "./UserDropdown";
import { SystemStatusHeader } from "./SystemStatusHeader";

import { useStableRealtime } from "@/hooks/useStableRealtime";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useRef } from "react";

export function MainLayout() {
  const { user } = useAuth();
  const mountTimeRef = useRef(Date.now());
  const renderCountRef = useRef(0);
  
  renderCountRef.current++;
  
  console.log('🔍 [DEBUG-LAYOUT] MainLayout render:', {
    renderCount: renderCountRef.current,
    userId: user?.id,
    userRole: user?.role,
    timeSinceMount: Date.now() - mountTimeRef.current,
    timestamp: new Date().toISOString()
  });
  
  useEffect(() => {
    console.log('🔍 [DEBUG-LAYOUT] MainLayout mounted at:', new Date().toISOString());
    return () => {
      console.log('🔍 [DEBUG-LAYOUT] MainLayout unmounting after:', Date.now() - mountTimeRef.current, 'ms');
    };
  }, []);
  
  // Hook de realtime unificado e estável
  useStableRealtime();

  return (
    <>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          
          <div className="flex-1 flex flex-col">
            {/* System Status Header - only for admin */}
            {user?.role === 'admin' && <SystemStatusHeader />}
            
            {/* Enhanced Top Header */}
            <header className="h-16 border-b border-border bg-card/80 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-40">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="hover:bg-accent hover:text-accent-foreground rounded-md p-2 transition-colors" />
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 transition-colors" />
                  <Input
                    variant="modern"
                    placeholder="Buscar cotações, fornecedores..."
                    className="pl-10 w-80 bg-background/50 backdrop-blur-sm border-border/50 focus:bg-background focus:border-border-focus"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <NotificationDropdown />
                <UserDropdown />
              </div>
            </header>

            {/* Enhanced Main Content */}
            <main className="flex-1 overflow-auto">
              <div className="container mx-auto p-6 space-y-6">
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