import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface ClientDelivery {
  id: string;
  local_code: string;
  quote_id: string;
  quote_local_code: string;
  quote_title: string;
  payment_id: string;
  payment_amount: number;
  payment_status: string;
  supplier_id: string;
  supplier_name: string;
  status: 'pending' | 'scheduled' | 'in_transit' | 'delivered';
  scheduled_date?: string;
  actual_delivery_date?: string;
  delivery_address: string;
  tracking_code?: string;
  notes?: string;
  confirmation_code?: string;
  can_confirm: boolean;
  created_at: string;
}

export function useClientDeliveries() {
  const [deliveries, setDeliveries] = useState<ClientDelivery[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchDeliveries = async () => {
    if (!user?.clientId) return;

    setIsLoading(true);
    try {
      // Query principal com local_code e sem join direto com suppliers
      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          id,
          quote_id,
          payment_id,
          supplier_id,
          local_code,
          status,
          scheduled_date,
          actual_delivery_date,
          delivery_address,
          tracking_code,
          notes,
          created_at,
          quotes!inner(title, local_code, supplier_id, supplier_name),
          payments!inner(id, amount, status)
        `)
        .eq('client_id', user.clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Query separada para códigos de confirmação
      const deliveryIds = (data || []).map((d: any) => d.id);
      let confirmationsMap: Record<string, string> = {};

      if (deliveryIds.length > 0) {
        const { data: confirmationsData } = await supabase
          .from('delivery_confirmations')
          .select('delivery_id, confirmation_code, is_used, expires_at')
          .in('delivery_id', deliveryIds)
          .eq('is_used', false);

        if (confirmationsData) {
          confirmationsMap = confirmationsData.reduce((acc: any, conf: any) => {
            acc[conf.delivery_id] = conf.confirmation_code;
            return acc;
          }, {});
        }
      }

      const formattedDeliveries: ClientDelivery[] = (data || []).map((delivery: any) => ({
        id: delivery.id,
        local_code: delivery.local_code || '',
        quote_id: delivery.quote_id,
        quote_local_code: delivery.quotes?.local_code || '',
        quote_title: delivery.quotes?.title || '',
        payment_id: delivery.payment_id,
        payment_amount: delivery.payments?.amount || 0,
        payment_status: delivery.payments?.status || '',
        supplier_id: delivery.quotes?.supplier_id || delivery.supplier_id,
        supplier_name: delivery.quotes?.supplier_name || '',
        status: delivery.status,
        scheduled_date: delivery.scheduled_date,
        actual_delivery_date: delivery.actual_delivery_date,
        delivery_address: delivery.delivery_address,
        tracking_code: delivery.tracking_code,
        notes: delivery.notes,
        confirmation_code: confirmationsMap[delivery.id],
        can_confirm: delivery.status === 'in_transit' || delivery.status === 'scheduled',
        created_at: delivery.created_at,
      }));

      setDeliveries(formattedDeliveries);
    } catch (error: any) {
      console.error('Erro ao carregar entregas:', error);
      toast({
        title: "Erro ao carregar entregas",
        description: "Não foi possível carregar a lista de entregas.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDelivery = async (confirmationCode: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('confirm-delivery', {
        body: { confirmation_code: confirmationCode.trim() }
      });

      if (error) throw error;

      toast({
        title: "✅ Entrega Confirmada!",
        description: `Pagamento de R$ ${data.payment_amount?.toFixed(2)} liberado para o fornecedor.`,
      });

      await fetchDeliveries();
      return true;
    } catch (error: any) {
      console.error('Erro ao confirmar entrega:', error);
      toast({
        title: "Erro na confirmação",
        description: error.message || "Código inválido ou expirado.",
        variant: "destructive",
      });
      return false;
    }
  };

  const filterByStatus = (status: string) => {
    if (status === 'all') return deliveries;
    return deliveries.filter(d => d.status === status);
  };

  const searchDeliveries = (term: string) => {
    if (!term) return deliveries;
    const lowerTerm = term.toLowerCase();
    return deliveries.filter(d =>
      d.quote_local_code.toLowerCase().includes(lowerTerm) ||
      d.quote_title.toLowerCase().includes(lowerTerm) ||
      d.supplier_name.toLowerCase().includes(lowerTerm) ||
      d.tracking_code?.toLowerCase().includes(lowerTerm)
    );
  };

  useEffect(() => {
    fetchDeliveries();

    // Real-time updates
    const channel = supabase
      .channel('deliveries-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deliveries',
          filter: `client_id=eq.${user?.clientId}`
        },
        () => {
          fetchDeliveries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.clientId]);

  return {
    deliveries,
    isLoading,
    refetch: fetchDeliveries,
    confirmDelivery,
    filterByStatus,
    searchDeliveries,
  };
}
