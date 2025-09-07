import React, { useEffect, Suspense, lazy, startTransition } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RoleBasedRedirect } from '@/components/layout/RoleBasedRedirect';
import { OptimizedSkeleton } from '@/components/ui/optimized-components';
import { usePerformanceMonitor } from '@/hooks/usePerformanceOptimization';
import { DebugWrapper } from '@/components/debug/DebugWrapper';
import { SuspenseWithTransition } from '@/components/layout/SuspenseWithTransition';

// Layouts principais - import estático para evitar erro de dynamic import
import MainLayout from '@/components/layout/MainLayout';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';
import SupplierLayout from '@/components/layout/SupplierLayout';

// Auth pages com lazy loading
const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));

// Dashboard pages com lazy loading
const AdminDashboard = lazy(() => import('@/pages/dashboards/AdminDashboard'));
const SupportDashboard = lazy(() => import('@/pages/dashboards/SupportDashboard'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));

// Admin pages com lazy loading
const SuperAdminDashboard = lazy(() => import('@/pages/admin/SuperAdminDashboard'));
const AccountsManagement = lazy(() => import('@/pages/admin/AccountsManagement'));
const SystemSettings = lazy(() => import('@/pages/admin/SystemSettings'));
const ClientsManagement = lazy(() => import('@/pages/admin/ClientsManagement'));
const SuppliersManagement = lazy(() => import('@/pages/admin/SuppliersManagement'));
const PlansManagement = lazy(() => import('@/pages/admin/PlansManagement'));
const IntegrationsManagement = lazy(() => import('@/pages/admin/IntegrationsManagement'));
const ApiConfiguration = lazy(() => import('@/pages/admin/ApiConfiguration'));
const WhatsAppTemplates = lazy(() => import('@/pages/admin/WhatsAppTemplates'));
const CouponsManagement = lazy(() => import('@/pages/admin/CouponsManagement').then(m => ({ default: m.default })));
const CommunicationManagement = lazy(() => import('@/pages/admin/CommunicationManagement'));
const AuditLogs = lazy(() => import('@/pages/admin/AuditLogs'));

// Páginas principais com lazy loading
const PlansPage = lazy(() => import('@/pages/client/PlansPage').then(m => ({ default: m.PlansPage })));
const Quotes = lazy(() => import('@/pages/Quotes'));
const Suppliers = lazy(() => import('@/pages/Suppliers'));
const Products = lazy(() => import('@/pages/Products'));
const Payments = lazy(() => import('@/pages/Payments'));
const Reports = lazy(() => import('@/pages/Reports').then(m => ({ default: m.Reports })));
const Approvals = lazy(() => import('@/pages/Approvals').then(m => ({ default: m.Approvals })));
const ApprovalLevels = lazy(() => import('@/pages/ApprovalLevels').then(m => ({ default: m.ApprovalLevels })));
const AINegotiations = lazy(() => import('@/pages/AINegotiations'));
const Users = lazy(() => import('@/pages/Users'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const Profiles = lazy(() => import('@/pages/Profiles').then(m => ({ default: m.Profiles })));
const Permissions = lazy(() => import('@/pages/Permissions'));
const Communication = lazy(() => import('@/pages/Communication'));
const Settings = lazy(() => import('@/pages/Settings').then(m => ({ default: m.Settings })));
const AdminSuppliers = lazy(() => import('@/pages/AdminSuppliers'));
const NotFound = lazy(() => import('@/pages/NotFound'));

// Supplier pages com lazy loading
const SupplierDashboard = lazy(() => import('@/pages/supplier/SupplierDashboard'));
const SupplierQuotes = lazy(() => import('@/pages/supplier/SupplierQuotes'));
const SupplierProducts = lazy(() => import('@/pages/supplier/SupplierProducts'));
const SupplierFinancial = lazy(() => import('@/pages/supplier/SupplierFinancial'));
const SupplierHistory = lazy(() => import('@/pages/supplier/SupplierHistory'));
const SupplierDeliveries = lazy(() => import('@/pages/supplier/SupplierDeliveries'));
const SupplierAuth = lazy(() => import('@/pages/supplier/SupplierAuth'));
const SupplierQuoteResponse = lazy(() => import('@/pages/supplier/SupplierQuoteResponse'));
const SupplierResponseSuccess = lazy(() => import('@/pages/supplier/SupplierResponseSuccess'));

// Query client otimizado para evitar refreshes automáticos
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15 * 60 * 1000, // 15 minutos para evitar refetch frequente
      gcTime: 30 * 60 * 1000, // 30 minutos de cache
      refetchOnWindowFocus: false, // CRÍTICO: não refazer queries no foco
      refetchOnMount: false, // CRÍTICO: não refazer queries no mount
      refetchOnReconnect: false, // CRÍTICO: não refazer queries na reconexão
      retry: 1,
      retryOnMount: false
    },
    mutations: {
      retry: 1
    }
  }
});

