import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { mockAINegotiations, type MockAINegotiation } from '@/data/mockAINegotiations';

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
  status: 'analyzing' | 'analyzed' | 'not_viable' | 'negotiating' | 'completed' | 'failed' | 'approved' | 'rejected';
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

  const fetchNegotiations = useCallback(async () => {
    if (isLoading) return; // Prevent multiple simultaneous calls
    
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

      if (error) {
        // Use mock data when Supabase fails or table doesn't exist yet
        const transformedMockData: AINegotiation[] = mockAINegotiations.map(item => ({
          id: item.id,
          quote_id: item.quote_id,
          selected_response_id: undefined,
          original_amount: item.original_amount,
          negotiated_amount: item.negotiated_amount,
          discount_percentage: item.negotiated_amount && item.original_amount 
            ? ((item.original_amount - item.negotiated_amount) / item.original_amount) * 100 
            : undefined,
          negotiation_strategy: { reason: item.analysis_reason, strategy: item.negotiation_strategy },
          conversation_log: item.conversation_log || [],
          ai_analysis: { reason: item.analysis_reason },
          status: item.status as AINegotiation['status'],
          human_approved: item.status === 'approved',
          human_feedback: undefined,
          approved_by: undefined,
          created_at: item.created_at,
          updated_at: item.updated_at,
          completed_at: item.status === 'completed' || item.status === 'approved' ? item.updated_at : undefined,
          quotes: item.quote,
          quote_responses: undefined
        }));
        setNegotiations(transformedMockData);
        return;
      }
      
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
      // Fallback to mock data
      const transformedMockData: AINegotiation[] = mockAINegotiations.map(item => ({
        id: item.id,
        quote_id: item.quote_id,
        selected_response_id: undefined,
        original_amount: item.original_amount,
        negotiated_amount: item.negotiated_amount,
        discount_percentage: item.negotiated_amount && item.original_amount 
          ? ((item.original_amount - item.negotiated_amount) / item.original_amount) * 100 
          : undefined,
        negotiation_strategy: { reason: item.analysis_reason, strategy: item.negotiation_strategy },
        conversation_log: item.conversation_log || [],
        ai_analysis: { reason: item.analysis_reason },
        status: item.status as AINegotiation['status'],
        human_approved: item.status === 'approved',
        human_feedback: undefined,
        approved_by: undefined,
        created_at: item.created_at,
        updated_at: item.updated_at,
        completed_at: item.status === 'completed' || item.status === 'approved' ? item.updated_at : undefined,
        quotes: item.quote,
        quote_responses: undefined
      }));
      setNegotiations(transformedMockData);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startAnalysis = async (quoteId: string) => {
    // Prevent unnecessary duplicate analyses, but allow retry if stuck
    const existingNegotiation = negotiations.find(n => n.quote_id === quoteId);
    if (existingNegotiation) {
      // If already completed/approved/rejected/negotiating, just return it
      if (!['analyzing', 'failed'].includes(existingNegotiation.status)) {
        console.log('🤖 [AI-NEGOTIATION] Análise já existe para cotação:', quoteId, 'status:', existingNegotiation.status);
        return existingNegotiation;
      }
      console.log('🤖 [AI-NEGOTIATION] Reexecutando análise para cotação em status:', existingNegotiation.status);
    }

    try {
      console.log('🤖 [AI-NEGOTIATION] Iniciando análise para cotação:', quoteId);
      
      const { data, error } = await supabase.functions.invoke('ai-negotiation-agent', {
        body: { action: 'analyze', quoteId }
      });

      console.log('🤖 [AI-NEGOTIATION] Resposta da edge function:', { data, error });

      if (error) {
        console.error('🤖 [AI-NEGOTIATION] Erro na edge function:', error);
        throw error;
      }

      // ✅ CORREÇÃO 1: Atualizar estado imediatamente com a negociação retornada
      if (data?.negotiation) {
        console.log('🤖 [AI-NEGOTIATION] Atualizando estado com negociação:', data.negotiation);
        setNegotiations(prev => {
          // Remove qualquer negociação antiga da mesma cotação
          const filtered = prev.filter(n => n.quote_id !== quoteId);
          // Adiciona a nova negociação com o ID correto
          return [...filtered, data.negotiation];
        });
      }

      toast({
        title: 'Análise Iniciada',
        description: 'A IA está analisando as propostas...',
      });

      // Refetch continua como backup para garantir sincronização
      setTimeout(() => fetchNegotiations(), 1000);
      
      return data;
    } catch (error) {
      console.error('🤖 [AI-NEGOTIATION] Error starting analysis:', error);
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
      console.log('🤖 [AI-NEGOTIATION] Iniciando negociação com ID:', negotiationId);
      
      if (!negotiationId) {
        throw new Error('negotiationId é obrigatório para iniciar negociação');
      }
      
      const { data, error } = await supabase.functions.invoke('ai-negotiation-agent', {
        body: { action: 'negotiate', negotiationId }
      });

      if (error) throw error;
      if (data && data.success === false) {
        throw new Error(data.error || 'Falha na negociação via WhatsApp');
      }

      toast({
        title: 'Negociação Iniciada',
        description: 'A IA começou a negociar com o fornecedor',
      });

      setTimeout(() => fetchNegotiations(), 500);
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

      setTimeout(() => fetchNegotiations(), 500);
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

      setTimeout(() => fetchNegotiations(), 500);
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

  // Polling inteligente para negociações travadas em "analyzing"
  useEffect(() => {
    // ⚡ OTIMIZAÇÃO: Só verificar se houver negociações ativas
    if (negotiations.length === 0) return;

    const checkStuckAnalysis = async () => {
      const stuck = negotiations.filter(n => {
        if (n.status !== 'analyzing') return false;
        const created = new Date(n.created_at).getTime();
        const now = Date.now();
        const minutesStuck = (now - created) / 1000 / 60;
        return minutesStuck > 2;
      });

      if (stuck.length > 0) {
        console.log(`[useAINegotiation] ${stuck.length} negociações travadas, acionando análise automática...`);
        for (const negotiation of stuck) {
          try {
            await startAnalysis(negotiation.quote_id);
          } catch (err) {
            console.error('[useAINegotiation] Erro ao reprocessar análise:', err);
          }
        }
      }
    };

    // ⚡ OTIMIZAÇÃO: Aumentar intervalo de 30s -> 2 min (-75% requisições)
    const interval = setInterval(checkStuckAnalysis, 120000);
    return () => clearInterval(interval);
  }, [negotiations, startAnalysis]);

  // Real-time subscriptions with throttling and debouncing
  useEffect(() => {
    fetchNegotiations();

    let timeoutId: NodeJS.Timeout;
    let isSubscribed = true;

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
          if (!isSubscribed) return;
          
          // Debounce realtime updates to avoid excessive re-renders
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            if (isSubscribed) {
              fetchNegotiations();
            }
          }, 2000); // Aumentado para 2 segundos para reduzir carga
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [fetchNegotiations]);

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