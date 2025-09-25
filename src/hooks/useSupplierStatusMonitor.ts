import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook para monitorar status do fornecedor em tempo real
 * Se fornecedor for desativado, faz logout de todos os usuários deste fornecedor
 */
export const useSupplierStatusMonitor = () => {
  const { user, logout } = useAuth();

  useEffect(() => {
    // Só monitora se usuário tem supplier_id
    if (!user?.supplierId) return;

    console.log('🔐 [SUPPLIER-STATUS] Monitorando status do fornecedor:', user.supplierId);
    
    let channel: any = null;
    let timer: NodeJS.Timeout | null = null;
    
    // Aguardar um pouco para evitar conflitos com sistema centralizado
    timer = setTimeout(() => {
      // Escutar mudanças em tempo real na tabela suppliers
      channel = supabase
        .channel(`supplier_status_${user.supplierId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'suppliers',
            filter: `id=eq.${user.supplierId}`
          },
          async (payload) => {
            console.log('🔐 [SUPPLIER-STATUS] Mudança detectada no fornecedor:', payload);
            
            const newSupplier = payload.new;
            
            // Se fornecedor foi desativado, fazer logout
            if (newSupplier.status !== 'active') {
              console.log('🔐 [SUPPLIER-STATUS] Fornecedor desativado, fazendo logout...');
              
              // Disparar evento customizado para mostrar toast
              window.dispatchEvent(new CustomEvent('supplierDeactivated', {
                detail: {
                  message: 'Sua conta de fornecedor foi desativada',
                  supplierName: newSupplier.name
                }
              }));
              
              // Aguardar um pouco para o toast ser exibido antes do logout
              setTimeout(() => {
                logout();
              }, 1000);
            }
          }
        )
        .subscribe((status) => {
          console.log('🔐 [SUPPLIER-STATUS] Subscription status:', status);
        });
    }, 1000); // Aguardar 1 segundo

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      console.log('🔐 [SUPPLIER-STATUS] Limpando monitoramento do fornecedor');
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user?.supplierId, logout]);
};