function App() {
  // Monitor de performance global
  usePerformanceMonitor();
  
  // Sistema robusto de prevenção de reloads automáticos
  useEffect(() => {
    let isTabActive = !document.hidden;
    
    const handleVisibilityChange = () => {
      const wasHidden = !isTabActive;
      isTabActive = !document.hidden;
      
      if (wasHidden && isTabActive) {
        console.debug('🔄 Tab voltou a ficar visível - mantendo estado sem reload');
        // Apenas log - não fazer reload ou refetch automático
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        console.debug('🔄 Página restaurada do cache - mantendo estado');
        // Não fazer reload quando página volta do cache do navegador
      }
    };

    const handleFocus = () => {
      console.debug('🔄 Janela ganhou foco - mantendo estado');
      // Não fazer refetch automático no foco
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const hasUnsavedForms = document.querySelector('form:not([data-saved="true"])') ||
                             document.querySelector('[data-dirty="true"]');
      
      if (hasUnsavedForms) {
        event.preventDefault();
        return 'Você tem alterações não salvas. Deseja realmente sair?';
      }
    };

    // Prevenir refresh automático em mudanças de visibilidade
    document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });
    window.addEventListener('pageshow', handlePageShow, { passive: true });
    window.addEventListener('focus', handleFocus, { passive: true });
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AuthProvider>
            <DebugWrapper>
              <Router>
              <Routes>
                {/* Auth routes com lazy loading */}
                <Route path="/auth/login" element={
                  <SuspenseWithTransition lines={10} className="p-6">
                    <Login />
                  </SuspenseWithTransition>
                } />
                <Route path="/auth/register" element={
                  <SuspenseWithTransition lines={10} className="p-6">
                    <Register />
                  </SuspenseWithTransition>
                } />
                <Route path="/auth/forgot-password" element={
                  <SuspenseWithTransition lines={10} className="p-6">
                    <ForgotPassword />
                  </SuspenseWithTransition>
                } />
                
                {/* Public routes */}
                <Route path="/" element={<RoleBasedRedirect />} />
                
                {/* Dashboard routes - organized as nested routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <SuspenseWithTransition lines={5} className="p-4">
                      <Dashboard />
                    </SuspenseWithTransition>
                  } />
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
                  <Route path="plans" element={<Navigate to="/plans" replace />} />
                </Route>
                
                {/* Main application routes com lazy loading */}
                <Route path="/quotes" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <SuspenseWithTransition lines={5} className="p-4">
                      <Quotes />
                    </SuspenseWithTransition>
                  } />
                </Route>
                <Route path="/suppliers" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <SuspenseWithTransition lines={5} className="p-4">
                      <Suppliers />
                    </SuspenseWithTransition>
                  } />
                </Route>
                <Route path="/products" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <SuspenseWithTransition lines={5} className="p-4">
                      <Products />
                    </SuspenseWithTransition>
                  } />
                </Route>
                <Route path="/approvals" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <SuspenseWithTransition lines={5} className="p-4">
                      <Approvals />
                    </SuspenseWithTransition>
                  } />
                </Route>
                <Route path="/approval-levels" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <SuspenseWithTransition lines={5} className="p-4">
                      <ApprovalLevels />
                    </SuspenseWithTransition>
                  } />
                </Route>
                <Route path="/ai-negotiations" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <SuspenseWithTransition lines={5} className="p-4">
                      <AINegotiations />
                    </SuspenseWithTransition>
                  } />
                </Route>
                <Route path="/payments" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <SuspenseWithTransition lines={5} className="p-4">
                      <Payments />
                    </SuspenseWithTransition>
                  } />
                </Route>
                <Route path="/users" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <SuspenseWithTransition lines={5} className="p-4">
                      <Users />
                    </SuspenseWithTransition>
                  } />
                </Route>
                <Route path="/communication" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <SuspenseWithTransition lines={5} className="p-4">
                      <Communication />
                    </SuspenseWithTransition>
                  } />
                </Route>
                <Route path="/notifications" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <SuspenseWithTransition lines={5} className="p-4">
                      <Notifications />
                    </SuspenseWithTransition>
                  } />
                </Route>
                <Route path="/settings" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <SuspenseWithTransition lines={5} className="p-4">
                      <Settings />
                    </SuspenseWithTransition>
                  } />
                </Route>
                <Route path="/permissions" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <SuspenseWithTransition lines={5} className="p-4">
                      <Permissions />
                    </SuspenseWithTransition>
                  } />
                </Route>
                <Route path="/reports" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <SuspenseWithTransition lines={5} className="p-4">
                      <Reports />
                    </SuspenseWithTransition>
                  } />
                </Route>
                <Route path="/plans" element={
                  <ProtectedRoute allowedRoles={['client', 'admin', 'manager', 'collaborator']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <SuspenseWithTransition lines={5} className="p-4">
                      <PlansPage />
                    </SuspenseWithTransition>
                  } />
                </Route>

                {/* Admin routes - SuperAdmin Panel com lazy loading */}
                <Route path="/admin" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <SuspenseWithTransition lines={10} className="p-6">
                      <SuperAdminLayout />
                    </SuspenseWithTransition>
                  </ProtectedRoute>
                }>
                  <Route path="superadmin" element={
                    <SuspenseWithTransition lines={5} className="p-4">
                      <SuperAdminDashboard />
                    </SuspenseWithTransition>
                  } />
                  <Route path="plans" element={
                    <SuspenseWithTransition lines={5} className="p-4">
                      <PlansManagement />
                    </SuspenseWithTransition>
                  } />
                  <Route path="clients" element={
                    <SuspenseWithTransition lines={5} className="p-4">
                      <ClientsManagement />
                    </SuspenseWithTransition>
                  } />
                  <Route path="suppliers" element={
                    <SuspenseWithTransition lines={5} className="p-4">
                      <SuppliersManagement />
                    </SuspenseWithTransition>
                  } />
                  <Route path="plans" element={
                    <SuspenseWithTransition lines={5} className="p-4">
                      <PlansManagement />
                    </SuspenseWithTransition>
                  } />
                  <Route path="integrations" element={
                    <SuspenseWithTransition lines={5} className="p-4">
                      <IntegrationsManagement />
                    </SuspenseWithTransition>
                  } />
                  <Route path="api-config" element={
                    <SuspenseWithTransition lines={5} className="p-4">
                      <ApiConfiguration />
                    </SuspenseWithTransition>
                  } />
                  <Route path="whatsapp-templates" element={
                    <SuspenseWithTransition lines={5} className="p-4">
                      <WhatsAppTemplates />
                    </SuspenseWithTransition>
                  } />
                  <Route path="coupons" element={
                    <SuspenseWithTransition lines={5} className="p-4">
                      <CouponsManagement />
                    </SuspenseWithTransition>
                  } />
                  <Route path="communication" element={
                    <SuspenseWithTransition lines={5} className="p-4">
                      <CommunicationManagement />
                    </SuspenseWithTransition>
                  } />
                  <Route path="accounts" element={
                    <SuspenseWithTransition lines={5} className="p-4">
                      <AccountsManagement />
                    </SuspenseWithTransition>
                  } />
                  <Route path="audit" element={
                    <SuspenseWithTransition lines={5} className="p-4">
                      <AuditLogs />
                    </SuspenseWithTransition>
                  } />
                  <Route path="settings" element={
                    <SuspenseWithTransition lines={5} className="p-4">
                      <SystemSettings />
                    </SuspenseWithTransition>
                  } />
                  <Route index element={<Navigate to="/admin/superadmin" replace />} />
                </Route>

                {/* Supplier routes */}
                <Route path="/supplier" element={
                  <ProtectedRoute allowedRoles={['supplier']}>
                    <SuspenseWithTransition lines={10} className="p-6">
                      <SupplierLayout />
                    </SuspenseWithTransition>
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <SuspenseWithTransition lines={5} className="p-4">
                      <SupplierDashboard />
                    </SuspenseWithTransition>
                  } />
                  <Route path="quotes" element={
                    <SuspenseWithTransition lines={5} className="p-4">
                      <SupplierQuotes />
                    </SuspenseWithTransition>
                  } />
                  <Route path="products" element={
                    <SuspenseWithTransition lines={5} className="p-4">
                      <SupplierProducts />
                    </SuspenseWithTransition>
                  } />
                  <Route path="history" element={
                    <SuspenseWithTransition lines={5} className="p-4">
                      <SupplierHistory />
                    </SuspenseWithTransition>
                  } />
                  <Route path="financial" element={
                    <SuspenseWithTransition lines={5} className="p-4">
                      <SupplierFinancial />
                    </SuspenseWithTransition>
                  } />
                  <Route path="deliveries" element={
                    <SuspenseWithTransition lines={5} className="p-4">
                      <SupplierDeliveries />
                    </SuspenseWithTransition>
                  } />
                </Route>

                {/* Support routes */}
                <Route path="/support" element={
                  <ProtectedRoute allowedRoles={['support']}>
                    <SupportDashboard />
                  </ProtectedRoute>
                } />

                {/* Supplier Public Routes */}
                <Route path="/supplier/auth/:quoteId/:token" element={<SupplierAuth />} />
                <Route path="/supplier/quote/:quoteId/response/:token" element={<SupplierQuoteResponse />} />
                <Route path="/supplier/response-success" element={<SupplierResponseSuccess />} />

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Toaster />
              <Sonner />
              </Router>
            </DebugWrapper>
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
