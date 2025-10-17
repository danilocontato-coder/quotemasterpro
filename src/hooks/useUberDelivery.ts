import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UberQuoteRequest {
  pickup: {
    address: string;
    name: string;
    phone: string;
  };
  dropoff: {
    address: string;
    name: string;
    phone: string;
  };
  packageSize?: 'small' | 'medium' | 'large';
}

interface UberQuote {
  id: string;
  fee: number;
  currency: string;
  pickup_eta: string;
  dropoff_eta: string;
  expires_at: string;
}

interface CreateUberDeliveryRequest {
  deliveryId: string;
  quoteId: string;
  pickup: {
    address: string;
    name: string;
    phone: string;
    notes?: string;
  };
  dropoff: {
    address: string;
    name: string;
    phone: string;
    notes?: string;
  };
}

export const useUberDelivery = () => {
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isCreatingDelivery, setIsCreatingDelivery] = useState(false);
  const { toast } = useToast();

  const getQuote = async (request: UberQuoteRequest): Promise<UberQuote | null> => {
    setIsLoadingQuote(true);
    try {
      console.log('[UBER-HOOK] Getting quote...');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase.functions.invoke('uber-delivery-quote', {
        body: request,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('[UBER-HOOK] Quote error:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Falha ao obter cotação');
      }

      console.log('[UBER-HOOK] Quote received:', data.quote);
      
      toast({
        title: 'Cotação Recebida',
        description: `Valor: R$ ${(data.quote.fee / 100).toFixed(2)}`,
      });

      return data.quote;
    } catch (error: any) {
      console.error('[UBER-HOOK] getQuote error:', error);
      toast({
        title: 'Erro ao Obter Cotação',
        description: error.message || 'Não foi possível obter cotação da Uber',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoadingQuote(false);
    }
  };

  const createDelivery = async (request: CreateUberDeliveryRequest): Promise<boolean> => {
    setIsCreatingDelivery(true);
    try {
      console.log('[UBER-HOOK] Creating delivery...');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase.functions.invoke('uber-delivery-create', {
        body: request,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('[UBER-HOOK] Create delivery error:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Falha ao criar entrega');
      }

      console.log('[UBER-HOOK] Delivery created:', data.delivery);
      
      toast({
        title: 'Entrega Criada com Sucesso',
        description: 'A entrega foi agendada via Uber Direct',
      });

      return true;
    } catch (error: any) {
      console.error('[UBER-HOOK] createDelivery error:', error);
      toast({
        title: 'Erro ao Criar Entrega',
        description: error.message || 'Não foi possível criar entrega na Uber',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsCreatingDelivery(false);
    }
  };

  return {
    getQuote,
    createDelivery,
    isLoadingQuote,
    isCreatingDelivery,
  };
};
