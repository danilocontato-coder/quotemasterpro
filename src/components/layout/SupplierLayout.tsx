import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SupplierSidebar } from "./SupplierSidebar";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { RoleBasedNotificationDropdown } from "./RoleBasedNotificationDropdown";
import { UserDropdown } from "./UserDropdown";
import { useSupplierData } from "@/hooks/useSupplierData";
import { useClientStatusMonitor } from "@/hooks/useClientStatusMonitor";
import { useSupplierStatusMonitor } from "@/hooks/useSupplierStatusMonitor";
import { ClientStatusToast } from "@/components/auth/ClientStatusToast";
import { SupplierStatusToast } from "@/components/auth/SupplierStatusToast";
import { useSimpleRefreshPrevention } from "@/hooks/useSimpleRefreshPrevention";

export function SupplierLayout() {
  const { supplierData, isLoading } = useSupplierData();
  
  // Prevenção simples de refresh que não interfere com auth
  useSimpleRefreshPrevention();
  
  // Monitorar status do cliente em tempo real (se fornecedor tiver client_id)
  useClientStatusMonitor();
  
  // Monitorar status do fornecedor em tempo real
  useSupplierStatusMonitor();
  
  const supplierName = supplierData?.name || "Carregando...";
  const planDisplayName = supplierData?.planDisplayName || "Basic";

  return (
    <>
      <ClientStatusToast />
      <SupplierStatusToast />
      <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <SupplierSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Top Header */}
          <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar cotações, propostas..."
                  className="pl-10 w-80"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Supplier Name */}
              <div className="text-right mr-4">
                <p className="text-xs font-medium text-foreground">{supplierName}</p>
                <p className="text-[10px] text-muted-foreground">Plano {planDisplayName}</p>
              </div>
              
              <RoleBasedNotificationDropdown />
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

export default SupplierLayout;