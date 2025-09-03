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

      setQuotes(data || []);
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
  const updateQuote = async (id: string, updates: Partial<Quote>) => {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setQuotes(prev => 
        prev.map(quote => quote.id === id ? { ...quote, ...data } : quote)
      );

      // Create audit log
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'UPDATE',
          entity_type: 'quotes',
          entity_id: id,
          panel_type: user.role === 'admin' ? 'admin' : 'client',
          details: updates
        });
      }

      toast({
        title: 'Sucesso',
        description: 'Cotação atualizada com sucesso',
      });

      return data;
    } catch (err) {
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
      const quote = quotes.find(q => q.id === id);
      if (!quote) return false;

      // If quote is draft, delete permanently, otherwise update status to cancelled
      if (quote.status === 'draft') {
        const { error } = await supabase
          .from('quotes')
          .delete()
          .eq('id', id);

        if (error) throw error;
        
        // Force immediate local state update
        setQuotes(prev => prev.filter(q => q.id !== id));
      } else {
        // Update status to cancelled instead of trash
        const { error } = await supabase
          .from('quotes')
          .update({ status: 'cancelled' })
          .eq('id', id);

        if (error) throw error;
        
        // Force immediate local state update
        setQuotes(prev => 
          prev.map(q => q.id === id ? { ...q, status: 'cancelled' } : q)
        );
      }

      // Create audit log
      if (user) {
        await supabase.from('audit_logs').insert({
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
      }

      // Force refetch to ensure sync
      setTimeout(() => {
        fetchQuotes();
      }, 100);

      toast({
        title: 'Sucesso',
        description: quote.status === 'draft' ? 'Cotação excluída permanentemente' : 'Cotação cancelada',
      });

      return true;
    } catch (err) {
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