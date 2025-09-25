import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

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
                
                // Check if payment already exists
                const { data: existingPayment } = await supabase
                  .from('payments')
                  .select('id')
                  .eq('quote_id', updatedQuote.id)
                  .single();
                
                if (!existingPayment) {
                  // Create automatic payment
                  const { error } = await supabase
                    .from('payments')
                    .insert({
                      id: `PAY-${updatedQuote.id}-${Date.now()}`,
                      quote_id: updatedQuote.id,
                      client_id: updatedQuote.client_id,
                      supplier_id: updatedQuote.supplier_id,
                      amount: updatedQuote.total || 0,
                      status: 'pending'
                    });
                  
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