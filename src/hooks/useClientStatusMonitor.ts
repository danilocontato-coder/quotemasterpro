import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook para monitorar status do cliente em tempo real
 * Se cliente for desativado, faz logout de todos os usuários
 */
export const useClientStatusMonitor = () => {
  const { user, logout } = useAuth();

  useEffect(() => {
    // Só monitora se usuário tem client_id
    if (!user?.clientId) return;

    console.log('🔐 [CLIENT-STATUS] Monitorando status do cliente:', user.clientId);
    
    let channel: any = null;
    
    // Aguardar um pouco para evitar conflitos com useStableRealtime
    const timer = setTimeout(() => {
      // Escutar mudanças em tempo real na tabela clients
      channel = supabase
        .channel(`client-status-${user.clientId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'clients',
            filter: `id=eq.${user.clientId}`,
          },
          async (payload) => {
            console.log('🔐 [CLIENT-STATUS] Cliente atualizado:', payload);
            
            const updatedClient = payload.new as { status: string };
            
            // Se cliente foi desativado, fazer logout imediato
            if (updatedClient.status !== 'active') {
              console.log('🔐 [CLIENT-STATUS] Cliente desativado - fazendo logout do usuário');
              
              // Mostrar mensagem antes do logout
              await new Promise(resolve => {
                // Usar custom event para mostrar mensagem no contexto principal
                window.dispatchEvent(new CustomEvent('client-deactivated', {
                  detail: { message: 'Sua conta foi desativada pelo administrador.' }
                }));
                
                // Aguardar um pouco para a mensagem ser exibida
                setTimeout(resolve, 1000);
              });
              
              // Fazer logout
              await logout();
            }
          }
        )
        .subscribe((status) => {
          console.log('🔐 [CLIENT-STATUS] Subscription status:', status);
        });
    }, 1000); // Aguardar 1 segundo

    return () => {
      clearTimeout(timer);
      console.log('🔐 [CLIENT-STATUS] Limpando monitoramento do cliente');
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user?.clientId, logout]);
};