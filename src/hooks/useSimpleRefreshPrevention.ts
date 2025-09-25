import { useEffect } from 'react';

/**
 * Hook simples para prevenir refreshes automáticos
 * Não usa useAuth para evitar conflitos com o sistema de autenticação
 */
export const useSimpleRefreshPrevention = () => {
  useEffect(() => {
    // Interceptar tentativas de refresh via teclado em desenvolvimento
    const handleKeyDown = (e: KeyboardEvent) => {
      if (process.env.NODE_ENV === 'development') {
        if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
          console.log('🚫 [REFRESH-PREVENTION] Refresh intercepted - use hot reload instead');
          // Não prevenir completamente, apenas logar
        }
      }
    };

    // Prevenir comportamentos problemáticos de beforeunload
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Não mostrar aviso por padrão - apenas em casos específicos
      if (e.defaultPrevented) {
        return;
      }
      return undefined;
    };

    // Adicionar listeners
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []); // Sem dependências para evitar conflitos

  return null;
};