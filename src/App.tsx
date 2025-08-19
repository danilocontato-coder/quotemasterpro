import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import Quotes from "./pages/Quotes";
import Suppliers from "./pages/Suppliers";
import Products from "./pages/Products";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="quotes" element={<Quotes />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="products" element={<Products />} />
            <Route path="approvals" element={<div className="p-6"><h1 className="text-2xl font-bold">Aprovações - Em desenvolvimento</h1></div>} />
            <Route path="payments" element={<div className="p-6"><h1 className="text-2xl font-bold">Pagamentos - Em desenvolvimento</h1></div>} />
            <Route path="communication" element={<div className="p-6"><h1 className="text-2xl font-bold">Comunicação - Em desenvolvimento</h1></div>} />
            <Route path="admin/clients" element={<div className="p-6"><h1 className="text-2xl font-bold">Clientes - Em desenvolvimento</h1></div>} />
            <Route path="admin/users" element={<div className="p-6"><h1 className="text-2xl font-bold">Usuários - Em desenvolvimento</h1></div>} />
            <Route path="admin/reports" element={<div className="p-6"><h1 className="text-2xl font-bold">Relatórios - Em desenvolvimento</h1></div>} />
            <Route path="admin/settings" element={<div className="p-6"><h1 className="text-2xl font-bold">Configurações - Em desenvolvimento</h1></div>} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
