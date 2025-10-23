import { toast } from 'sonner';

/**
 * Sistema de detecção e notificação de atualizações do Service Worker
 * Checa atualizações a cada 1 hora e notifica o usuário quando uma nova versão está disponível
 */
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(registration => {
        console.log('✅ Service Worker registrado com sucesso');
        
        // Checar atualizações a cada 1 hora
        setInterval(() => {
          console.log('🔄 Checando atualizações do Service Worker...');
          registration.update();
        }, 60 * 60 * 1000);
        
        // Detectar quando uma nova versão está sendo instalada
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('🆕 Nova versão detectada! Instalando...');
          
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nova versão disponível!
              console.log('✨ Nova versão instalada! Mostrando notificação...');
              showUpdateNotification();
            }
          });
        });
      }).catch(err => {
        console.error('❌ Erro ao registrar Service Worker:', err);
      });
    });
  }
}

function showUpdateNotification() {
  toast('Nova versão disponível! 🎉', {
    description: 'Clique para atualizar e ver as novidades',
    duration: Infinity, // Não desaparece sozinho
    action: {
      label: 'Atualizar agora',
      onClick: () => {
        console.log('🔄 Recarregando aplicação...');
        window.location.reload();
      }
    }
  });
}
