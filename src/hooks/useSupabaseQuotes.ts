import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Quote interface matching the database structure
export interface Quote {
  id: string;
  title: string;
  description?: string;
  total?: number;
  status: string;
  client_id: string;
  client_name: string;
  supplier_id?: string;
  supplier_name?: string;
  items_count?: number;
  responses_count?: number;
  deadline?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  suppliers_sent_count?: number;
  supplier_scope?: string;
  selected_supplier_ids?: string[];
}

export const useSupabaseQuotes = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  
  // Estabilizar dependências para evitar re-renders desnecessários
  const userId = user?.id;
  const userRole = user?.role;
  const clientId = user?.clientId;

  console.log('🔍 [DEBUG-QUOTES] useSupabaseQuotes hook initialized');
  console.log('🔍 [DEBUG-QUOTES] user from useAuth:', userId, userRole, clientId);

  const fetchQuotes = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!user) {
        console.log('⚠️ No user available for fetching quotes');
        setQuotes([]);
        return;
      }

      // Verify current session before making any requests
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        setError('Erro de autenticação. Faça login novamente.');
        return;
      }

      if (!session) {
        console.error('❌ No valid session found');
        setError('Sessão inválida. Faça login novamente.');
        return;
      }

      console.log('✅ Valid session found, proceeding with quotes fetch');

      let query = supabase
        .from('quotes')
        .select(`
          id,
          title,
          description,
          total,
          status,
          client_id,
          supplier_id,
          items_count,
          responses_count,
          deadline,
          created_by,
          created_at,
          updated_at,
          suppliers_sent_count,
          supplier_scope,
          selected_supplier_ids,
          clients!quotes_client_id_fkey(name),
          suppliers!quotes_supplier_id_fkey(name)
        `)
        .order('created_at', { ascending: false });

      // Apply filters based on user role
      if (user.role === 'admin') {
        console.log('👑 Admin user - fetching all quotes');
        // Admin can see all quotes
      } else if (user.role === 'supplier') {
        console.log('🏭 Supplier user - filtering quotes for supplier:', user.supplierId);
        // Only show quotes that are relevant to this supplier
        query = query.or(`supplier_id.eq.${user.supplierId},supplier_scope.eq.all,supplier_scope.eq.global,status.eq.sent,status.eq.receiving`);
      } else {
        console.log('🏢 Client user - filtering quotes for client:', user.clientId);
        // Client users only see their own quotes
        if (user.clientId) {
          query = query.eq('client_id', user.clientId);
        } else {
          console.warn('⚠️ Client user without clientId');
          setQuotes([]);
          return;
        }
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('❌ Error fetching quotes:', fetchError);
        setError('Erro ao carregar cotações: ' + fetchError.message);
        return;
      }

      console.log(`✅ Successfully fetched ${data?.length || 0} quotes`);

      // Transform data to match our interface
      const transformedQuotes: Quote[] = (data || []).map(quote => ({
        id: quote.id,
        title: quote.title,
        description: quote.description,
        total: quote.total,
        status: quote.status,
        client_id: quote.client_id,
        client_name: quote.clients?.name || 'N/A',
        supplier_id: quote.supplier_id,
        supplier_name: quote.suppliers?.name || 'N/A',
        items_count: quote.items_count,
        responses_count: quote.responses_count,
        deadline: quote.deadline,
        created_by: quote.created_by,
        created_at: quote.created_at,
        updated_at: quote.updated_at,
        suppliers_sent_count: quote.suppliers_sent_count,
        supplier_scope: quote.supplier_scope,
        selected_supplier_ids: quote.selected_supplier_ids,
      }));

      setQuotes(transformedQuotes);
      console.log('📊 Quotes set in state:', transformedQuotes.length);

    } catch (error) {
      console.error('❌ Unexpected error in fetchQuotes:', error);
      setError('Erro inesperado ao carregar cotações');
    } finally {
      setIsLoading(false);
    }
  };

  const createQuote = async (quoteData: any) => {
    try {
      if (!user?.clientId) {
        throw new Error('Cliente não identificado');
      }

      const { data, error } = await supabase
        .from('quotes')
        .insert([{
          ...quoteData,
          client_id: user.clientId,
          created_by: user.id,
          status: 'draft'
        }])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Quote created successfully:', data.id);
      await fetchQuotes(); // Refresh the list
      return data;
    } catch (error) {
      console.error('❌ Error creating quote:', error);
      throw error;
    }
  };

  const updateQuote = async (quoteId: string, updates: Partial<Quote>) => {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .update(updates)
        .eq('id', quoteId)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Quote updated successfully:', quoteId);
      
      // Update local state
      setQuotes(prev => 
        prev.map(quote => quote.id === quoteId ? { ...quote, ...updates } : quote)
      );
      
      return data;
    } catch (error) {
      console.error('❌ Error updating quote:', error);
      throw error;
    }
  };

  const deleteQuote = async (quoteId: string) => {
    try {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', quoteId);

      if (error) throw error;

      console.log('✅ Quote deleted successfully:', quoteId);
      setQuotes(prev => prev.filter(quote => quote.id !== quoteId));
    } catch (error) {
      console.error('❌ Error deleting quote:', error);
      throw error;
    }
  };

  const getQuoteById = (quoteId: string) => {
    return quotes.find(quote => quote.id === quoteId);
  };

  const updateQuoteStatus = async (quoteId: string, status: string) => {
    return updateQuote(quoteId, { status });
  };

  const markQuoteAsSent = async (quoteId: string) => {
    return updateQuoteStatus(quoteId, 'sent');
  };

  const markQuoteAsUnderReview = async (quoteId: string) => {
    return updateQuoteStatus(quoteId, 'under_review');
  };

  const markQuoteAsReceiving = async (quoteId: string) => {
    return updateQuoteStatus(quoteId, 'receiving');
  };

  const markQuoteAsReceived = async (quoteId: string) => {
    return updateQuoteStatus(quoteId, 'received');
  };

  // Subscription setup otimizada para evitar loops
  useEffect(() => {
    let quotesSubscription: any = null;
    let responsesSubscription: any = null;

    const setupRealtime = () => {
      if (!userId) {
        console.log('🔍 [DEBUG-QUOTES] ⚠️ Sem usuário para subscription');
        return;
      }

      console.log('🔍 [DEBUG-QUOTES] 🔥 Setting up realtime subscription for quotes', { userId, userRole });

      // Set up real-time subscription for quotes com ID único por user
      quotesSubscription = supabase
        .channel(`quotes_realtime_${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'quotes'
          },
          (payload) => {
            console.log('🔍 [DEBUG-QUOTES] 📨 Real-time quote update received:', payload);
            
            // Só processar se página estiver visível
            if (document.hidden) {
              console.log('🔍 [DEBUG-QUOTES] ⏸️ Página oculta - ignorando atualização realtime');
              return;
            }
            
            if (payload.eventType === 'UPDATE') {
              const updatedQuote = payload.new as Quote;
              console.log('🔍 [DEBUG-QUOTES] 📝 Updating quote in real-time:', updatedQuote.id, 'new status:', updatedQuote.status);
              
              setQuotes(prev => 
                prev.map(quote => quote.id === updatedQuote.id ? updatedQuote : quote)
              );
            } else if (payload.eventType === 'INSERT') {
              const newQuote = payload.new as Quote;
              console.log('🔍 [DEBUG-QUOTES] 📝 Adding new quote in real-time:', newQuote.id);
              
              // Check if this quote should be visible to current user
              const shouldShow = userRole === 'admin' || 
                (userRole !== 'supplier' && newQuote.client_id === clientId) ||
                (userRole === 'supplier' && (
                  newQuote.supplier_id === userId ||
                  newQuote.supplier_scope === 'all' ||
                  newQuote.supplier_scope === 'global'
                ));
              
              if (shouldShow) {
                setQuotes(prev => {
                  const exists = prev.some(q => q.id === newQuote.id);
                  return exists ? prev : [newQuote, ...prev];
                });
              }
            } else if (payload.eventType === 'DELETE') {
              console.log('🔍 [DEBUG-QUOTES] 📝 Removing quote in real-time:', payload.old.id);
              setQuotes(prev => prev.filter(quote => quote.id !== payload.old.id));
            }
          }
        )
        .subscribe();

      // Set up real-time subscription for quote responses
      responsesSubscription = supabase
        .channel(`quote_responses_realtime_${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'quote_responses'
          },
          async (payload) => {
            console.log('🔍 [DEBUG-QUOTES] 📨 Quote response change received:', payload);
            
            if (document.hidden) {
              console.log('🔍 [DEBUG-QUOTES] ⏸️ Página oculta - ignorando resposta realtime');
              return;
            }
            
            if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
              const response = payload.eventType === 'INSERT' ? payload.new : payload.old;
              const quoteId = response.quote_id;
              
              console.log('🔍 [DEBUG-QUOTES] 🔄 Refreshing quote after response change:', quoteId);
              
              const { data: updatedQuote } = await supabase
                .from('quotes')
                .select('*')
                .eq('id', quoteId)
                .single();
              
              if (updatedQuote) {
                console.log('🔍 [DEBUG-QUOTES] 📊 Quote updated by trigger:', updatedQuote.responses_count);
                
                setQuotes(prev => 
                  prev.map(quote => 
                    quote.id === quoteId ? updatedQuote as Quote : quote
                  )
                );
              }
            }
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      console.log('🔍 [DEBUG-QUOTES] 🔄 Cleaning up real-time subscriptions');
      if (quotesSubscription) quotesSubscription.unsubscribe();
      if (responsesSubscription) responsesSubscription.unsubscribe();
    };
  }, [userId]); // CRÍTICO: usar apenas userId estável

  // Initial fetch - usando dependência estável
  useEffect(() => {
    console.log('🔄 useSupabaseQuotes - Initial fetch effect triggered');
    if (userId) {
      fetchQuotes();
    }
  }, [userId]); // Dependência estável

  return {
    quotes,
    isLoading,
    error,
    createQuote,
    updateQuote,
    deleteQuote,
    getQuoteById,
    updateQuoteStatus,
    markQuoteAsSent,
    markQuoteAsUnderReview,
    markQuoteAsReceiving,
    markQuoteAsReceived,
    refetch: fetchQuotes,
  };
};