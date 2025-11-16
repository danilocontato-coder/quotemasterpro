import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/contexts/AuthContext';
import { AuthProviderV2 } from '@/contexts/AuthContextV2';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { BrandingProvider } from '@/contexts/BrandingContext';
import { GlobalNavigationProvider } from '@/hooks/useGlobalNavigationSetup';
import { AppWithProviders } from '@/components/layout/AppWithProviders';
import { TourProvider } from '@/components/tour/TourProvider';
import { useVersionChecker } from '@/hooks/useVersionChecker';
import { useThemeSync } from '@/hooks/useThemeSync';
import '@/styles/tour-custom.css';

// Componente interno para sincronizar tema (precisa estar dentro dos providers)
function ThemeSyncWrapper() {
  useThemeSync();
  return null;
}

if (import.meta.env.DEV) {
  import('./utils/testHelpers').catch(err => {
    console.error('Erro ao carregar test helpers:', err);
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,     // ✅ Reduzir para 2 minutos
      gcTime: 5 * 60 * 1000,        // ✅ Reduzir para 5 minutos
      refetchOnWindowFocus: true,   // ✅ Revalidar ao focar janela
      refetchOnMount: 'always',     // ✅ Sempre buscar ao montar
      retry: 1,
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});

function App() {
  // ✅ Checar atualizações automaticamente
  useVersionChecker();
  
  // 🚀 Feature Flag: Permite alternar entre AuthContext (atual) e AuthContextV2 (novo modular)
  // Configure VITE_USE_AUTH_V2=true no .env para usar a nova versão
  const USE_AUTH_V2 = import.meta.env.VITE_USE_AUTH_V2 === 'true';
  const AuthProviderComponent = USE_AUTH_V2 ? AuthProviderV2 : AuthProvider;
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <BrandingProvider>
            <AuthProviderComponent>
              <ThemeSyncWrapper />
              <SubscriptionProvider>
                <TourProvider>
                  <Router>
                    <GlobalNavigationProvider />
                    <AppWithProviders />
                    <Toaster />
                    <Sonner />
                  </Router>
                </TourProvider>
              </SubscriptionProvider>
            </AuthProviderComponent>
          </BrandingProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
