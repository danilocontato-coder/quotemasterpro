import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { QuoteVisit } from '@/types/visit';
import { toast } from 'sonner';

export function useQuoteVisits(quoteId?: string) {
  const [visits, setVisits] = useState<QuoteVisit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVisits = async () => {
    if (!quoteId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('quote_visits')
        .select(`
          *,
          suppliers!quote_visits_supplier_id_fkey(name)
        `)
        .eq('quote_id', quoteId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      // Map to include supplier_name
      const visitsWithSupplier = (data || []).map((v: any) => ({
        ...v,
        supplier_name: v.suppliers?.name
      }));
      
      setVisits(visitsWithSupplier as QuoteVisit[]);
    } catch (err: any) {
      console.error('Error fetching visits:', err);
      setError(err.message);
      toast.error('Erro ao carregar visitas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, [quoteId]);

  const scheduleVisit = async (scheduledDate: string, notes?: string) => {
    if (!quoteId) return;

    try {
      const { data, error } = await supabase.functions.invoke('schedule-visit', {
        body: {
          quoteId,
          scheduledDate,
          notes,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao agendar visita');

      toast.success('Visita agendada com sucesso!');
      await fetchVisits();
      return data.visit;
    } catch (err: any) {
      console.error('Error scheduling visit:', err);
      toast.error(err.message || 'Erro ao agendar visita');
      throw err;
    }
  };

  const confirmVisit = async (
    visitId: string,
    confirmedDate: string,
    confirmationNotes?: string,
    attachments?: string[]
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('confirm-visit', {
        body: {
          visitId,
          confirmedDate,
          confirmationNotes,
          attachments,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao confirmar visita');

      toast.success('Visita confirmada! Você já pode enviar sua proposta.');
      await fetchVisits();
      return data.visit;
    } catch (err: any) {
      console.error('Error confirming visit:', err);
      toast.error(err.message || 'Erro ao confirmar visita');
      throw err;
    }
  };

  const rescheduleVisit = async (
    visitId: string,
    newScheduledDate: string,
    reason: string
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('reschedule-visit', {
        body: {
          visitId,
          newScheduledDate,
          reason,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao reagendar visita');

      toast.success(`Visita reagendada! Você tem ${data.remaining_attempts} reagendamentos restantes.`);
      await fetchVisits();
      return data.visit;
    } catch (err: any) {
      console.error('Error rescheduling visit:', err);
      toast.error(err.message || 'Erro ao reagendar visita');
      throw err;
    }
  };

  return {
    visits,
    isLoading,
    error,
    fetchVisits,
    scheduleVisit,
    confirmVisit,
    rescheduleVisit,
  };
}
