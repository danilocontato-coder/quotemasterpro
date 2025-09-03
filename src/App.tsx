import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RoleBasedRedirect } from '@/components/layout/RoleBasedRedirect';

// Auth pages
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import { MainLayout } from '@/components/layout/MainLayout';
import { SuperAdminLayout } from '@/components/layout/SuperAdminLayout';
import { SupplierLayout } from '@/components/layout/SupplierLayout';

import AdminDashboard from '@/pages/dashboards/AdminDashboard';
import SupportDashboard from '@/pages/dashboards/SupportDashboard';
import Dashboard from '@/pages/Dashboard';
import { SuperAdminDashboard } from '@/pages/admin/SuperAdminDashboard';
import { AccountsManagement } from '@/pages/admin/AccountsManagement';
import { SystemSettings } from '@/pages/admin/SystemSettings';
import { ClientsManagement } from '@/pages/admin/ClientsManagement';
import { SuppliersManagement } from '@/pages/admin/SuppliersManagement';
import { PlansManagement } from '@/pages/admin/PlansManagement';
import { IntegrationsManagement } from '@/pages/admin/IntegrationsManagement';
import { AuditLogs } from '@/pages/admin/AuditLogs';

// Existing pages
import Quotes from '@/pages/Quotes';
import Suppliers from '@/pages/Suppliers';
import Products from '@/pages/Products';
import Payments from '@/pages/Payments';
import { Reports } from '@/pages/Reports';
import { Approvals } from '@/pages/Approvals';
import { ApprovalLevels } from '@/pages/ApprovalLevels';
import Users from '@/pages/Users';
import Notifications from '@/pages/Notifications';
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
  // Prevent Alt+Tab from causing page refreshes or interfering with normal browser behavior
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // If Alt+Tab is pressed, do nothing special - let browser handle it normally
      if (event.altKey && event.key === 'Tab') {
        // Do not prevent default - this allows normal Alt+Tab behavior
        return;
      }
      
      // Prevent any other Alt combinations that might interfere
      if (event.altKey && (event.key === 'F4' || event.key === 'F11')) {
        // Allow these for normal browser behavior
        return;
      }
    };

    const handleVisibilityChange = () => {
      // Prevent automatic refreshes when tab becomes visible again
      // This is often caused by dev server hot reload
      if (!document.hidden) {
        // Tab became visible - but don't force any reloads
        console.log('Tab became visible - maintaining current state');
      }
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Only show warning if there are unsaved changes
      // Check for any open modals or forms
      const hasOpenModals = document.querySelector('[role="dialog"]') || 
                          document.querySelector('.modal') ||
                          document.querySelector('[data-state="open"]');
      
      if (hasOpenModals) {
        // Don't prevent unload, but let the browser handle it
        return;
      }
    };

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });
    window.addEventListener('beforeunload', handleBeforeUnload, { passive: true });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AuthProvider>
            <Router>
              <Routes>
                {/* Auth routes */}
                <Route path="/auth/login" element={<Login />} />
                <Route path="/auth/register" element={<Register />} />
                <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                
                {/* Public routes */}
                <Route path="/" element={<RoleBasedRedirect />} />
                
                {/* Dashboard routes - organized as nested routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Dashboard />} />
                  <Route path="quotes" element={<Navigate to="/quotes" replace />} />
                  <Route path="suppliers" element={<Navigate to="/suppliers" replace />} />
                  <Route path="products" element={<Navigate to="/products" replace />} />
                  <Route path="approvals" element={<Navigate to="/approvals" replace />} />
                  <Route path="payments" element={<Navigate to="/payments" replace />} />
                  <Route path="users" element={<Navigate to="/users" replace />} />
                  <Route path="communication" element={<Navigate to="/communication" replace />} />
                  <Route path="notifications" element={<Navigate to="/notifications" replace />} />
                  <Route path="settings" element={<Navigate to="/settings" replace />} />
                  <Route path="permissions" element={<Navigate to="/permissions" replace />} />
                  <Route path="reports" element={<Navigate to="/reports" replace />} />
                </Route>
                
                {/* Main application routes */}
                <Route path="/quotes" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Quotes />} />
                </Route>
                <Route path="/suppliers" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Suppliers />} />
                </Route>
                <Route path="/products" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Products />} />
                </Route>
                <Route path="/approvals" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Approvals />} />
                </Route>
                <Route path="/approval-levels" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<ApprovalLevels />} />
                </Route>
                <Route path="/payments" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Payments />} />
                </Route>
                <Route path="/users" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Users />} />
                </Route>
                <Route path="/communication" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Communication />} />
                </Route>
                <Route path="/notifications" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Notifications />} />
                </Route>
                <Route path="/settings" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Settings />} />
                </Route>
                <Route path="/permissions" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Permissions />} />
                </Route>
                <Route path="/reports" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Reports />} />
                </Route>

                {/* Admin routes - SuperAdmin Panel */}
                <Route path="/admin" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <SuperAdminLayout />
                  </ProtectedRoute>
                }>
                  <Route path="superadmin" element={<SuperAdminDashboard />} />
                  <Route path="clients" element={<ClientsManagement />} />
                  <Route path="suppliers" element={<SuppliersManagement />} />
                  <Route path="plans" element={<PlansManagement />} />
                  <Route path="integrations" element={<IntegrationsManagement />} />
                  <Route path="accounts" element={<AccountsManagement />} />
                  <Route path="audit" element={<AuditLogs />} />
                  <Route path="settings" element={<SystemSettings />} />
                  <Route index element={<Navigate to="/admin/superadmin" replace />} />
                </Route>

                {/* Supplier routes */}
                <Route path="/supplier" element={
                  <ProtectedRoute allowedRoles={['supplier']}>
                    <SupplierLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<SupplierDashboard />} />
                  <Route path="quotes" element={<SupplierQuotes />} />
                  <Route path="products" element={<SupplierProducts />} />
                  <Route path="history" element={<SupplierHistory />} />
                  <Route path="financial" element={<SupplierFinancial />} />
                </Route>

                {/* Support routes */}
                <Route path="/support" element={
                  <ProtectedRoute allowedRoles={['support']}>
                    <SupportDashboard />
                  </ProtectedRoute>
                } />

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Toaster />
              <Sonner />
            </Router>
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
