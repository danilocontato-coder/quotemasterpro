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

  console.log('🎯 useSupabaseQuotes hook initialized');
  console.log('👤 useSupabaseQuotes - user from useAuth:', user?.id, user?.role);

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
        console.log('⚠️ No valid session found');
        setError('Sessão expirada. Faça login novamente.');
        return;
      }

      console.log('✅ Valid session found for user:', session.user?.id);

      let query = supabase.from('quotes').select('*').order('created_at', { ascending: false });

      // Apply role-based filtering
      if (user.role === 'admin') {
        // Admin can see all quotes - no additional filtering
      } else if (user.role === 'supplier') {
        // Suppliers can only see quotes they're involved with
        if (user.supplierId) {
          query = query.or(
            `supplier_id.eq.${user.supplierId},` +
            `supplier_scope.eq.all,` +
            `supplier_scope.eq.global,` +
            `selected_supplier_ids.cs.{${user.supplierId}}`
          );
        } else {
          setQuotes([]);
          return;
        }
      } else {
        // Client users (manager, collaborator) can only see their client's quotes
        if (user.clientId) {
          query = query.eq('client_id', user.clientId);
        } else {
          setQuotes([]);
          return;
        }
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('❌ Error fetching quotes:', fetchError);
        
        // Handle specific authentication errors
        if (fetchError.code === 'PGRST301' || fetchError.message.includes('JWT')) {
          setError('Sessão expirada. Recarregue a página.');
        } else {
          setError(fetchError.message);
        }
        return;
      }

      setQuotes(data || []);
      console.log('✅ Quotes fetched successfully:', data?.length || 0);
      console.log('📋 Fetched quotes details:', data?.map(q => ({ 
        id: q.id, 
        status: q.status, 
        responses_count: q.responses_count,
        title: q.title
      })));
    } catch (err) {
      console.error('❌ Unexpected error fetching quotes:', err);
      setError('Falha na conexão. Verifique sua internet.');
    } finally {
      setIsLoading(false);
    }
  };

  const createQuote = async (quoteData: any) => {
    try {
      console.log('=== DEBUG createQuote INICIADO ===');
      console.log('❓ User context:', { user, hasUser: !!user, clientId: user?.clientId });
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Verify session is valid before proceeding
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const authUser = session.user;
      console.log('🔍 Valid session for user:', { userId: authUser.id, email: authUser.email });

      // Use the safe function to get client_id
      const { data: clientId, error: clientError } = await supabase.rpc('get_current_user_client_id');
      console.log('🔍 Client ID from RPC:', { clientId, clientError });

      if (clientError) {
        console.error('❌ Erro ao buscar client_id:', clientError);
        throw new Error(`Erro ao verificar vinculação do usuário: ${clientError.message}`);
      }
      
      if (!clientId) {
        console.error('❌ Client ID não encontrado para user:', authUser.id);
        console.log('🔍 Tentando buscar profile diretamente...');
        
        // Try to get profile directly
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('client_id, onboarding_completed')
          .eq('id', authUser.id)
          .maybeSingle();
          
        console.log('🔍 Profile direto:', { profile, profileError });
        
        if (profileError || !profile?.client_id) {
          throw new Error('Seu usuário não está vinculado a um cliente. Complete o onboarding primeiro.');
        }
        
        // Use profile client_id if RPC failed
        const effectiveClientId = profile.client_id;
        console.log('✅ Usando client_id do profile:', effectiveClientId);
      }

      const effectiveClientId = clientId || user.clientId;
      
      if (!effectiveClientId) {
        throw new Error('Não foi possível determinar o cliente. Recarregue a página.');
      }

      // Generate unique quote ID (DB also has trigger, but we keep readable IDs)
      const quoteId = `RFQ${Date.now().toString().slice(-6)}`;

      // TEST: Verify RLS conditions before insert
      console.log('🔍 Testing RLS conditions...');
      const { data: rlsTest, error: rlsError } = await supabase.rpc('get_current_user_client_id');
      console.log('🔍 RLS Test - get_current_user_client_id:', { rlsTest, rlsError });
      
      // Verify the user's profile and client_id
      const { data: profileCheck, error: profileError } = await supabase
        .from('profiles')
        .select('id, client_id, role, email')
        .eq('id', authUser.id)
        .single();
      console.log('🔍 Profile check:', { profileCheck, profileError });

      // CRITICAL: Check if RLS will pass by testing the exact condition
      console.log('🔍 RPC result for validation:', { rlsTest, rlsError });
      
      // Test each RLS condition individually
      const conditions = {
        auth_uid_exists: !!authUser.id,
        created_by_matches: true, // We'll set created_by = authUser.id
        client_id_not_null: !!rlsTest,
        client_id_matches_profile: rlsTest === profileCheck?.client_id
      };
      
      console.log('🔍 Individual RLS conditions:', conditions);
      
      const rlsValidationResult = {
        data: rlsTest,
        conditions,
        allValid: Object.values(conditions).every(Boolean)
      };

      if (!profileCheck?.client_id) {
        throw new Error(`Usuário não está vinculado a um cliente. Profile: ${JSON.stringify(profileCheck)}`);
      }

      if (!rlsTest) {
        throw new Error(`RPC get_current_user_client_id retornou null. Verifique se o usuário tem client_id no profile.`);
      }

      if (rlsTest !== profileCheck.client_id) {
        throw new Error(`Inconsistência: RPC retornou ${rlsTest}, mas profile tem ${profileCheck.client_id}`);
      }

      // Build minimal payload to satisfy RLS (only required columns)
      const minimalInsert = {
        id: quoteId,
        title: quoteData.title,
        client_id: rlsTest, // must match profiles.client_id of auth user
        client_name: user.companyName || user.name || 'Cliente',
        created_by: authUser.id
      } as const;

      console.log('🔍 Minimal payload for insert (RLS-safe):', minimalInsert);

      // First insert minimal row to pass RLS (no select to avoid SELECT policy issues)
      const { error: insertError } = await supabase
        .from('quotes')
        .insert(minimalInsert);

      if (insertError) {
        console.error('❌ Erro ao inserir cotação (minimal):', insertError);
        if (insertError.code === '42501') {
          console.error('❌ RLS violation on minimal insert. Check created_by/auth.uid and client_id/profile.client_id');
        }
        throw new Error(`Falha ao salvar cotação: ${insertError.message}`);
      }

      // Fetch the created quote explicitly
      let finalQuote: any = minimalInsert;
      const { data: createdQuote, error: fetchCreatedError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', minimalInsert.id)
        .maybeSingle();

      if (fetchCreatedError) {
        console.warn('⚠️ Falha ao recuperar cotação recém-criada, seguindo com dados mínimos:', fetchCreatedError);
      } else if (createdQuote) {
        finalQuote = createdQuote as any;
      }

      console.log('✅ Cotação criada (minimal):', finalQuote);

      // Update optional fields in a second step (UPDATE policy allows created_by owner)
      const updateData: Record<string, any> = {};
      if (quoteData.description) updateData.description = quoteData.description;
      if (quoteData.total != null) updateData.total = quoteData.total;
      if (quoteData.deadline) updateData.deadline = quoteData.deadline;
      updateData.status = 'draft';
      updateData.supplier_scope = quoteData.supplier_scope || 'local';
      updateData.items_count = quoteData.items?.length || 0;

      

      if (Object.keys(updateData).length > 0) {
        console.log('🔄 Atualizando campos opcionais da cotação...', updateData);
        const { data: updated, error: updateError } = await supabase
          .from('quotes')
          .update({ ...updateData, updated_at: new Date().toISOString() })
          .eq('id', createdQuote.id)
          .select('*')
          .single();
        if (updateError) {
          console.error('⚠️ Erro ao atualizar campos opcionais:', updateError);
          // Não falhar a criação por erro na atualização; manter registro básico
        } else if (updated) {
          finalQuote = updated as any;
        }
      }

      // Add to local state immediately for better UX
      setQuotes(prev => [finalQuote as any, ...prev]);

      // Create items if provided
      if (quoteData.items && quoteData.items.length > 0) {
        console.log('🔍 Inserindo itens da cotação...');
        
        const itemsToInsert = quoteData.items.map((item: any) => ({
          quote_id: (finalQuote as any).id,
          product_name: item.product_name,
          quantity: item.quantity || 1,
          product_id: item.product_id || null,
          unit_price: item.unit_price || 0,
          total: (item.quantity || 1) * (item.unit_price || 0)
        }));

        const { error: itemsError } = await supabase
          .from('quote_items')
          .insert(itemsToInsert);

        if (itemsError) {
          console.error('❌ Erro ao inserir itens:', itemsError);
          // Don't fail the entire quote creation for items error
          toast.error('Cotação criada, mas alguns itens não foram salvos');
        } else {
          console.log('✅ Itens inseridos com sucesso');
        }
      }

      // Create audit log
      try {
        await supabase.from('audit_logs').insert({
          action: 'QUOTE_CREATE',
          entity_type: 'quotes',
          entity_id: (finalQuote as any).id,
          panel_type: 'client',
          user_id: authUser.id,
          details: {
            quote_title: (finalQuote as any).title,
            status: (finalQuote as any).status,
            items_count: quoteData.items?.length || 0
          }
        });
      } catch (auditError) {
        console.warn('⚠️ Erro ao criar log de auditoria:', auditError);
        // Don't fail quote creation for audit log error
      }

      toast.success('Cotação criada com sucesso!');
      return finalQuote;
    } catch (error: any) {
      console.error('❌ Error creating quote:', error);
      toast.error('Erro ao criar cotação: ' + (error.message || 'Erro desconhecido'));
      throw error;
    }
  };

  const updateQuoteStatus = async (quoteId: string, newStatus: string, additionalData?: any) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const updateData = {
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...additionalData
      };

      const { data, error } = await supabase
        .from('quotes')
        .update(updateData)
        .eq('id', quoteId)
        .select()
        .single();

      if (error) throw error;

      // Create audit log
      await supabase.from('audit_logs').insert({
        action: 'QUOTE_STATUS_UPDATE',
        entity_type: 'quotes',
        entity_id: quoteId,
        panel_type: user.role === 'supplier' ? 'supplier' : 'client',
        user_id: user.id,
        details: {
          old_status: quotes.find(q => q.id === quoteId)?.status,
          new_status: newStatus
        }
      });

      toast.success('Status da cotação atualizado!');
      return data;
    } catch (error: any) {
      console.error('❌ Error updating quote status:', error);
      toast.error('Erro ao atualizar status: ' + error.message);
      throw error;
    }
  };

  const markQuoteAsSent = (quoteId: string, suppliersCount?: number) => {
    const additionalData = suppliersCount ? { suppliers_sent_count: suppliersCount } : {};
    return updateQuoteStatus(quoteId, 'sent', additionalData);
  };
  const markQuoteAsUnderReview = (quoteId: string) => updateQuoteStatus(quoteId, 'under_review');
  const markQuoteAsReceiving = (quoteId: string) => updateQuoteStatus(quoteId, 'receiving');
  const markQuoteAsReceived = (quoteId: string) => updateQuoteStatus(quoteId, 'received');

  const updateQuote = async (id: string, updates: any) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('quotes')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Create audit log
      await supabase.from('audit_logs').insert({
        action: 'QUOTE_UPDATE',
        entity_type: 'quotes',
        entity_id: id,
        panel_type: user.role === 'supplier' ? 'supplier' : 'client',
        user_id: user.id,
        details: updates
      });

      toast.success('Cotação atualizada com sucesso!');
      return data;
    } catch (error: any) {
      console.error('❌ Error updating quote:', error);
      toast.error('Erro ao atualizar cotação: ' + error.message);
      throw error;
    }
  };

  const deleteQuote = async (id: string, reason?: string) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const quote = quotes.find(q => q.id === id);
      if (!quote) {
        throw new Error('Quote not found');
      }

      // Only allow permanent deletion for draft quotes
      if (quote.status === 'draft') {
        const { error } = await supabase
          .from('quotes')
          .delete()
          .eq('id', id);

        if (error) throw error;
      } else {
        // Move to trash for non-draft quotes
        await updateQuoteStatus(id, 'cancelled');
      }

      // Create audit log
      await supabase.from('audit_logs').insert({
        action: quote.status === 'draft' ? 'QUOTE_DELETE' : 'QUOTE_CANCEL',
        entity_type: 'quotes',
        entity_id: id,
        panel_type: user.role === 'supplier' ? 'supplier' : 'client',
        user_id: user.id,
        details: {
          reason,
          original_status: quote.status
        }
      });

      toast.success(quote.status === 'draft' ? 'Cotação excluída!' : 'Cotação cancelada!');
    } catch (error: any) {
      console.error('❌ Error deleting quote:', error);
      toast.error('Erro ao excluir cotação: ' + error.message);
      throw error;
    }
  };

  const getQuoteById = (id: string): Quote | undefined => {
    return quotes.find(quote => quote.id === id);
  };

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) {
      console.log('⚠️ No user, skipping real-time setup');
      return;
    }

    console.log('🔄 Setting up real-time subscriptions for quotes...');

    // Set up real-time subscription for quotes
    const quotesSubscription = supabase
      .channel(`quotes_realtime_${user.id}`, {
        config: {
          broadcast: { self: true }
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quotes'
        },
        (payload) => {
          console.log('📨 Real-time quote update received:', payload);
          
          if (payload.eventType === 'UPDATE') {
            const updatedQuote = payload.new as Quote;
            console.log('📝 Updating quote in real-time:', updatedQuote.id, 'new status:', updatedQuote.status, 'responses_count:', updatedQuote.responses_count);
            
            setQuotes(prev => 
              prev.map(quote => quote.id === updatedQuote.id ? updatedQuote : quote)
            );
          } else if (payload.eventType === 'INSERT') {
            const newQuote = payload.new as Quote;
            console.log('📝 Adding new quote in real-time:', newQuote.id);
            
            // Check if this quote should be visible to current user
            const shouldShow = user.role === 'admin' || 
              (user.role !== 'supplier' && newQuote.client_id === user.clientId) ||
              (user.role === 'supplier' && (
                newQuote.supplier_id === user.supplierId ||
                newQuote.supplier_scope === 'all' ||
                newQuote.supplier_scope === 'global' ||
                newQuote.selected_supplier_ids?.includes(user.supplierId || '')
              ));
            
            if (shouldShow) {
              setQuotes(prev => [newQuote, ...prev]);
            }
          } else if (payload.eventType === 'DELETE') {
            console.log('📝 Removing quote in real-time:', payload.old.id);
            setQuotes(prev => prev.filter(quote => quote.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
      });

    // Set up real-time subscription for quote responses
    const responsesSubscription = supabase
      .channel(`quote_responses_realtime_${user.id}`, {
        config: {
          broadcast: { self: true }
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quote_responses'
        },
        async (payload) => {
          console.log('📨 Quote response change received:', payload);
          
          // Since we have database triggers handling the updates,
          // we just need to refetch the affected quote to get the updated data
          if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
            const response = payload.eventType === 'INSERT' ? payload.new : payload.old;
            const quoteId = response.quote_id;
            
            console.log('🔄 Refreshing quote after response change:', quoteId);
            
            // Fetch the updated quote data (trigger will have updated responses_count and status)
            const { data: updatedQuote } = await supabase
              .from('quotes')
              .select('*')
              .eq('id', quoteId)
              .single();
            
            if (updatedQuote) {
              console.log('📊 Quote updated by trigger - responses_count:', updatedQuote.responses_count, 'status:', updatedQuote.status);
              
              // Update the local state with the fresh data from database
              setQuotes(prev => 
                prev.map(quote => 
                  quote.id === quoteId ? updatedQuote as Quote : quote
                )
              );
              
              // Force a complete refresh to ensure UI is up to date
              setTimeout(() => {
                console.log('🔄 Force refreshing quotes after realtime update');
                fetchQuotes();
              }, 500);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Quote responses subscription status:', status);
      });

    return () => {
      console.log('🔄 Cleaning up real-time subscriptions');
      quotesSubscription.unsubscribe();
      responsesSubscription.unsubscribe();
    };
  }, [user]);

  // Initial fetch
  useEffect(() => {
    console.log('🔄 useSupabaseQuotes - Initial fetch effect triggered');
    if (user) {
      fetchQuotes();
    }
  }, [user]);

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