import { Outlet, Link } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SupplierSidebar } from "./SupplierSidebar";
import { Search, CreditCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
      <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <SupplierSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Top Header */}
          <header className="h-14 md:h-16 border-b border-border bg-card flex items-center justify-between px-3 md:px-6">
            <div className="flex items-center gap-2 md:gap-4">
              <SidebarTrigger />
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar cotações, propostas..."
                  className="pl-10 w-60 lg:w-80"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-3">
              {/* Supplier Name - Hidden on mobile */}
              <div className="text-right mr-2 md:mr-4 hidden sm:block">
                <p className="text-xs font-medium text-foreground truncate max-w-[120px] md:max-w-none">{supplierName}</p>
                <p className="text-[10px] text-muted-foreground">Plano {planDisplayName}</p>
              </div>
              
              <RoleBasedNotificationDropdown />
              <UserDropdown />
            </div>
          </header>

          {/* Banner de Alerta - Chave PIX não cadastrada */}
          {!isLoading && supplierData && !supplierData.bank_data?.pix_key && (
            <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">
                  <strong>Atenção:</strong> Você ainda não cadastrou sua chave PIX. 
                  Sem ela, não será possível receber pagamentos.
                </span>
              </div>
              <Button 
                variant="secondary" 
                size="sm" 
                asChild 
                className="shrink-0 bg-white text-amber-700 hover:bg-amber-50"
              >
                <Link to="/supplier/settings">
                  Cadastrar Agora
                </Link>
              </Button>
            </div>
          )}

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="p-3 md:p-6">
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