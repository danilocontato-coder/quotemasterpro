import { useEffect, useRef } from 'react';
import { useBranding } from '@/contexts/BrandingContext';

export const FaviconUpdater = () => {
  const { settings, isReady } = useBranding();
  const lastAppliedFavicon = useRef<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // ✅ Aguardar branding estar pronto
    if (!isReady || !settings.favicon) {
      return;
    }

    // ✅ Só atualizar se realmente mudou
    if (settings.favicon === lastAppliedFavicon.current) {
      return;
    }

    // ✅ Debounce: aguardar 100ms antes de atualizar
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      console.log('🎨 [FAVICON] Atualizando para:', settings.favicon);
      
      // Remover favicons existentes
      const existingFavicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
      existingFavicons.forEach(el => el.remove());

      // Criar novo favicon com timestamp
      const timestamp = Date.now();
      const newFavicon = document.createElement('link');
      newFavicon.rel = 'icon';
      newFavicon.type = settings.favicon.endsWith('.svg') ? 'image/svg+xml' : 
                        settings.favicon.endsWith('.png') ? 'image/png' : 'image/x-icon';
      newFavicon.href = `${settings.favicon}?v=${timestamp}`;
      
      document.head.appendChild(newFavicon);
      
      lastAppliedFavicon.current = settings.favicon;
      console.log('✅ [FAVICON] Atualizado');
    }, 100);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [settings.favicon, isReady]);

  return null;
};