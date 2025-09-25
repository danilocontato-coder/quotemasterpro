import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RoleBasedRedirect } from '@/components/layout/RoleBasedRedirect';
import { GlobalNavigationProvider } from '@/hooks/useGlobalNavigationSetup';

// Layouts principais
import MainLayout from '@/components/layout/MainLayout';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';
import SupplierLayout from '@/components/layout/SupplierLayout';

// Dashboard import estático
import Dashboard from '@/pages/Dashboard';

// Lazy loading de páginas
const LoginPage = React.lazy(() => import('@/pages/auth/Login'));
const RegisterPage = React.lazy(() => import('@/pages/auth/Register'));
const ForgotPasswordPage = React.lazy(() => import('@/pages/auth/ForgotPassword'));
const Quotes = React.lazy(() => import('@/pages/Quotes'));
const Suppliers = React.lazy(() => import('@/pages/Suppliers'));
const Products = React.lazy(() => import('@/pages/Products'));
const Approvals = React.lazy(() => import('@/pages/Approvals').then(m => ({ default: m.Approvals })));
const Payments = React.lazy(() => import('@/pages/Payments'));
const Reports = React.lazy(() => import('@/pages/Reports'));
const Users = React.lazy(() => import('@/pages/Users'));
const Notifications = React.lazy(() => import('@/pages/Notifications'));
const Settings = React.lazy(() => import('@/pages/Settings').then(m => ({ default: m.Settings })));
const Communication = React.lazy(() => import('@/pages/Communication'));
const Profiles = React.lazy(() => import('@/pages/Profiles').then(m => ({ default: m.Profiles })));
const Permissions = React.lazy(() => import('@/pages/Permissions'));
const ApprovalLevels = React.lazy(() => import('@/pages/ApprovalLevels').then(m => ({ default: m.ApprovalLevels })));
const AINegotiations = React.lazy(() => import('@/pages/AINegotiations'));
const AdminSuppliers = React.lazy(() => import('@/pages/AdminSuppliers'));
const NotificationsTesting = React.lazy(() => import('@/pages/NotificationsTesting'));
const PlansPage = React.lazy(() => import('@/pages/client/PlansPage'));

// Admin pages
const SuperAdminDashboard = React.lazy(() => import('@/pages/admin/SuperAdminDashboard'));
const ClientsManagement = React.lazy(() => import('@/pages/admin/ClientsManagement'));
const SuppliersManagement = React.lazy(() => import('@/pages/admin/SuppliersManagement'));
const AccountsManagement = React.lazy(() => import('@/pages/admin/AccountsManagement'));
const SystemSettings = React.lazy(() => import('@/pages/admin/SystemSettings'));
const BrandSettings = React.lazy(() => import('@/pages/admin/BrandSettings'));
const CouponsManagement = React.lazy(() => import('@/pages/admin/CouponsManagement'));
const PlansManagement = React.lazy(() => import('@/pages/admin/PlansManagement'));
const IntegrationsManagement = React.lazy(() => import('@/pages/admin/IntegrationsManagement'));
const WhatsAppTemplates = React.lazy(() => import('@/pages/admin/WhatsAppTemplates'));
const AdminDashboard = React.lazy(() => import('@/pages/dashboards/AdminDashboard'));
const SupportDashboard = React.lazy(() => import('@/pages/dashboards/SupportDashboard'));
const AuditLogs = React.lazy(() => import('@/pages/admin/AuditLogs'));
const AIConfigurationManagement = React.lazy(() => import('@/pages/admin/AIConfigurationManagement'));
const CommunicationManagement = React.lazy(() => import('@/pages/admin/CommunicationManagement'));
const ApiConfiguration = React.lazy(() => import('@/pages/admin/ApiConfiguration'));
const DomainSettings = React.lazy(() => import('@/pages/admin/DomainSettings'));

