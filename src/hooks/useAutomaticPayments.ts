import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAutomaticPayments = () => {
  const { toast } = useToast();

  useEffect(() => {
    // Criar trigger para pagamentos automáticos quando cotação é aprovada
    const handleQuoteApproval = async () => {
      try {
        // Subscribe to quote status changes
        const channel = supabase
          .channel('quote-approvals')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'quotes',
              filter: 'status=eq.approved'
            },
            async (payload) => {
              const { new: updatedQuote, old: oldQuote } = payload;
              
              // Only create payment if status changed to approved
              if (oldQuote.status !== 'approved' && updatedQuote.status === 'approved') {
                console.log('Creating automatic payment for approved quote:', updatedQuote.id);
                
                // Validar se cotação tem fornecedor
                if (!updatedQuote.supplier_id) {
                  console.error('❌ Cotação sem fornecedor associado. Não é possível criar pagamento:', updatedQuote.id);
                  toast({
                    title: 'Erro ao Criar Pagamento',
                    description: `Cotação ${updatedQuote.id} não tem fornecedor associado. Adicione um fornecedor antes de aprovar.`,
                    variant: 'destructive'
                  });
                  return;
                }
                
                // Check if payment already exists
                const { data: existingPayment } = await supabase
                  .from('payments')
                  .select('id')
                  .eq('quote_id', updatedQuote.id)
                  .single();
                
                if (!existingPayment) {
                  // Calcular valor com fallback se necessário
                  let totalAmount = updatedQuote.total || 0;

                  if (!totalAmount || totalAmount <= 0) {
                    // Buscar itens para calcular total
                    const { data: fullQuote } = await supabase
                      .from('quotes')
                      .select(`*, quote_items(quantity, unit_price)`) 
                      .eq('id', updatedQuote.id)
                      .maybeSingle();

                    if (fullQuote?.quote_items?.length) {
                      totalAmount = fullQuote.quote_items.reduce((sum: number, item: any) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0);
                    }
                  }

                  if (!totalAmount || totalAmount <= 0) {
                    console.warn('Skipping automatic payment creation due to zero amount for quote:', updatedQuote.id);
                    return;
                  }

                  // Create automatic payment (ID gerado por trigger)
                  const { error } = await supabase
                    .from('payments')
                    .insert({
                      quote_id: updatedQuote.id,
                      client_id: updatedQuote.client_id,
                      supplier_id: updatedQuote.supplier_id || null,
                      amount: totalAmount,
                      status: 'pending'
                    } as any);

                  
                  if (error) {
                    console.error('Error creating automatic payment:', error);
                  } else {
                    toast({
                      title: 'Pagamento Criado',
                      description: `Pagamento automático criado para cotação ${updatedQuote.id}`,
                    });
                  }
                }
              }
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      } catch (error) {
        console.error('Error setting up automatic payments:', error);
      }
    };

    handleQuoteApproval();
  }, [toast]);
};