import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook de debug para identificar causas de reload automático
 */
export function useDebugReloads() {
  const mountTimeRef = useRef(Date.now());
  const renderCountRef = useRef(0);
  const { user } = useAuth();
  
  renderCountRef.current++;
  
  useEffect(() => {
    const componentName = 'DebugReloads';
    const mountTime = mountTimeRef.current;
    
    console.log(`🔍 [DEBUG-RELOAD] ${componentName} mounted at:`, new Date().toISOString());
    console.log(`🔍 [DEBUG-RELOAD] Render count: ${renderCountRef.current}`);
    console.log(`🔍 [DEBUG-RELOAD] User:`, user?.id, user?.role);
    
    // Monitorar mudanças de visibilidade
    const handleVisibilityChange = () => {
      console.log(`🔍 [DEBUG-RELOAD] Visibility changed:`, {
        hidden: document.hidden,
        visibilityState: document.visibilityState,
        timestamp: new Date().toISOString(),
        timeSinceMount: Date.now() - mountTime
      });
    };
    
    // Monitorar foco da janela
    const handleFocus = () => {
      console.log(`🔍 [DEBUG-RELOAD] Window focus gained:`, {
        timestamp: new Date().toISOString(),
        timeSinceMount: Date.now() - mountTime
      });
    };
    
    const handleBlur = () => {
      console.log(`🔍 [DEBUG-RELOAD] Window focus lost:`, {
        timestamp: new Date().toISOString(),
        timeSinceMount: Date.now() - mountTime
      });
    };
    
    // Monitorar pageshow/pagehide
    const handlePageShow = (event: PageTransitionEvent) => {
      console.log(`🔍 [DEBUG-RELOAD] Page show:`, {
        persisted: event.persisted,
        timestamp: new Date().toISOString(),
        timeSinceMount: Date.now() - mountTime
      });
    };
    
    const handlePageHide = () => {
      console.log(`🔍 [DEBUG-RELOAD] Page hide:`, {
        timestamp: new Date().toISOString(),
        timeSinceMount: Date.now() - mountTime
      });
    };
    
    // Monitorar beforeunload
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      console.log(`🔍 [DEBUG-RELOAD] Before unload:`, {
        timestamp: new Date().toISOString(),
        timeSinceMount: Date.now() - mountTime
      });
    };
    
    // Monitorar mudanças de URL
    const handlePopState = () => {
      console.log(`🔍 [DEBUG-RELOAD] Pop state (back/forward):`, {
        url: window.location.href,
        timestamp: new Date().toISOString(),
        timeSinceMount: Date.now() - mountTime
      });
    };
    
    // Interceptar pushState e replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(state, title, url) {
      console.log(`🔍 [DEBUG-RELOAD] Push state:`, {
        url,
        state,
        timestamp: new Date().toISOString(),
        timeSinceMount: Date.now() - mountTime
      });
      return originalPushState.apply(this, arguments as any);
    };
    
    history.replaceState = function(state, title, url) {
      console.log(`🔍 [DEBUG-RELOAD] Replace state:`, {
        url,
        state,
        timestamp: new Date().toISOString(),
        timeSinceMount: Date.now() - mountTime
      });
      return originalReplaceState.apply(this, arguments as any);
    };
    
    // Adicionar listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    
    // Monitorar custom events
    const handleUserProfileUpdated = () => {
      console.log(`🔍 [DEBUG-RELOAD] User profile updated event:`, {
        timestamp: new Date().toISOString(),
        timeSinceMount: Date.now() - mountTime
      });
    };
    
    const handleClientDataUpdated = () => {
      console.log(`🔍 [DEBUG-RELOAD] Client data updated event:`, {
        timestamp: new Date().toISOString(),
        timeSinceMount: Date.now() - mountTime
      });
    };
    
    window.addEventListener('user-profile-updated', handleUserProfileUpdated);
    window.addEventListener('client-data-updated', handleClientDataUpdated);
    
    return () => {
      console.log(`🔍 [DEBUG-RELOAD] ${componentName} unmounting after ${Date.now() - mountTime}ms`);
      
      // Restaurar métodos originais
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      
      // Remover listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('user-profile-updated', handleUserProfileUpdated);
      window.removeEventListener('client-data-updated', handleClientDataUpdated);
    };
  }, []);
  
  // Debug re-renders
  useEffect(() => {
    console.log(`🔍 [DEBUG-RELOAD] Component re-rendered. Count: ${renderCountRef.current}`, {
      userId: user?.id,
      userRole: user?.role,
      timestamp: new Date().toISOString()
    });
  });
  
  return null;
}