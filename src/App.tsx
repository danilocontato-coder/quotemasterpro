import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { RoleBasedRedirect } from '@/components/layout/RoleBasedRedirect';

// Auth pages
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import ForgotPassword from '@/pages/auth/ForgotPassword';

import AdminDashboard from '@/pages/dashboards/AdminDashboard';
import SupportDashboard from '@/pages/dashboards/SupportDashboard';
import Dashboard from '@/pages/Dashboard';
import { SuperAdminDashboard } from '@/pages/admin/SuperAdminDashboard';
import { AccountsManagement } from '@/pages/admin/AccountsManagement';
import { SystemSettings } from '@/pages/admin/SystemSettings';
import { ClientsManagement } from '@/pages/admin/ClientsManagement';

// Existing pages
import Quotes from '@/pages/Quotes';
import Suppliers from '@/pages/Suppliers';
import Products from '@/pages/Products';
import Payments from '@/pages/Payments';
import { Reports } from '@/pages/Reports';
import { Approvals } from '@/pages/Approvals';
import { ApprovalLevels } from '@/pages/ApprovalLevels';
import Users from '@/pages/Users';
import { Profiles } from '@/pages/Profiles';
import { Permissions } from '@/pages/Permissions';
import Communication from '@/pages/Communication';
import { Settings } from '@/pages/Settings';
import AdminSuppliers from '@/pages/AdminSuppliers';
import NotFound from '@/pages/NotFound';

// Supplier pages
import SupplierDashboard from '@/pages/supplier/SupplierDashboard';
import SupplierQuotes from '@/pages/supplier/SupplierQuotes';
import SupplierProducts from '@/pages/supplier/SupplierProducts';
import SupplierFinancial from '@/pages/supplier/SupplierFinancial';
import SupplierHistory from '@/pages/supplier/SupplierHistory';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />

                {/* Root redirect */}
                <Route path="/" element={<RoleBasedRedirect />} />

                {/* Protected routes with layouts */}
                <Route element={<ProtectedRoute><AuthenticatedLayout /></ProtectedRoute>}>
                  
                  {/* Admin routes */}
                  <Route 
                    path="/admin" 
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/superadmin" 
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <SuperAdminDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/clients" 
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <ClientsManagement />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/settings" 
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <SystemSettings />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/users" 
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <Users />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin/suppliers" 
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminSuppliers />
                      </ProtectedRoute>
                    } 
                  />

                  {/* Client/Manager routes */}
                  <Route 
                    path="/dashboard" 
                    element={
                      <ProtectedRoute allowedRoles={['client', 'admin']}>
                        <Dashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/quotes" 
                    element={
                      <ProtectedRoute allowedRoles={['client', 'admin']}>
                        <Quotes />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/suppliers" 
                    element={
                      <ProtectedRoute allowedRoles={['client', 'admin']}>
                        <Suppliers />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/products" 
                    element={
                      <ProtectedRoute allowedRoles={['client', 'admin']}>
                        <Products />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/payments" 
                    element={
                      <ProtectedRoute allowedRoles={['client', 'admin']}>
                        <Payments />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/approvals" 
                    element={
                      <ProtectedRoute allowedRoles={['client', 'admin']}>
                        <Approvals />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/approval-levels" 
                    element={
                      <ProtectedRoute allowedRoles={['client', 'admin']}>
                        <ApprovalLevels />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/profiles" 
                    element={
                      <ProtectedRoute allowedRoles={['client', 'admin']}>
                        <Profiles />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/permissions" 
                    element={
                      <ProtectedRoute allowedRoles={['client', 'admin']}>
                        <Permissions />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/communication" 
                    element={
                      <ProtectedRoute allowedRoles={['client', 'admin']}>
                        <Communication />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/reports" 
                    element={
                      <ProtectedRoute allowedRoles={['client', 'admin']}>
                        <Reports />
                      </ProtectedRoute>
                    } 
                  />

                  {/* Supplier routes */}
                  <Route 
                    path="/supplier" 
                    element={
                      <ProtectedRoute allowedRoles={['supplier']}>
                        <SupplierDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/supplier/quotes" 
                    element={
                      <ProtectedRoute allowedRoles={['supplier']}>
                        <SupplierQuotes />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/supplier/products" 
                    element={
                      <ProtectedRoute allowedRoles={['supplier']}>
                        <SupplierProducts />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/supplier/financial" 
                    element={
                      <ProtectedRoute allowedRoles={['supplier']}>
                        <SupplierFinancial />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/supplier/history" 
                    element={
                      <ProtectedRoute allowedRoles={['supplier']}>
                        <SupplierHistory />
                      </ProtectedRoute>
                    } 
                  />

                  {/* Support routes */}
                  <Route 
                    path="/support" 
                    element={
                      <ProtectedRoute allowedRoles={['support', 'admin']}>
                        <SupportDashboard />
                      </ProtectedRoute>
                    } 
                  />

                  {/* Shared routes */}
                  <Route 
                    path="/settings" 
                    element={
                      <ProtectedRoute>
                        <Settings />
                      </ProtectedRoute>
                    } 
                  />
                </Route>

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Toaster />
              <Sonner />
            </BrowserRouter>
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
