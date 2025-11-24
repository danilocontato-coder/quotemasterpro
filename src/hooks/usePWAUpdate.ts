import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';

/**
 * Hook para gerenciar atualizações do PWA
 * Detecta novas versões e notifica o usuário
 */
export function usePWAUpdate() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('✅ Service Worker registrado com sucesso');
      
      // Checar atualizações a cada 1 hora
      if (r) {
        setInterval(() => {
          console.log('🔄 Checando atualizações...');
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('❌ Erro ao registrar Service Worker:', error);
    },
  });

  useEffect(() => {
    if (offlineReady) {
      console.log('📱 App pronto para uso offline');
    }
  }, [offlineReady]);

  useEffect(() => {
    if (needRefresh) {
      console.log('🆕 Nova versão disponível!');
      
      toast('Nova versão disponível! 🚀', {
        description: 'Clique para atualizar e ver as melhorias',
        duration: Infinity,
        action: {
          label: 'Atualizar agora',
          onClick: () => {
            console.log('🔄 Atualizando aplicação...');
            updateServiceWorker(true); // Force reload
          }
        },
        onDismiss: () => {
          setNeedRefresh(false);
        }
      });
    }
  }, [needRefresh, updateServiceWorker, setNeedRefresh]);
}
