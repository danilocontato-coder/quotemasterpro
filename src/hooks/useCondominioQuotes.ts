import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface CondominioQuote {
  id: string;
  local_code: string;
  title: string;
  description: string | null;
  status: string;
  total: number;
  client_id: string;
  client_name: string;
  on_behalf_of_client_id: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  created_at: string;
  updated_at: string;
  deadline: string | null;
  items_count: number;
  responses_count: number;
  requires_visit: boolean | null;
  payment_id: string | null;
}

export interface CondominioQuoteDetail extends CondominioQuote {
  items: QuoteItem[];
  responses: QuoteResponse[];
  approvals: QuoteApproval[];
}

export interface QuoteItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  unit: string | null;
  specifications: string | null;
}

export interface QuoteResponse {
  id: string;
  supplier_id: string;
  supplier_name: string;
  total_amount: number;
  delivery_time: number;
  shipping_cost: number | null;
  warranty_months: number | null;
  status: string;
  created_at: string;
  notes: string | null;
}

export interface QuoteApproval {
  id: string;
  approver_id: string;
  approver_name: string | null;
  status: string;
  comments: string | null;
  created_at: string;
  approved_at: string | null;
}

interface UseCondominioQuotesReturn {
  quotes: CondominioQuote[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  stats: {
    total: number;
    pending: number;
    approved: number;
    finalized: number;
    thisMonth: number;
  };
}

export function useCondominioQuotes(): UseCondominioQuotesReturn {
  const [quotes, setQuotes] = useState<CondominioQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchQuotes = useCallback(async () => {
    if (!user?.clientId) {
      setIsLoading(false);
      setError('Usuário não autenticado ou sem condomínio vinculado');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('📋 [useCondominioQuotes] Buscando cotações para condomínio:', user.clientId);

      // Buscar cotações onde:
      // 1. client_id = condomínio atual (cotações diretas)
      // 2. on_behalf_of_client_id = condomínio atual (cotações criadas pela administradora)
      const { data, error: queryError } = await supabase
        .from('quotes')
        .select(`
          id,
          local_code,
          title,
          description,
          status,
          total,
          client_id,
          client_name,
          on_behalf_of_client_id,
          supplier_id,
          created_at,
          updated_at,
          deadline,
          requires_visit,
          suppliers:supplier_id (
            id,
            name
          ),
          quote_items (
            id
          ),
          quote_responses (
            id
          )
        `)
        .or(`client_id.eq.${user.clientId},on_behalf_of_client_id.eq.${user.clientId}`)
        .order('created_at', { ascending: false });

      if (queryError) {
        console.error('❌ [useCondominioQuotes] Erro na query:', queryError);
        throw queryError;
      }

      // Mapear dados para o formato esperado
      const mappedQuotes: CondominioQuote[] = (data || []).map((quote: any) => ({
        id: quote.id,
        local_code: quote.local_code || `RFQ${quote.id.substring(0, 4).toUpperCase()}`,
        title: quote.title,
        description: quote.description,
        status: quote.status,
        total: quote.total || 0,
        client_id: quote.client_id,
        client_name: quote.client_name || '',
        on_behalf_of_client_id: quote.on_behalf_of_client_id,
        supplier_id: quote.supplier_id,
        supplier_name: quote.suppliers?.name || null,
        created_at: quote.created_at,
        updated_at: quote.updated_at,
        deadline: quote.deadline,
        items_count: quote.quote_items?.length || 0,
        responses_count: quote.quote_responses?.length || 0,
        requires_visit: quote.requires_visit,
        payment_id: null,
      }));

      console.log('✅ [useCondominioQuotes] Cotações encontradas:', mappedQuotes.length);
      setQuotes(mappedQuotes);
    } catch (err: any) {
      console.error('❌ [useCondominioQuotes] Erro:', err);
      setError(err.message || 'Erro ao carregar cotações');
      toast({
        title: "Erro ao carregar cotações",
        description: "Não foi possível carregar as cotações do condomínio",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.clientId, toast]);

  // Calcular estatísticas
  const stats = {
    total: quotes.length,
    pending: quotes.filter(q => ['draft', 'sent', 'awaiting_approval', 'pending_approval'].includes(q.status)).length,
    approved: quotes.filter(q => q.status === 'approved').length,
    finalized: quotes.filter(q => q.status === 'finalized').length,
    thisMonth: quotes.filter(q => {
      const createdAt = new Date(q.created_at);
      const now = new Date();
      return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
    }).length,
  };

  useEffect(() => {
    fetchQuotes();

    // Realtime subscription para atualizações
    const channel = supabase
      .channel('condominio-quotes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quotes'
        },
        (payload) => {
          console.log('🔄 [useCondominioQuotes] Cotação atualizada:', payload);
          fetchQuotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchQuotes]);

  return {
    quotes,
    isLoading,
    error,
    refetch: fetchQuotes,
    stats,
  };
}

// Hook para buscar detalhes de uma cotação específica
export function useCondominioQuoteDetail(quoteId: string | undefined) {
  const [quote, setQuote] = useState<CondominioQuoteDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchQuoteDetail = useCallback(async () => {
    if (!quoteId || !user?.clientId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('📋 [useCondominioQuoteDetail] Buscando cotação:', quoteId);

      // Buscar cotação com itens, respostas e aprovações
      const { data, error: queryError } = await supabase
        .from('quotes')
        .select(`
          id,
          local_code,
          title,
          description,
          status,
          total,
          client_id,
          client_name,
          on_behalf_of_client_id,
          supplier_id,
          created_at,
          updated_at,
          deadline,
          requires_visit,
          suppliers:supplier_id (
            id,
            name
          ),
          quote_items (
            id,
            product_name,
            quantity,
            unit_price,
            total,
            unit,
            specifications
          ),
          quote_responses (
            id,
            supplier_id,
            total_amount,
            delivery_time,
            shipping_cost,
            warranty_months,
            status,
            created_at,
            notes,
            suppliers:supplier_id (
              id,
              name
            )
          ),
          approvals (
            id,
            approver_id,
            status,
            comments,
            created_at,
            approved_at,
            profiles:approver_id (
              id,
              full_name
            )
          )
        `)
        .eq('id', quoteId)
        .or(`client_id.eq.${user.clientId},on_behalf_of_client_id.eq.${user.clientId}`)
        .single();

      if (queryError) {
        console.error('❌ [useCondominioQuoteDetail] Erro na query:', queryError);
        throw queryError;
      }

      if (!data) {
        throw new Error('Cotação não encontrada');
      }

      // Mapear dados para o formato esperado
      const mappedQuote: CondominioQuoteDetail = {
        id: data.id,
        local_code: data.local_code || `RFQ${data.id.substring(0, 4).toUpperCase()}`,
        title: data.title,
        description: data.description,
        status: data.status,
        total: data.total || 0,
        client_id: data.client_id,
        client_name: data.client_name || '',
        on_behalf_of_client_id: data.on_behalf_of_client_id,
        supplier_id: data.supplier_id,
        supplier_name: (data.suppliers as any)?.name || null,
        created_at: data.created_at,
        updated_at: data.updated_at,
        deadline: data.deadline,
        items_count: data.quote_items?.length || 0,
        responses_count: data.quote_responses?.length || 0,
        requires_visit: data.requires_visit,
        payment_id: null,
        items: (data.quote_items || []).map((item: any) => ({
          id: item.id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price || 0,
          total: item.total || 0,
          unit: item.unit,
          specifications: item.specifications,
        })),
        responses: (data.quote_responses || []).map((response: any) => ({
          id: response.id,
          supplier_id: response.supplier_id,
          supplier_name: response.suppliers?.name || 'Fornecedor',
          total_amount: response.total_amount || 0,
          delivery_time: response.delivery_time || 0,
          shipping_cost: response.shipping_cost,
          warranty_months: response.warranty_months,
          status: response.status,
          created_at: response.created_at,
          notes: response.notes,
        })),
        approvals: (data.approvals || []).map((approval: any) => ({
          id: approval.id,
          approver_id: approval.approver_id,
          approver_name: approval.profiles?.full_name || null,
          status: approval.status,
          comments: approval.comments,
          created_at: approval.created_at,
          approved_at: approval.approved_at,
        })),
      };

      console.log('✅ [useCondominioQuoteDetail] Cotação carregada:', mappedQuote.local_code);
      setQuote(mappedQuote);
    } catch (err: any) {
      console.error('❌ [useCondominioQuoteDetail] Erro:', err);
      setError(err.message || 'Erro ao carregar cotação');
      toast({
        title: "Erro ao carregar cotação",
        description: "Não foi possível carregar os detalhes da cotação",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [quoteId, user?.clientId, toast]);

  useEffect(() => {
    fetchQuoteDetail();

    // Realtime subscription
    if (quoteId) {
      const channel = supabase
        .channel(`condominio-quote-${quoteId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'quotes',
            filter: `id=eq.${quoteId}`
          },
          () => {
            console.log('🔄 [useCondominioQuoteDetail] Cotação atualizada');
            fetchQuoteDetail();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchQuoteDetail, quoteId]);

  return {
    quote,
    isLoading,
    error,
    refetch: fetchQuoteDetail,
  };
}
