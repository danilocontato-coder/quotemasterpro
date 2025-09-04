import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ApprovalService } from '@/services/ApprovalService';

export interface Quote {
  id: string;
  title: string;
  description: string;
  total: number;
  status: string;
  client_id: string;
  client_name: string;
  supplier_id?: string;
  supplier_name?: string;
  items_count: number;
  responses_count: number;
  suppliers_sent_count: number;
  deadline?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useSupabaseQuotes = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch quotes based on user role
  const fetchQuotes = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter based on user role
      if (user.role === 'client' || user.role === 'manager' || user.role === 'collaborator') {
        if (user.clientId) {
          query = query.eq('client_id', user.clientId);
        }
      } else if (user.role === 'supplier' && user.supplierId) {
        query = query.eq('supplier_id', user.supplierId);
      }
      // Admin sees all quotes (no filter)

      const { data, error } = await query;

      if (error) throw error;

      // Count responses for each quote and update the data
      const quotesWithCounts = await Promise.all(
        (data || []).map(async (quote) => {
          const { count } = await supabase
            .from('quote_responses')
            .select('*', { count: 'exact', head: true })
            .eq('quote_id', quote.id);
          
          return {
            ...quote,
            responses_count: count || 0
          };
        })
      );

      setQuotes(quotesWithCounts);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar cotações';
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Create new quote
  const createQuote = async (quoteData: Omit<Quote, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
    if (!user || !user.clientId) return null;

    try {
      // Generate unique ID (since quotes table uses TEXT id)
      const quoteId = `RFQ${Date.now().toString().slice(-6)}`;
      
      const newQuote = {
        id: quoteId,
        ...quoteData,
        client_id: user.clientId,
        created_by: user.id,
      };

      const { data, error } = await supabase
        .from('quotes')
        .insert(newQuote)
        .select()
        .single();

      if (error) throw error;

      setQuotes(prev => [data, ...prev]);
      
      // Create audit log
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'CREATE',
        entity_type: 'quotes',
        entity_id: data.id,
        panel_type: 'client',
        details: { title: data.title, status: data.status }
      });

      toast({
        title: 'Sucesso',
        description: 'Cotação criada com sucesso',
      });

      // Verificar se precisa de aprovação e criar se necessário
      if (data.status === 'sent' && data.total > 0) {
        try {
          await ApprovalService.createApprovalForQuote({
            quoteId: data.id,
            clientId: data.client_id,
            amount: data.total
          });
        } catch (error) {
          console.log('No approval required or error creating approval');
        }
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar cotação';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    }
  };

