import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RoleBasedRedirect } from '@/components/layout/RoleBasedRedirect';
import { OptimizedAuthenticatedLayout } from '@/components/layout/OptimizedAuthenticatedLayout';

// Lazy loading pages
const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));
const SupplierAuth = lazy(() => import('@/pages/supplier/SupplierAuth'));
const SupplierQuoteResponse = lazy(() => import('@/pages/supplier/SupplierQuoteResponse'));
const SupplierResponseSuccess = lazy(() => import('@/pages/supplier/SupplierResponseSuccess'));
const ShortLinkRedirect = lazy(() => import('@/pages/ShortLinkRedirect'));
const NotFound = lazy(() => import('@/pages/NotFound'));

// Query client simplificado
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  console.log('🚀 [APP] Application starting...');

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <Router>
              <Routes>
                {/* Rotas públicas de autenticação */}
                <Route path="/auth/login" element={
                  <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
                    <Login />
                  </Suspense>
                } />
                
                <Route path="/auth/register" element={
                  <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
                    <Register />
                  </Suspense>
                } />
                
                <Route path="/auth/forgot-password" element={
                  <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
                    <ForgotPassword />
                  </Suspense>
                } />

                {/* Redirect root */}
                <Route path="/" element={<RoleBasedRedirect />} />

                {/* Short link redirect */}
                <Route path="/s/:shortCode" element={
                  <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
                    <ShortLinkRedirect />
                  </Suspense>
                } />

                {/* Supplier Public Routes */}
                <Route path="/supplier/auth/:quoteId/:token" element={
                  <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
                    <SupplierAuth />
                  </Suspense>
                } />
                <Route path="/supplier/quote/:quoteId/response/:token" element={
                  <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
                    <SupplierQuoteResponse />
                  </Suspense>
                } />
                <Route path="/supplier/response-success" element={
                  <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
                    <SupplierResponseSuccess />
                  </Suspense>
                } />

                {/* Todas as rotas autenticadas */}
                <Route path="/*" element={
                  <ProtectedRoute>
                    <OptimizedAuthenticatedLayout />
                  </ProtectedRoute>
                } />

                {/* 404 */}
                <Route path="*" element={
                  <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
                    <NotFound />
                  </Suspense>
                } />
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