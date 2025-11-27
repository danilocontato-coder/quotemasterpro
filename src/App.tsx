import React, { useEffect } from 'react';
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
import { usePWAUpdate } from '@/hooks/usePWAUpdate';
import { useThemeSync } from '@/hooks/useThemeSync';
import { APP_VERSION } from '@/config/version';
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

// ⚡ OTIMIZAÇÃO: Cache agressivo para reduzir requisições de API
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
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
  usePWAUpdate();
  
  // ✅ Limpeza AGRESSIVA de cache ao detectar nova versão
  useEffect(() => {
    const lastVersion = localStorage.getItem('cotiz_app_version');
    
    if (lastVersion !== APP_VERSION) {
      console.log(`🧹 Nova versão detectada (${lastVersion} → ${APP_VERSION}), limpando TODO o cache...`);
      
      // 1. Limpar TODO sessionStorage
      sessionStorage.clear();
      console.log('✅ sessionStorage limpo');
      
      // 2. Limpar localStorage (exceto dados críticos do Supabase)
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !key.startsWith('sb-') && key !== 'cotiz_app_version') {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      console.log(`✅ localStorage limpo (${keysToRemove.length} chaves removidas)`);
      
      // 3. Limpar TODOS os caches do navegador (Service Worker caches)
      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          console.log(`🗑️ Limpando ${cacheNames.length} caches do navegador...`);
          return Promise.all(
            cacheNames.map(cacheName => {
              console.log(`  - Deletando cache: ${cacheName}`);
              return caches.delete(cacheName);
            })
          );
        }).then(() => {
          console.log('✅ Todos os caches do navegador limpos');
        }).catch(err => {
          console.error('❌ Erro ao limpar caches:', err);
        });
      }
      
      // 4. Forçar atualização do Service Worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          console.log(`🔄 Atualizando ${registrations.length} Service Workers...`);
          registrations.forEach(registration => {
            registration.update();
          });
        });
      }
      
      // 5. Marcar versão como processada
      localStorage.setItem('cotiz_app_version', APP_VERSION);
      console.log(`✅ Versão ${APP_VERSION} registrada`);
    }
  }, []);
  
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
