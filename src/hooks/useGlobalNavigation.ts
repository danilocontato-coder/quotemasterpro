import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Hook global para escutar eventos de navegação customizados
 * Permite navegação via eventos para evitar window.location.href
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

    window.addEventListener('navigate-to', handleNavigateEvent as EventListener);

    return () => {
      window.removeEventListener('navigate-to', handleNavigateEvent as EventListener);
    };
  }, [navigate]);

  return null;
}