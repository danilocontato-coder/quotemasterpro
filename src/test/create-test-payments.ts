// Script para criar pagamentos de teste para cotações aprovadas
import { supabase } from '@/integrations/supabase/client';

export const createTestPayments = async () => {
  try {
    // Buscar cotações aprovadas sem pagamentos
    const { data: quotes, error: quotesError } = await supabase
      .from('quotes')
      .select('*')
      .eq('status', 'approved');

    if (quotesError) {
      console.error('Error fetching quotes:', quotesError);
      return;
    }

    for (const quote of quotes || []) {
      // Verificar se já existe pagamento
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id')
        .eq('quote_id', quote.id)
        .single();

      if (!existingPayment && quote.total && quote.total > 0) {
        console.log('Creating payment for quote:', quote.id);
        
        const { data, error } = await supabase.functions.invoke('create-automatic-payment', {
          body: {
            quote_id: quote.id,
            client_id: quote.client_id,
            supplier_id: quote.supplier_id,
            amount: quote.total
          }
        });

        if (error) {
          console.error('Error creating payment:', error);
        } else {
          console.log('Payment created successfully:', data);
        }
      }
    }
  } catch (error) {
    console.error('Error in createTestPayments:', error);
  }
};

// Chamar no console: window.createTestPayments()
(window as any).createTestPayments = createTestPayments;