  // Update quote
  const updateQuote = async (id: string, updates: Partial<Quote> & { items?: Array<{ product_name: string; quantity: number; product_id?: string; }> }) => {
    try {
      console.log('updateQuote called with id:', id, 'updates:', updates);
      
      // Separate items from other updates
      const { items, ...quoteUpdates } = updates;
      
      // Update quote basic data
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .update(quoteUpdates)
        .eq('id', id)
        .select()
        .single();

      if (quoteError) {
        console.error('Quote update error:', quoteError);
        throw quoteError;
      }

      console.log('Quote updated successfully:', quoteData);

      // If items are provided, update them
      if (items && Array.isArray(items)) {
        console.log('Updating quote items:', items);
        
        // Delete existing items for this quote
        const { error: deleteError } = await supabase
          .from('quote_items')
          .delete()
          .eq('quote_id', id);

        if (deleteError) {
          console.error('Error deleting existing quote items:', deleteError);
          throw deleteError;
        }

        // Insert new items if any
        if (items.length > 0) {
          const quoteItems = items.map(item => ({
            quote_id: id,
            product_name: item.product_name,
            quantity: item.quantity,
            product_id: item.product_id || null,
            unit_price: 0, // Default value
            total: 0 // Default value
          }));

          const { error: insertError } = await supabase
            .from('quote_items')
            .insert(quoteItems);

          if (insertError) {
            console.error('Error inserting quote items:', insertError);
            throw insertError;
          }

          console.log('Quote items updated successfully');
        }

        // Update items_count in quote
        const { error: countError } = await supabase
          .from('quotes')
          .update({ items_count: items.length })
          .eq('id', id);

        if (countError) {
          console.error('Error updating items count:', countError);
        }
      }

      // Update local state
      setQuotes(prev => 
        prev.map(quote => quote.id === id ? { ...quote, ...quoteData, items_count: items?.length || quote.items_count } : quote)
      );

      // Create audit log
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'UPDATE',
          entity_type: 'quotes',
          entity_id: id,
          panel_type: user.role === 'admin' ? 'admin' : 'client',
          details: { ...quoteUpdates, items_updated: !!items }
        });
      }

      toast({
        title: 'Sucesso',
        description: 'Cotação atualizada com sucesso',
      });

      return quoteData;
    } catch (err) {
      console.error('Error in updateQuote:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar cotação';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    }
  };

  // Delete quote
  const deleteQuote = async (id: string, reason?: string) => {
    try {
      console.log('deleteQuote called with id:', id, 'reason:', reason);
      console.log('Current user:', user);
      
      const quote = quotes.find(q => q.id === id);
      console.log('Found quote for deletion:', quote);
      
      if (!quote) {
        console.error('Quote not found for deletion');
        return false;
      }

      // Check permissions before attempting deletion
      const canDelete = user?.role === 'admin' || 
                       (quote.status === 'draft' && 
                        quote.client_id === user?.clientId && 
                        quote.created_by === user?.id);
      
      console.log('Permission check:', {
        isAdmin: user?.role === 'admin',
        isDraft: quote.status === 'draft',
        clientMatch: quote.client_id === user?.clientId,
        createdByMatch: quote.created_by === user?.id,
        canDelete
      });

      if (!canDelete) {
        toast({
          title: 'Erro',
          description: 'Você não tem permissão para excluir esta cotação',
          variant: 'destructive',
        });
        return false;
      }

      // If quote is draft, delete permanently, otherwise update status to cancelled
      if (quote.status === 'draft') {
        console.log('Deleting draft quote permanently');
        
        // First delete related quote_items to avoid foreign key constraints
        const { error: itemsError } = await supabase
          .from('quote_items')
          .delete()
          .eq('quote_id', id);

        if (itemsError) {
          console.error('Error deleting quote items:', itemsError);
          throw itemsError;
        }

        console.log('Quote items deleted successfully');

        // Then delete the quote
        const { error: quoteError } = await supabase
          .from('quotes')
          .delete()
          .eq('id', id);

        if (quoteError) {
          console.error('Error deleting quote:', quoteError);
          throw quoteError;
        }

        console.log('Quote deleted successfully');
        
        // Force immediate local state update
        setQuotes(prev => prev.filter(q => q.id !== id));
      } else {
        console.log('Updating quote status to cancelled');
        // Update status to cancelled instead of delete
        const { error } = await supabase
          .from('quotes')
          .update({ status: 'cancelled' })
          .eq('id', id);

        if (error) {
          console.error('Error updating quote status to cancelled:', error);
          throw error;
        }

        console.log('Quote status updated to cancelled');
        
        // Force immediate local state update
        setQuotes(prev => 
          prev.map(q => q.id === id ? { ...q, status: 'cancelled' } : q)
        );
      }

      // Create audit log
      if (user) {
        console.log('Creating audit log for quote deletion');
        const { error: auditError } = await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'DELETE',
          entity_type: 'quotes',
          entity_id: id,
          panel_type: user.role === 'admin' ? 'admin' : 'client',
          details: {
            title: quote.title,
            previousStatus: quote.status,
            reason: reason || 'No reason provided',
            permanently: quote.status === 'draft'
          }
        });

        if (auditError) {
          console.warn('Error creating audit log:', auditError);
        }
      }

      // Force refetch to ensure sync
      setTimeout(() => {
        console.log('Refetching quotes after deletion');
        fetchQuotes();
      }, 100);

      toast({
        title: 'Sucesso',
        description: quote.status === 'draft' ? 'Cotação excluída permanentemente' : 'Cotação cancelada',
      });

      return true;
    } catch (err) {
      console.error('Error in deleteQuote:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir cotação';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    }
  };

  // Get quote by ID
  const getQuoteById = (id: string) => {
    return quotes.find(quote => quote.id === id);
  };

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    fetchQuotes();

    // Set up real-time subscription
    const subscription = supabase
      .channel('quotes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quotes'
        },
        (payload) => {
          console.log('Quote change received:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newQuote = payload.new as Quote;
            // Only add if it belongs to current user's scope
            if (user.role === 'admin' || 
                ((user.role === 'client' || user.role === 'manager' || user.role === 'collaborator') && newQuote.client_id === user.clientId) ||
                (user.role === 'supplier' && newQuote.supplier_id === user.supplierId)) {
              setQuotes(prev => [newQuote, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedQuote = payload.new as Quote;
            setQuotes(prev => 
              prev.map(quote => quote.id === updatedQuote.id ? updatedQuote : quote)
            );
          } else if (payload.eventType === 'DELETE') {
            setQuotes(prev => prev.filter(quote => quote.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  return {
    quotes,
    isLoading,
    error,
    createQuote,
    updateQuote,
    deleteQuote,
    getQuoteById,
    refetch: fetchQuotes,
  };
};