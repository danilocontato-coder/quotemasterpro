import { useEffect, useRef } from 'react';
import { useBranding } from '@/contexts/BrandingContext';

export const FaviconUpdater = () => {
  const { settings } = useBranding();
  const lastAppliedFavicon = useRef<string | null>(null);

  useEffect(() => {
    // ⚡ OTIMIZAÇÃO: Só atualizar se o favicon realmente mudou
    if (settings.favicon === lastAppliedFavicon.current) {
      return;
    }
    console.log('🎨 [FAVICON] FaviconUpdater effect disparado. Favicon atual:', settings.favicon);
    
    if (settings.favicon) {
      console.log('🎨 [FAVICON] Forçando atualização do favicon para:', settings.favicon);
      
      // Remover TODOS os favicons existentes
      const existingFavicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
      existingFavicons.forEach(el => {
        console.log('🎨 [FAVICON] Removendo favicon antigo:', el.getAttribute('href'));
        el.remove();
      });

      // Criar novo favicon com timestamp FORTE para evitar cache
      const timestamp = Date.now();
      const newFavicon = document.createElement('link');
      newFavicon.rel = 'icon';
      newFavicon.type = settings.favicon.endsWith('.svg') ? 'image/svg+xml' : 
                        settings.favicon.endsWith('.png') ? 'image/png' : 'image/x-icon';
      newFavicon.href = `${settings.favicon}?v=${timestamp}&bust=${Math.random()}`;
      
      document.head.appendChild(newFavicon);
      
      // Atualizar referência do último favicon aplicado
      lastAppliedFavicon.current = settings.favicon;
      
      console.log('✅ [FAVICON] Favicon atualizado com sucesso:', newFavicon.href);
      
      // Adicionar também um shortcut icon para compatibilidade
      const shortcutFavicon = document.createElement('link');
      shortcutFavicon.rel = 'shortcut icon';
      shortcutFavicon.type = newFavicon.type;
      shortcutFavicon.href = newFavicon.href;
      document.head.appendChild(shortcutFavicon);
    } else {
      console.warn('⚠️ [FAVICON] Nenhum favicon configurado nos settings');
    }
  }, [settings.favicon]);

  return null;
};