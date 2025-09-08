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
import { GlobalNavigationProvider } from '@/hooks/useGlobalNavigationSetup';
import { useGlobalNavigation } from '@/hooks/useGlobalNavigation';

// Layouts principais - import estático para evitar erro de dynamic import
import MainLayout from '@/components/layout/MainLayout';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';
import SupplierLayout from '@/components/layout/SupplierLayout';

// Dashboard import estático para resolver erro de dynamic import
import Dashboard from '@/pages/Dashboard';

// Client/Tenant pages com lazy loading otimizado
const Quotes = lazy(() => import('@/pages/Quotes'));
const Suppliers = lazy(() => import('@/pages/Suppliers'));
const Products = lazy(() => import('@/pages/Products'));
const Approvals = lazy(() => import('@/pages/Approvals').then(m => ({ default: m.Approvals })));
const Payments = lazy(() => import('@/pages/Payments'));
const Reports = lazy(() => import('@/pages/Reports').then(m => ({ default: m.Reports })));
const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));
const SuperAdminDashboard = lazy(() => import('@/pages/admin/SuperAdminDashboard'));
const AccountsManagement = lazy(() => import('@/pages/admin/AccountsManagement'));
const SystemSettings = lazy(() => import('@/pages/admin/SystemSettings'));
const CouponsManagement = lazy(() => import('@/pages/admin/CouponsManagement'));
const PlansManagement = lazy(() => import('@/pages/admin/PlansManagement'));
const IntegrationsManagement = lazy(() => import('@/pages/admin/IntegrationsManagement'));
const WhatsAppTemplates = lazy(() => import('@/pages/admin/WhatsAppTemplates'));
const ClientsManagement = lazy(() => import('@/pages/admin/ClientsManagement'));
const SuppliersManagement = lazy(() => import('@/pages/admin/SuppliersManagement'));
const AdminDashboard = lazy(() => import('@/pages/dashboards/AdminDashboard'));
const SupportDashboard = lazy(() => import('@/pages/dashboards/SupportDashboard'));
const AuditLogs = lazy(() => import('@/pages/admin/AuditLogs'));
const PlansPage = lazy(() => import('@/pages/client/PlansPage'));
const NotificationsTesting = lazy(() => import('@/pages/NotificationsTesting'));
const AIConfigurationManagement = lazy(() => import('@/pages/admin/AIConfigurationManagement'));
const CommunicationManagement = lazy(() => import('@/pages/admin/CommunicationManagement'));
const ApiConfiguration = lazy(() => import('@/pages/admin/ApiConfiguration'));
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

// Query client otimizado para carregamento inicial rápido
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutos
      gcTime: 20 * 60 * 1000, // 20 minutos no cache
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 0, // Sem retry na primeira carga
      networkMode: 'online', // Só executar quando online
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});

