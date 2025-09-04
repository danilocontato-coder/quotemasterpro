import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Delivery {
  id: string;
  quote_id: string;
  supplier_id: string;
  client_id: string;
  delivery_address: string;
  scheduled_date: string;
  actual_delivery_date?: string;
  status: 'scheduled' | 'in_transit' | 'delivered' | 'cancelled';
  tracking_code?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface CreateDeliveryData {
  quote_id: string;
  client_id: string;
  delivery_address: string;
  scheduled_date: string;
  notes?: string;
}

export function useSupabaseDeliveries() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchDeliveries = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .order('scheduled_date', { ascending: false });

      if (error) {
        throw error;
      }

      setDeliveries(data as Delivery[] || []);
    } catch (err: any) {
      console.error('Erro ao buscar entregas:', err);
      setError(err.message);
      toast.error('Erro ao carregar entregas');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createDelivery = useCallback(async (deliveryData: CreateDeliveryData) => {
    if (!user) return;

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('supplier_id')
        .eq('id', user.id)
        .single();

      if (!profileData?.supplier_id) {
        throw new Error('Fornecedor não encontrado');
      }

      const { data, error } = await supabase
        .from('deliveries')
        .insert({
          ...deliveryData,
          supplier_id: profileData.supplier_id,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setDeliveries(prev => [data as Delivery, ...prev]);
      toast.success('Entrega cadastrada com sucesso!');
      
      return data;
    } catch (err: any) {
      console.error('Erro ao criar entrega:', err);
      setError(err.message);
      toast.error('Erro ao cadastrar entrega');
      throw err;
    }
  }, [user]);

  const updateDeliveryStatus = useCallback(async (
    deliveryId: string, 
    status: Delivery['status'],
    additionalData?: Partial<Delivery>
  ) => {
    try {
      const updateData = {
        status,
        ...additionalData,
        ...(status === 'delivered' && !additionalData?.actual_delivery_date && {
          actual_delivery_date: new Date().toISOString()
        })
      };

      const { data, error } = await supabase
        .from('deliveries')
        .update(updateData)
        .eq('id', deliveryId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setDeliveries(prev => 
        prev.map(delivery => 
          delivery.id === deliveryId ? { ...delivery, ...data as Delivery } : delivery
        )
      );

      toast.success('Status da entrega atualizado!');
      return data;
    } catch (err: any) {
      console.error('Erro ao atualizar entrega:', err);
      toast.error('Erro ao atualizar status da entrega');
      throw err;
    }
  }, []);

  const getDeliveryMetrics = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const pending = deliveries.filter(d => d.status === 'scheduled').length;
    const todayDeliveries = deliveries.filter(d => {
      const scheduledDate = new Date(d.scheduled_date);
      return scheduledDate >= today && scheduledDate < tomorrow;
    }).length;
    const inTransit = deliveries.filter(d => d.status === 'in_transit').length;

    return {
      pending,
      todayDeliveries,
      inTransit
    };
  }, [deliveries]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('deliveries-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deliveries'
        },
        () => {
          fetchDeliveries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchDeliveries]);

  return {
    deliveries,
    loading,
    error,
    createDelivery,
    updateDeliveryStatus,
    getDeliveryMetrics,
    refetch: fetchDeliveries
  };
}