// Supplier pages
const SupplierDashboard = React.lazy(() => import('@/pages/supplier/SupplierDashboard'));
const SupplierQuotes = React.lazy(() => import('@/pages/supplier/SupplierQuotes'));
const SupplierProducts = React.lazy(() => import('@/pages/supplier/SupplierProducts'));
const SupplierFinancial = React.lazy(() => import('@/pages/supplier/SupplierFinancial'));
const SupplierHistory = React.lazy(() => import('@/pages/supplier/SupplierHistory'));
const SupplierDeliveries = React.lazy(() => import('@/pages/supplier/SupplierDeliveries'));
const SupplierAuth = React.lazy(() => import('@/pages/supplier/SupplierAuth'));
const SupplierQuoteResponse = React.lazy(() => import('@/pages/supplier/SupplierQuoteResponse'));
const SupplierResponseSuccess = React.lazy(() => import('@/pages/supplier/SupplierResponseSuccess'));
const ShortLinkRedirect = React.lazy(() => import('@/pages/ShortLinkRedirect'));
const NotFound = React.lazy(() => import('@/pages/NotFound'));

// Query client otimizado
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000,
      gcTime: 20 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 0,
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});

// Fallback loading component
const LoadingFallback = ({ className = "" }: { className?: string }) => (
  <div className={`min-h-screen flex items-center justify-center ${className}`}>
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
      <p>Carregando...</p>
    </div>
  </div>
);