function App() {
  console.log('🚀 [APP] Application starting...');
  
  // Performance monitoring
  usePerformanceMonitor();

  // Error boundary para lazy loading
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message.includes('Loading chunk')) {
        console.warn('🔄 [APP] Chunk loading error, reloading...', event.error);
        // Recarregar a página em caso de erro de chunk loading
        startTransition(() => {
          window.location.reload();
        });
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  console.log('🎯 [APP] Rendering application structure');

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <DebugWrapper>
              <Router>
                <GlobalNavigationProvider />
              <Routes>
                {/* Rotas públicas de autenticação */}
                <Route path="/auth/login" element={
                  <SuspenseWithTransition lines={3} className="min-h-screen flex items-center justify-center">
                    <Login />
                  </SuspenseWithTransition>
                } />
                
                <Route path="/auth/register" element={
                  <SuspenseWithTransition lines={3} className="min-h-screen flex items-center justify-center">
                    <Register />
                  </SuspenseWithTransition>
                } />
                
                <Route path="/auth/forgot-password" element={
                  <SuspenseWithTransition lines={3} className="min-h-screen flex items-center justify-center">
                    <ForgotPassword />
                  </SuspenseWithTransition>
                } />

                {/* Redirect root */}
                <Route path="/" element={<RoleBasedRedirect />} />

                {/* Rotas do SuperAdmin */}
                <Route path="/admin/*" element={
                  <ProtectedRoute>
                    <SuperAdminLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <SuspenseWithTransition lines={5} className="p-6">
                      <SuperAdminDashboard />
                    </SuspenseWithTransition>
                  } />
                  <Route path="accounts" element={
                    <SuspenseWithTransition lines={5} className="p-6">
                      <AccountsManagement />
                    </SuspenseWithTransition>
                  } />
                  <Route path="system" element={
                    <SuspenseWithTransition lines={5} className="p-6">
                      <SystemSettings />
                    </SuspenseWithTransition>
                  } />
                  <Route path="coupons" element={
                    <SuspenseWithTransition lines={5} className="p-6">
                      <CouponsManagement />
                    </SuspenseWithTransition>
                  } />
                  <Route path="plans" element={
                    <SuspenseWithTransition lines={5} className="p-6">
                      <PlansManagement />
                    </SuspenseWithTransition>
                  } />
                  <Route path="integrations" element={
                    <SuspenseWithTransition lines={5} className="p-6">
                      <IntegrationsManagement />
                    </SuspenseWithTransition>
                  } />
                  <Route path="whatsapp" element={
                    <SuspenseWithTransition lines={5} className="p-6">
                      <WhatsAppTemplates />
                    </SuspenseWithTransition>
                  } />
                  <Route path="clients" element={
                    <SuspenseWithTransition lines={5} className="p-6">
                      <ClientsManagement />
                    </SuspenseWithTransition>
                  } />
                  <Route path="suppliers" element={
                    <SuspenseWithTransition lines={5} className="p-6">
                      <SuppliersManagement />
                    </SuspenseWithTransition>
                  } />
                  <Route path="admin-dashboard" element={
                    <SuspenseWithTransition lines={5} className="p-6">
                      <AdminDashboard />
                    </SuspenseWithTransition>
                  } />
                  <Route path="support" element={
                    <SuspenseWithTransition lines={5} className="p-6">
                      <SupportDashboard />
                    </SuspenseWithTransition>
                  } />
                  <Route path="audit" element={
                    <SuspenseWithTransition lines={5} className="p-6">
                      <AuditLogs />
                    </SuspenseWithTransition>
                  } />
                  <Route path="ai-config" element={
                    <SuspenseWithTransition lines={5} className="p-6">
                      <AIConfigurationManagement />
                    </SuspenseWithTransition>
                  } />
                  <Route path="communication" element={
                    <SuspenseWithTransition lines={5} className="p-6">
                      <CommunicationManagement />
                    </SuspenseWithTransition>
                  } />
                  <Route path="api" element={
                    <SuspenseWithTransition lines={5} className="p-6">
                      <ApiConfiguration />
                    </SuspenseWithTransition>
                  } />
                </Route>

                {/* Rotas do Cliente/Manager */}
                <Route path="/*" element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route path="dashboard" element={
                    <SuspenseWithTransition lines={5} className="p-6">
                      <Dashboard />
                    </SuspenseWithTransition>
                  } />
                  <Route path="quotes" element={
                    <SuspenseWithTransition lines={5} className="p-6">
                      <Quotes />
                    </SuspenseWithTransition>
                  } />
                  <Route path="suppliers" element={
                    <SuspenseWithTransition lines={5} className="p-6">
                      <Suppliers />
                    </SuspenseWithTransition>
                  } />
                  <Route path="products" element={
                    <SuspenseWithTransition lines={5} className="p-6">
                      <Products />
                    </SuspenseWithTransition>
                  } />
                  <Route path="approvals" element={
                    <SuspenseWithTransition lines={5} className="p-6">
                      <Approvals />
                    </SuspenseWithTransition>
                  } />
                  <Route path="approval-levels" element={
                    <SuspenseWithTransition lines={5} className="p-6">
                      <ApprovalLevels />
                    </SuspenseWithTransition>
                  } />
                  <Route path="ai-negotiations" element={
                    <SuspenseWithTransition lines={5} className="p-6">
                      <AINegotiations />
                    </SuspenseWithTransition>
                  } />
                  <Route path="payments" element={
                    <SuspenseWithTransition lines={5} className="p-6">
                      <Payments />
                    </SuspenseWithTransition>
                  } />
                  <Route path="reports" element={
                    <SuspenseWithTransition lines={5} className="p-6">
                      <Reports />
                    </SuspenseWithTransition>
                  } />
                  <Route path="users" element={
                    <SuspenseWithTransition lines={5} className="p-6">
                      <Users />
                    </SuspenseWithTransition>
                  } />
                  <Route path="notifications" element={
                    <SuspenseWithTransition lines={5} className="p-6">
                      <Notifications />
                    </SuspenseWithTransition>
                  } />
                  <Route path="notification-testing" element={
                    <SuspenseWithTransition lines={5} className="p-6">
                      <NotificationsTesting />
                    </SuspenseWithTransition>
                  } />
                  <Route path="profiles" element={
                    <SuspenseWithTransition lines={5} className="p-6">
                      <Profiles />
                    </SuspenseWithTransition>
                  } />
                  <Route path="permissions" element={
                    <SuspenseWithTransition lines={5} className="p-6">
                      <Permissions />
                    </SuspenseWithTransition>
                  } />
                  <Route path="communication" element={
                    <SuspenseWithTransition lines={5} className="p-6">
                      <Communication />
                    </SuspenseWithTransition>
                  } />
                  <Route path="settings" element={
                    <SuspenseWithTransition lines={5} className="p-6">
                      <Settings />
                    </SuspenseWithTransition>
                  } />
                  <Route path="plans" element={
                    <SuspenseWithTransition lines={5} className="p-6">
                      <PlansPage />
                    </SuspenseWithTransition>
                  } />
                  <Route path="admin-suppliers" element={
                    <SuspenseWithTransition lines={5} className="p-6">
                      <AdminSuppliers />
                    </SuspenseWithTransition>
                  } />
                </Route>

                {/* Rotas do Fornecedor */}
                <Route path="/supplier/*" element={
                  <ProtectedRoute>
                    <SupplierLayout />
                  </ProtectedRoute>
                }>
                  <Route path="dashboard" element={
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