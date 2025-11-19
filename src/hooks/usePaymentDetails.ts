import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface QuoteResponse {
  id: string;
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    total: number;
    brand?: string;
    specifications?: string;
  }>;
  shipping_cost: number;
  delivery_time: number;
  warranty_months: number;
  total_amount: number;
  status: string;
}

export const usePaymentDetails = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchPaymentResponses = async (quoteId: string): Promise<QuoteResponse[]> => {
    if (!quoteId) {
      console.warn('⚠️ [PaymentDetails] Quote ID não fornecido');
      return [];
    }

    setIsLoading(true);
    console.log('🔍 [PaymentDetails] Buscando responses para quote:', quoteId);

    try {
      const { data, error } = await supabase
        .from('quote_responses')
        .select(`
          id,
          items,
          shipping_cost,
          delivery_time,
          warranty_months,
          total_amount,
          status
        `)
        .eq('quote_id', quoteId)
        .eq('status', 'selected') // Status correto para responses selecionadas
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [PaymentDetails] Erro ao buscar responses:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('✅ [PaymentDetails] Responses encontradas:', {
        count: data?.length || 0,
        quoteId
      });

      return (data || []) as QuoteResponse[];
    } catch (error: any) {
      console.error('💥 [PaymentDetails] Erro fatal:', error);
      toast({
        title: 'Erro ao carregar detalhes',
        description: error.message || 'Não foi possível carregar os detalhes da cotação',
        variant: 'destructive',
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  return {
    fetchPaymentResponses,
    isLoading,
  };
};
