import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Hook para checar atualizações da aplicação
 * Compara a versão local com a versão no servidor a cada 5 minutos
 */
export function useVersionChecker() {
  useEffect(() => {
    const checkVersion = async () => {
      try {
        // Adicionar timestamp para evitar cache do navegador
        const response = await fetch('/version.json?t=' + Date.now());
        const { version, releaseDate } = await response.json();
        
        const currentVersion = localStorage.getItem('app_version');
        
        if (currentVersion && currentVersion !== version) {
          // Nova versão detectada!
          console.log('🆕 Nova versão detectada:', { 
            current: currentVersion, 
            new: version,
            releaseDate 
          });
          
          toast('Nova versão disponível! 🚀', {
            description: `Versão ${version} - Recarregue para ver as atualizações`,
            duration: Infinity,
            action: {
              label: 'Recarregar',
              onClick: () => {
                localStorage.setItem('app_version', version);
                window.location.reload();
              }
            }
          });
        } else {
          localStorage.setItem('app_version', version);
          console.log('✅ Versão atual:', version);
        }
      } catch (err) {
        console.error('❌ Falha ao verificar versão:', err);
      }
    };
    
    // Checar imediatamente e depois a cada 5 minutos
    checkVersion();
    const interval = setInterval(checkVersion, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);
}
