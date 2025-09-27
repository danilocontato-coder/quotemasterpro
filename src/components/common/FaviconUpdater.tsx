import { useEffect } from 'react';
import { useBranding } from '@/contexts/BrandingContext';

export const FaviconUpdater = () => {
  const { settings } = useBranding();

  useEffect(() => {
    if (settings.favicon) {
      console.log('🎨 [FAVICON] Forçando atualização do favicon para:', settings.favicon);
      
      // Remover favicon atual
      const existingFavicon = document.querySelector('link[rel="icon"]');
      if (existingFavicon) {
        existingFavicon.remove();
      }

      // Criar novo favicon com timestamp para evitar cache
      const newFavicon = document.createElement('link');
      newFavicon.rel = 'icon';
      newFavicon.type = 'image/x-icon';
      newFavicon.href = `${settings.favicon}?t=${Date.now()}`;
      
      document.head.appendChild(newFavicon);
      
      console.log('🎨 [FAVICON] Favicon atualizado com sucesso');
    }
  }, [settings.favicon]);

  return null;
};