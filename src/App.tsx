import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/contexts/AuthContext';

// Import direto das páginas críticas
const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));

// Import de layouts
const AuthenticatedApp = lazy(() => import('@/components/layout/AuthenticatedApp'));

// Query client mínimo
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <Router>
              <Routes>
                {/* Rotas públicas */}
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

                {/* Root redirect - vai direto para o app autenticado */}
                <Route path="/" element={<Navigate to="/app" replace />} />

                {/* App autenticado - TODAS as rotas protegidas */}
                <Route path="/app/*" element={
                  <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
                    <AuthenticatedApp />
                  </Suspense>
                } />

                {/* 404 - redirect para app */}
                <Route path="*" element={<Navigate to="/app" replace />} />
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