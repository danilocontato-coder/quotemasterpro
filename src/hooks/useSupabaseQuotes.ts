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
        setError(fetchError.message);
        return;
      }

      setQuotes(data || []);
      console.log('✅ Quotes fetched successfully:', data?.length || 0);
    } catch (err) {
      console.error('❌ Unexpected error fetching quotes:', err);
      setError('Failed to fetch quotes');
    } finally {
      setIsLoading(false);
    }
  };

  const createQuote = async (quoteData: any) => {
    try {
      if (!user || !user.clientId) {
        throw new Error('User not authenticated or no client associated');
      }

      // Generate unique quote ID
      const quoteId = `RFQ${Date.now().toString().slice(-6)}`;

      const newQuoteData = {
        id: quoteId,
        title: quoteData.title,
        description: quoteData.description,
        client_id: user.clientId,
        client_name: user.companyName || 'Cliente',
        created_by: user.id,
        status: 'draft',
        total: quoteData.total || 0,
        deadline: quoteData.deadline
      };

      const { data, error } = await supabase
        .from('quotes')
        .insert(newQuoteData)
        .select()
        .single();

      if (error) throw error;

      // Create audit log
      await supabase.from('audit_logs').insert({
        action: 'QUOTE_CREATE',
        entity_type: 'quotes',
        entity_id: data.id,
        panel_type: 'client',
        user_id: user.id,
        details: {
          quote_title: data.title,
          status: data.status
        }
      });

      toast.success('Cotação criada com sucesso!');
      return data;
    } catch (error: any) {
      console.error('❌ Error creating quote:', error);
      toast.error('Erro ao criar cotação: ' + error.message);
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
      .channel('quotes_realtime')
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
      .subscribe();

    // Set up real-time subscription for quote responses
    const responsesSubscription = supabase
      .channel('quote_responses_realtime')
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
      .subscribe();

    return () => {
      console.log('🔄 Cleaning up real-time subscriptions');
      quotesSubscription.unsubscribe();
      responsesSubscription.unsubscribe();
    };
  }, [user]);

  // Initial fetch
  useEffect(() => {
    console.log('🔄 useSupabaseQuotes - Initial fetch effect triggered');
    fetchQuotes();
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