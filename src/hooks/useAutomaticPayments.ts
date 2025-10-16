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
                
                // ✅ VALIDAÇÃO 1: Garantir que cotação tem fornecedor
                if (!updatedQuote.supplier_id) {
                  console.error('❌ Cotação sem fornecedor. Não é possível criar pagamento:', updatedQuote.id);
                  toast({
                    title: 'Erro ao Criar Pagamento',
                    description: `Cotação "${updatedQuote.title || updatedQuote.id}" não tem fornecedor associado. Selecione um fornecedor antes de aprovar.`,
                    variant: 'destructive'
                  });
                  return;
                }
                
                // Check if payment already exists
                const { data: existingPayment } = await supabase
                  .from('payments')
                  .select('id')
                  .eq('quote_id', updatedQuote.id)
                  .maybeSingle();
                
                if (existingPayment) {
                  console.log('⏩ Pagamento já existe para esta cotação:', updatedQuote.id);
                  return;
                }
                
                // ✅ VALIDAÇÃO 2: Calcular valor correto (priorizar resposta do fornecedor)
                let totalAmount = 0;
                let amountSource = 'unknown';
                
                // 1️⃣ Prioridade: buscar valor da RESPOSTA APROVADA do fornecedor
                const { data: approvedResponse } = await supabase
                  .from('quote_responses')
                  .select('total_amount')
                  .eq('quote_id', updatedQuote.id)
                  .eq('supplier_id', updatedQuote.supplier_id)
                  .maybeSingle();

                if (approvedResponse?.total_amount && approvedResponse.total_amount > 0) {
                  totalAmount = approvedResponse.total_amount;
                  amountSource = 'quote_response';
                } else if (updatedQuote.total && updatedQuote.total > 0) {
                  // 2️⃣ Fallback: usar total da cotação
                  totalAmount = updatedQuote.total;
                  amountSource = 'quote.total';
                } else {
                  // 3️⃣ Último fallback: calcular dos itens
                  const { data: fullQuote } = await supabase
                    .from('quotes')
                    .select(`*, quote_items(quantity, unit_price)`) 
                    .eq('id', updatedQuote.id)
                    .maybeSingle();

                  if (fullQuote?.quote_items?.length) {
                    totalAmount = fullQuote.quote_items.reduce(
                      (sum: number, item: any) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 
                      0
                    );
                    amountSource = 'quote_items';
                  }
                }

                // ✅ VALIDAÇÃO 3: Garantir que tem valor válido
                if (!totalAmount || totalAmount <= 0) {
                  console.warn('⚠️ Pagamento com valor zero:', {
                    quote_id: updatedQuote.id,
                    amount_source: amountSource
                  });
                  toast({
                    title: 'Erro ao Criar Pagamento',
                    description: `Cotação "${updatedQuote.title || updatedQuote.id}" não tem valor. Adicione itens ou aprove uma proposta com valor.`,
                    variant: 'destructive'
                  });
                  return;
                }

                console.log('✅ Criando pagamento automático:', {
                  quote_id: updatedQuote.id,
                  supplier_id: updatedQuote.supplier_id,
                  amount: totalAmount,
                  amount_source: amountSource
                });

                // ✅ Criar pagamento automático (ID gerado por trigger)
                const { error } = await supabase
                  .from('payments')
                  .insert({
                    quote_id: updatedQuote.id,
                    client_id: updatedQuote.client_id,
                    supplier_id: updatedQuote.supplier_id,
                    amount: totalAmount,
                    status: 'pending'
                  } as any);

                if (error) {
                  console.error('❌ Erro ao criar pagamento:', error);
                  toast({
                    title: 'Erro ao Criar Pagamento',
                    description: error.message || 'Erro desconhecido',
                    variant: 'destructive'
                  });
                } else {
                  console.log('✅ Pagamento criado com sucesso!');
                  toast({
                    title: 'Pagamento Criado',
                    description: `Pagamento automático criado para cotação ${updatedQuote.id}`,
                  });
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