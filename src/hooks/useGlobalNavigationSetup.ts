import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Componente que configura a navegação global
 * Deve ser usado dentro do BrowserRouter
 */
export function useGlobalNavigationSetup() {
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

// Componente para ser usado no App
export const GlobalNavigationProvider = () => {
  useGlobalNavigationSetup();
  return null;
};