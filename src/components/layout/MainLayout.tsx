import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NotificationDropdown } from "./NotificationDropdown";
import { UserDropdown } from "./UserDropdown";
import { useSupabaseCurrentClient } from "@/hooks/useSupabaseCurrentClient";
import { usePlanDetails } from "@/hooks/useSubscriptionPlans";

export function MainLayout() {
  const { clientName, subscriptionPlan, isLoading } = useSupabaseCurrentClient();
  const { displayName: planDisplayName } = usePlanDetails(subscriptionPlan);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
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
              {/* Company Name */}
              <div className="text-right mr-4">
                {isLoading ? (
                  <div className="animate-pulse">
                    <div className="h-3 bg-muted rounded w-32 mb-1"></div>
                    <div className="h-2 bg-muted rounded w-16"></div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-medium text-foreground">{clientName}</p>
                    <p className="text-[10px] text-muted-foreground">{planDisplayName}</p>
                  </>
                )}
              </div>
              
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
  );
}