import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AINegotiation {
  id: string;
  quote_id: string;
  selected_response_id?: string;
  original_amount: number;
  negotiated_amount?: number;
  discount_percentage?: number;
  negotiation_strategy: any;
  conversation_log: any[];
  ai_analysis: any;
  status: 'analyzing' | 'negotiating' | 'completed' | 'failed' | 'approved' | 'rejected';
  human_approved?: boolean;
  human_feedback?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  quotes?: any;
  quote_responses?: any;
}

export function useAINegotiation() {
  const [negotiations, setNegotiations] = useState<AINegotiation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchNegotiations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_negotiations')
        .select(`
          *,
          quotes(*),
          quote_responses(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform data to match our interface
      const transformedData: AINegotiation[] = (data || []).map(item => ({
        id: item.id,
        quote_id: item.quote_id,
        selected_response_id: item.selected_response_id,
        original_amount: item.original_amount,
        negotiated_amount: item.negotiated_amount,
        discount_percentage: item.discount_percentage,
        negotiation_strategy: item.negotiation_strategy || {},
        conversation_log: Array.isArray(item.conversation_log) ? item.conversation_log : [],
        ai_analysis: item.ai_analysis || {},
        status: item.status as AINegotiation['status'],
        human_approved: item.human_approved,
        human_feedback: item.human_feedback,
        approved_by: item.approved_by,
        created_at: item.created_at,
        updated_at: item.updated_at,
        completed_at: item.completed_at,
        quotes: item.quotes,
        quote_responses: item.quote_responses
      }));
      
      setNegotiations(transformedData);
    } catch (error) {
      console.error('Error fetching negotiations:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar negociações',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startAnalysis = async (quoteId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-negotiation-agent', {
        body: { action: 'analyze', quoteId }
      });

      if (error) throw error;

      toast({
        title: 'Análise Iniciada',
        description: 'A IA está analisando as propostas...',
      });

      // Refetch negotiations
      await fetchNegotiations();
      
      return data;
    } catch (error) {
      console.error('Error starting analysis:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao iniciar análise da IA',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const startNegotiation = async (negotiationId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-negotiation-agent', {
        body: { action: 'negotiate', negotiationId }
      });

      if (error) throw error;

      toast({
        title: 'Negociação Iniciada',
        description: 'A IA começou a negociar com o fornecedor',
      });

      await fetchNegotiations();
      return data;
    } catch (error) {
      console.error('Error starting negotiation:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao iniciar negociação',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const approveNegotiation = async (negotiationId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-negotiation-agent', {
        body: { action: 'approve', negotiationId }
      });

      if (error) throw error;

      toast({
        title: 'Negociação Aprovada',
        description: 'A negociação foi aprovada com sucesso',
      });

      await fetchNegotiations();
      return data;
    } catch (error) {
      console.error('Error approving negotiation:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao aprovar negociação',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const rejectNegotiation = async (negotiationId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-negotiation-agent', {
        body: { action: 'reject', negotiationId }
      });

      if (error) throw error;

      toast({
        title: 'Negociação Rejeitada',
        description: 'A negociação foi rejeitada',
      });

      await fetchNegotiations();
      return data;
    } catch (error) {
      console.error('Error rejecting negotiation:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao rejeitar negociação',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const getNegotiationByQuoteId = (quoteId: string) => {
    return negotiations.find(n => n.quote_id === quoteId);
  };

  // Real-time subscriptions
  useEffect(() => {
    fetchNegotiations();

    const channel = supabase
      .channel('ai_negotiations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_negotiations'
        },
        (payload) => {
          console.log('AI Negotiation change received:', payload);
          fetchNegotiations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    negotiations,
    isLoading,
    startAnalysis,
    startNegotiation,
    approveNegotiation,
    rejectNegotiation,
    getNegotiationByQuoteId,
    refetch: fetchNegotiations
  };
}