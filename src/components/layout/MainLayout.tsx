import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { NotificationDropdown } from "./NotificationDropdown";
import { UserDropdown } from "./UserDropdown";
import { Toaster } from "@/components/ui/toaster";
import { Building } from "lucide-react";

export function MainLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="container flex h-14 items-center justify-between px-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-primary" />
                  <div className="flex flex-col">
                    <h1 className="text-sm font-semibold">QuoteMaster Pro</h1>
                    <p className="text-xs text-muted-foreground">Condomínio Jardim das Flores</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <NotificationDropdown />
                <UserDropdown />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto px-6 py-6">
              <Outlet />
            </div>
          </main>
        </div>
        
        <Toaster />
      </div>
    </SidebarProvider>
  );
}