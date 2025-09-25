import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Hook global para escutar eventos de navegação customizados
 * Permite navegação via eventos para evitar window.location.href
 * Também escuta eventos de recarregamento de branding
 */
export function useGlobalNavigation() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleNavigateEvent = (event: CustomEvent) => {
      const path = event.detail;
      if (typeof path === 'string') {
        navigate(path);
      }
    };

    const handleBrandingUpdate = () => {
      // Aplicar branding sem recarregar a página
      window.dispatchEvent(new CustomEvent('branding-updated'));
    };

    // Escutar eventos de navegação (múltiplos eventos para compatibilidade)
    window.addEventListener('navigate', handleNavigateEvent as EventListener);
    window.addEventListener('navigate-to', handleNavigateEvent as EventListener);
    
    // Escutar atualizações de branding
    window.addEventListener('apply-branding', handleBrandingUpdate);

    return () => {
      window.removeEventListener('navigate', handleNavigateEvent as EventListener);
      window.removeEventListener('navigate-to', handleNavigateEvent as EventListener);
      window.removeEventListener('apply-branding', handleBrandingUpdate);
    };
  }, [navigate]);

  return null;
}