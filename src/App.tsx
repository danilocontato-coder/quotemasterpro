import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout";
import { SupplierLayout } from "./components/layout/SupplierLayout";
import Dashboard from "./pages/Dashboard";
import Quotes from "./pages/Quotes";
import Suppliers from "./pages/Suppliers";
import Products from "./pages/Products";
import Payments from "./pages/Payments";
import Communication from "./pages/Communication";
import { Settings } from "./pages/Settings";
import Users from "./pages/Users";
import { ApprovalLevels } from "./pages/ApprovalLevels";
import { Approvals } from "./pages/Approvals";
import { Permissions } from "./pages/Permissions";
import { Reports } from "./pages/Reports";
import SupplierDashboard from "./pages/supplier/SupplierDashboard";
import SupplierQuotes from "./pages/supplier/SupplierQuotes";
import SupplierProducts from "./pages/supplier/SupplierProducts";
import SupplierFinancial from "./pages/supplier/SupplierFinancial";
import SupplierHistory from "./pages/supplier/SupplierHistory";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Client Routes */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="quotes" element={<Quotes />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="products" element={<Products />} />
            <Route path="approvals" element={<Approvals />} />
            <Route path="approval-levels" element={<ApprovalLevels />} />
            <Route path="users" element={<Users />} />
            <Route path="permissions" element={<Permissions />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="payments" element={<Payments />} />
            <Route path="communication" element={<Communication />} />
          </Route>

          {/* Supplier Routes */}
          <Route path="/supplier" element={<SupplierLayout />}>
            <Route index element={<SupplierDashboard />} />
            <Route path="quotes" element={<SupplierQuotes />} />
            <Route path="quotes/:id" element={<div>Supplier Quote Detail - Coming Soon</div>} />
            <Route path="products" element={<SupplierProducts />} />
            <Route path="financial" element={<SupplierFinancial />} />
            <Route path="history" element={<SupplierHistory />} />
            <Route path="deliveries" element={<div>Supplier Deliveries - Coming Soon</div>} />
            <Route path="messages" element={<div>Supplier Messages - Coming Soon</div>} />
            <Route path="settings" element={<div>Supplier Settings - Coming Soon</div>} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
