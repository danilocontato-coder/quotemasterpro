import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedCache } from './useOptimizedCache';
import { toast } from 'sonner';

// Quote interface matching the database structure
export interface Quote {
  id: string;
  local_code?: string; // RFQ01, RFQ02... por cliente
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
  requires_visit?: boolean;
  visit_deadline?: string;
}

export const useSupabaseQuotes = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { getCache, setCache } = useOptimizedCache();
  
  // Memoizar valores estáveis para evitar re-renders desnecessários
  const stableUser = useMemo(() => ({
    id: user?.id,
    role: user?.role,
    clientId: user?.clientId,
    supplierId: user?.supplierId
  }), [user?.id, user?.role, user?.clientId, user?.supplierId]);

  const fetchQuotes = useCallback(async () => {
    if (!user) {
      setQuotes([]);
      setIsLoading(false);
      return;
    }

    // Verificar cache primeiro
    const cacheKey = `quotes_${user.role}_${user.clientId || user.supplierId || user.id}`;
    const cached = getCache(cacheKey);
    if (cached) {
      setQuotes(cached);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Verificar sessão apenas se necessário
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        setError('Sessão inválida. Faça login novamente.');
        return;
      }

      let query = supabase
        .from('quotes')
        .select(`
          id,
          local_code,
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
        local_code: quote.local_code,
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
  }, [user]); // Dependência estabilizada

  const createQuote = async (quoteData: any) => {
    try {
      console.log('🔍 DEBUG: Criando cotação com dados:', quoteData);
      
      if (!user?.clientId) {
        throw new Error('Cliente não identificado');
      }

      // Normalize deadline to ISO string or null
      const deadline = quoteData.deadline ? new Date(quoteData.deadline).toISOString() : null;
      
      console.log('🔍 DEBUG: deadline normalizado:', deadline);

      // Step 1: Get client_id via RPC and insert minimum required data
      const { data: clientIdData, error: clientIdError } = await supabase
        .rpc('get_current_user_client_id');

      if (clientIdError) {
        console.error('❌ Error getting client_id:', clientIdError);
        throw clientIdError;
      }

      console.log('🔍 DEBUG: client_id obtido via RPC:', clientIdData);

      // Payload mínimo - trigger gerará id (UUID) e local_code (RFQ01, RFQ02...)
      const insertPayload = {
        title: quoteData.title,
        client_id: clientIdData,
        client_name: 'Cliente',
        created_by: user.id
      };

      console.log('🔍 DEBUG: Payload mínimo para insert:', insertPayload);

      // Step 1: INSERT minimum required fields (trigger gera id UUID e local_code RFQxx)
      const { data: insertedQuote, error: insertError } = await supabase
        .from('quotes')
        .insert(insertPayload as any)
        .select('id, local_code')
        .single();

      if (insertError || !insertedQuote) {
        console.error('❌ Error inserting quote:', insertError);
        throw insertError || new Error('Falha ao criar cotação');
      }

      const quoteId = insertedQuote.id;
      console.log('✅ Quote inserted successfully:', { id: quoteId, local_code: insertedQuote.local_code });

      // Step 2: UPDATE optional fields (items_count será atualizado automaticamente pelo trigger)
      const { error: updateError } = await supabase
        .from('quotes')
        .update({
          description: quoteData.description || null,
          deadline: deadline,
          supplier_scope: quoteData.supplier_scope || 'local',
          selected_supplier_ids: quoteData.supplier_ids || [],
          status: 'draft', // Sempre manter como rascunho na criação
          requires_visit: quoteData.requires_visit || false,
          visit_deadline: quoteData.visit_deadline || null,
        })
        .eq('id', quoteId);

      if (updateError) {
        console.error('❌ Error updating quote:', updateError);
        throw updateError;
      }

      console.log('✅ Quote updated with optional fields');

      // Step 3: Insert items if provided
      if (quoteData.items && quoteData.items.length > 0) {
        const itemsToInsert = quoteData.items.map((item: any) => ({
          quote_id: quoteId,
          client_id: clientIdData, // Incluir client_id para compliance com RLS
          product_name: item.product_name || 'Item não especificado',
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          total: (item.quantity || 0) * (item.unit_price || 0),
          product_id: item.product_id || null
        }));

        console.log('🔍 DEBUG: Items to insert:', JSON.stringify(itemsToInsert, null, 2));

        const { error: itemsError } = await supabase
          .from('quote_items')
          .insert(itemsToInsert);

        if (itemsError) {
          console.error('❌ Error inserting quote items:', itemsError);
          throw itemsError;
        }

        console.log('✅ Quote items inserted successfully');
      }

      // Step 4: CRÍTICO - Registrar fornecedores específicos selecionados
      if (quoteData.supplier_ids && quoteData.supplier_ids.length > 0) {
        // 🛡️ VALIDAÇÃO: Filtrar IDs válidos (UUID de 36 caracteres)
        const validSupplierIds = quoteData.supplier_ids.filter((id: any) => 
          id && 
          typeof id === 'string' && 
          id.length === 36 && 
          id !== 'undefined' &&
          id.trim() !== ''
        );
        
        console.log('🔍 DEBUG: Validação de fornecedores:', {
          original_count: quoteData.supplier_ids.length,
          valid_count: validSupplierIds.length,
          invalid_ids: quoteData.supplier_ids.filter((id: any) => !validSupplierIds.includes(id))
        });
        
        // Se nenhum fornecedor válido, lançar erro ANTES de incrementar contador
        if (validSupplierIds.length === 0) {
          throw new Error('❌ Nenhum fornecedor válido foi selecionado. Por favor, selecione fornecedores da lista.');
        }
        
        const quoteSuppliers = validSupplierIds.map((supplierId: string) => ({
          quote_id: quoteId,
          supplier_id: supplierId
        }));

        console.log('🔍 DEBUG: Registrando fornecedores específicos:', quoteSuppliers);

        const { error: suppliersError } = await supabase
          .from('quote_suppliers')
          .insert(quoteSuppliers);

        if (suppliersError) {
          console.error('❌ Error inserting quote suppliers:', suppliersError);
          throw suppliersError;
        }

        console.log('✅ Fornecedores específicos registrados para a cotação');
      }

      // Step 5: Fetch the complete quote (incluindo local_code)
      const { data: completeQuote, error: fetchError } = await supabase
        .from('quotes')
        .select('*, local_code')
        .eq('id', quoteId)
        .maybeSingle();

      if (fetchError) {
        console.error('❌ Error fetching complete quote:', fetchError);
        throw fetchError;
      }

      // Notification will be created by NotificationHelpers

      console.log('✅ Quote created successfully:', quoteId);
      await fetchQuotes(); // Refresh the list
      return completeQuote;
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
      console.log('🗑️ Attempting to delete quote:', quoteId);

      const { data, error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', quoteId)
        .select()
        .maybeSingle();

      if (error) {
        console.error('❌ Delete error from Supabase:', error);
        throw error;
      }

      if (!data) {
        // If nothing returned, verify if it still exists (detect silent RLS/no-op)
        const { data: stillThere } = await supabase
          .from('quotes')
          .select('id')
          .eq('id', quoteId)
          .maybeSingle();

        if (stillThere) {
          console.error('❌ Delete appears blocked by RLS or constraints. Quote still exists:', quoteId);
          throw new Error('Não foi possível excluir a cotação (permissões ou vínculo).');
        }
      }

      console.log('✅ Quote deleted successfully in database:', quoteId);

      // Remove from local state immediately
      setQuotes(prev => {
        const filtered = prev.filter(quote => quote.id !== quoteId);
        console.log('🔍 Local state updated, remaining quotes:', filtered.length);
        return filtered;
      });
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
      if (!stableUser.id) {
        console.log('🔍 [DEBUG-QUOTES] ⚠️ Sem usuário para subscription');
        return;
      }

      // REAL-TIME TEMPORARIAMENTE DESABILITADO
      return; // Early return para desabilitar toda a subscrição real-time

      // Set up real-time subscription for quotes com ID único por user
      quotesSubscription = supabase
        .channel(`quotes_realtime_${stableUser.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'quotes'
          },
          (payload) => {
            console.log('🔍 [DEBUG-QUOTES] 📨 Real-time quote update received:', payload);
            
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
              const shouldShow = stableUser.role === 'admin' || 
                (stableUser.role !== 'supplier' && newQuote.client_id === stableUser.clientId) ||
                (stableUser.role === 'supplier' && (
                  newQuote.supplier_id === stableUser.id ||
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
              console.log('🔍 [DEBUG-QUOTES] 🗑️ DELETE event received for quote:', payload.old.id);
              setQuotes(prev => {
                const filtered = prev.filter(quote => quote.id !== payload.old.id);
                console.log('🔍 [DEBUG-QUOTES] Quote removed from real-time, remaining:', filtered.length);
                return filtered;
              });
            }
          }
        )
        .subscribe();

      // Set up real-time subscription for quote responses
      responsesSubscription = supabase
        .channel(`quote_responses_realtime_${stableUser.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'quote_responses'
          },
          async (payload) => {
            console.log('🔍 [DEBUG-QUOTES] 📨 Quote response change received:', payload);
            
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
      // Cleanup real-time subscriptions
      if (quotesSubscription) quotesSubscription.unsubscribe();
      if (responsesSubscription) responsesSubscription.unsubscribe();
    };
  }, [stableUser.id]); // CRÍTICO: usar apenas userId estável

  // Initial fetch - usando dependência estável
  useEffect(() => {
    // Initial fetch - usando dependência estável
    if (stableUser.id) {
      fetchQuotes();
    }
  }, [stableUser.id, fetchQuotes]); // Dependências estabilizadas

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