function App() {
  console.log('🚀 [APP] Application starting...');

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <Router>
              <GlobalNavigationProvider />
              <Routes>
                {/* Rotas públicas de autenticação */}
                <Route path="/auth/login" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <LoginPage />
                  </Suspense>
                } />
                
                <Route path="/auth/register" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <RegisterPage />
                  </Suspense>
                } />
                
                <Route path="/auth/forgot-password" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ForgotPasswordPage />
                  </Suspense>
                } />

                {/* Redirect root */}
                <Route path="/" element={<RoleBasedRedirect />} />

                {/* Short link redirect */}
                <Route path="/s/:shortCode" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ShortLinkRedirect />
                  </Suspense>
                } />

                {/* Rotas do SuperAdmin */}
                <Route path="/admin/*" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <SuperAdminLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <SuperAdminDashboard />
                    </Suspense>
                  } />
                  <Route path="accounts" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <AccountsManagement />
                    </Suspense>
                  } />
                  <Route path="system" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <SystemSettings />
                    </Suspense>
                  } />
                  <Route path="brand" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <BrandSettings />
                    </Suspense>
                  } />
                  <Route path="coupons" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <CouponsManagement />
                    </Suspense>
                  } />
                  <Route path="plans" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <PlansManagement />
                    </Suspense>
                  } />
                  <Route path="integrations" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <IntegrationsManagement />
                    </Suspense>
                  } />
                  <Route path="whatsapp" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <WhatsAppTemplates />
                    </Suspense>
                  } />
                  <Route path="clients" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <ClientsManagement />
                    </Suspense>
                  } />
                  <Route path="suppliers" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <SuppliersManagement />
                    </Suspense>
                  } />
                  <Route path="admin-dashboard" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <AdminDashboard />
                    </Suspense>
                  } />
                  <Route path="support" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <SupportDashboard />
                    </Suspense>
                  } />
                  <Route path="audit" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <AuditLogs />
                    </Suspense>
                  } />
                  <Route path="ai-config" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <AIConfigurationManagement />
                    </Suspense>
                  } />
                  <Route path="communication" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <CommunicationManagement />
                    </Suspense>
                  } />
                  <Route path="api" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <ApiConfiguration />
                    </Suspense>
                  } />
                  <Route path="domain" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <DomainSettings />
                    </Suspense>
                  } />
                </Route>

                {/* Rotas do Cliente/Manager - /app/* e também /* para compatibilidade */}
                <Route path="/app/*" element={
                  <ProtectedRoute allowedRoles={['manager', 'collaborator']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route path="dashboard" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <Dashboard />
                    </Suspense>
                  } />
                  <Route path="quotes" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <Quotes />
                    </Suspense>
                  } />
                  <Route path="suppliers" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <Suppliers />
                    </Suspense>
                  } />
                  <Route path="products" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <Products />
                    </Suspense>
                  } />
                  <Route path="approvals" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <Approvals />
                    </Suspense>
                  } />
                  <Route path="approval-levels" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <ApprovalLevels />
                    </Suspense>
                  } />
                  <Route path="ai-negotiations" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <AINegotiations />
                    </Suspense>
                  } />
                  <Route path="payments" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <Payments />
                    </Suspense>
                  } />
                  <Route path="reports" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <Reports />
                    </Suspense>
                  } />
                  <Route path="users" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <Users />
                    </Suspense>
                  } />
                  <Route path="notifications" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <Notifications />
                    </Suspense>
                  } />
                  <Route path="notification-testing" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <NotificationsTesting />
                    </Suspense>
                  } />
                  <Route path="profiles" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <Profiles />
                    </Suspense>
                  } />
                  <Route path="permissions" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <Permissions />
                    </Suspense>
                  } />
                  <Route path="communication" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <Communication />
                    </Suspense>
                  } />
                  <Route path="settings" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <Settings />
                    </Suspense>
                  } />
                  <Route path="plans" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <PlansPage />
                    </Suspense>
                  } />
                  <Route path="admin-suppliers" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <AdminSuppliers />
                    </Suspense>
                  } />
                </Route>

                {/* Rotas compatíveis antigas - /* sem /app */}
                <Route path="/*" element={
                  <ProtectedRoute allowedRoles={['manager', 'collaborator']}>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route path="dashboard" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <Dashboard />
                    </Suspense>
                  } />
                  <Route path="quotes" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <Quotes />
                    </Suspense>
                  } />
                  <Route path="suppliers" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <Suppliers />
                    </Suspense>
                  } />
                  <Route path="products" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <Products />
                    </Suspense>
                  } />
                  <Route path="approvals" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <Approvals />
                    </Suspense>
                  } />
                  <Route path="approval-levels" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <ApprovalLevels />
                    </Suspense>
                  } />
                  <Route path="ai-negotiations" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <AINegotiations />
                    </Suspense>
                  } />
                  <Route path="payments" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <Payments />
                    </Suspense>
                  } />
                  <Route path="reports" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <Reports />
                    </Suspense>
                  } />
                  <Route path="users" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <Users />
                    </Suspense>
                  } />
                  <Route path="notifications" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <Notifications />
                    </Suspense>
                  } />
                  <Route path="notification-testing" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <NotificationsTesting />
                    </Suspense>
                  } />
                  <Route path="profiles" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <Profiles />
                    </Suspense>
                  } />
                  <Route path="permissions" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <Permissions />
                    </Suspense>
                  } />
                  <Route path="communication" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <Communication />
                    </Suspense>
                  } />
                  <Route path="settings" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <Settings />
                    </Suspense>
                  } />
                  <Route path="plans" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <PlansPage />
                    </Suspense>
                  } />
                  <Route path="admin-suppliers" element={
                    <Suspense fallback={<LoadingFallback className="p-6" />}>
                      <AdminSuppliers />
                    </Suspense>
                  } />
                </Route>

                {/* Rotas do Fornecedor */}
                <Route path="/supplier/*" element={
                  <ProtectedRoute allowedRoles={['supplier']}>
                    <SupplierLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <Suspense fallback={<LoadingFallback className="p-4" />}>
                      <SupplierDashboard />
                    </Suspense>
                  } />
                  <Route path="dashboard" element={
                    <Suspense fallback={<LoadingFallback className="p-4" />}>
                      <SupplierDashboard />
                    </Suspense>
                  } />
                  <Route path="quotes" element={
                    <Suspense fallback={<LoadingFallback className="p-4" />}>
                      <SupplierQuotes />
                    </Suspense>
                  } />
                  <Route path="products" element={
                    <Suspense fallback={<LoadingFallback className="p-4" />}>
                      <SupplierProducts />
                    </Suspense>
                  } />
                  <Route path="history" element={
                    <Suspense fallback={<LoadingFallback className="p-4" />}>
                      <SupplierHistory />
                    </Suspense>
                  } />
                  <Route path="financial" element={
                    <Suspense fallback={<LoadingFallback className="p-4" />}>
                      <SupplierFinancial />
                    </Suspense>
                  } />
                  <Route path="deliveries" element={
                    <Suspense fallback={<LoadingFallback className="p-4" />}>
                      <SupplierDeliveries />
                    </Suspense>
                  } />
                </Route>

                {/* Supplier Public Routes */}
                <Route path="/supplier/auth/:quoteId/:token" element={<SupplierAuth />} />
                <Route path="/supplier/quote/:quoteId/response/:token" element={<SupplierQuoteResponse />} />
                <Route path="/supplier/response-success" element={<SupplierResponseSuccess />} />

                {/* Catch all - 404 */}
                <Route path="*" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <NotFound />
                  </Suspense>
                } />
              </Routes>
            </Router>
            
            {/* Toast notifications */}
            <Toaster />
            <Sonner />
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;