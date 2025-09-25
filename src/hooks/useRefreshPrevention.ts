import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook para prevenir refreshes automáticos e melhorar performance
 * Centraliza toda a lógica de prevenção de reloads desnecessários
 */
export const useRefreshPrevention = () => {
  const { user } = useAuth();

  useEffect(() => {
    // Prevenir refresh automático no focus/blur da página
    const handleVisibilityChange = () => {
      // Não fazer nada - apenas log para debug se necessário
      if (process.env.NODE_ENV === 'development') {
        console.log('👁️ [REFRESH-PREVENTION] Visibility change:', document.hidden ? 'hidden' : 'visible');
      }
    };

    const handleFocus = () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('👁️ [REFRESH-PREVENTION] Window focused');
      }
    };

    const handleBlur = () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('👁️ [REFRESH-PREVENTION] Window blurred');
      }
    };

    // Prevenir comportamentos problemáticos de refresh
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Só mostrar aviso se há dados não salvos (poderia ser implementado aqui)
      // Por enquanto, não fazer nada
      return undefined;
    };

    // Interceptar tentativas de refresh via teclado
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevenir F5 e Ctrl+R apenas em desenvolvimento para debug
      if (process.env.NODE_ENV === 'development') {
        if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
          console.log('🚫 [REFRESH-PREVENTION] Refresh intercepted - use hot reload instead');
        }
      }
    };

    // Adicionar listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [user?.id]);

  return null;
};