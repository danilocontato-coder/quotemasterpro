import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface SupplierQuote {
  id: string;
  title: string;
  description: string;
  client: string;
  clientId: string;
  status: 'pending' | 'proposal_sent' | 'approved' | 'rejected' | 'expired';
  deadline: string;
  estimatedValue?: number;
  sentAt?: string;
  createdAt: string;
  items: SupplierQuoteItem[];
  attachments?: QuoteAttachment[];
  proposal?: QuoteProposal;
}

export interface SupplierQuoteItem {
  id: string;
  productName: string;
  description: string;
  quantity: number;
  unitPrice?: number;
  total?: number;
}

export interface QuoteAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
}

export interface QuoteProposal {
  id: string;
  quoteId: string;
  supplierId: string;
  items: ProposalItem[];
  totalValue: number;
  deliveryTime: number;
  paymentTerms: string;
  observations?: string;
  attachments: QuoteAttachment[];
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  createdAt: string;
  sentAt?: string;
}

export interface ProposalItem {
  id: string;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  brand?: string;
  specifications?: string;
}

const getSupplierStatus = (responseStatus: string): SupplierQuote['status'] => {
  switch (responseStatus) {
    case 'pending':
      return 'pending';
    case 'sent':
      return 'proposal_sent';
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    case 'expired':
      return 'expired';
    default:
      return 'pending';
  }
};

export const useSupabaseSupplierQuotes = () => {
  const [supplierQuotes, setSupplierQuotes] = useState<SupplierQuote[]>([]);
  const [proposals, setProposals] = useState<QuoteProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch quotes for supplier
  const fetchSupplierQuotes = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Handle supplier without supplierId - try to find supplier record
    if (!user.supplierId) {
      console.log('⚠️ User missing supplierId in quotes, attempting to find supplier record...');
      
      try {
        const { data: supplierData, error: supplierError } = await supabase
          .from('suppliers')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();

        if (!supplierData || supplierError) {
          console.log('No supplier record found for quotes:', user.email);
          setIsLoading(false);
          setSupplierQuotes([]);
          return;
        }

        // Temporarily use the found supplier ID for this session
        console.log('📋 Using found supplier ID for quotes:', supplierData.id);
        user.supplierId = supplierData.id; // Temporary assignment
      } catch (error) {
        console.error('Error in supplier lookup for quotes:', error);
        setIsLoading(false);
        return;
      }
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('📋 Fetching quotes for supplier:', user.supplierId);

      // First, get all quote responses for this supplier
      const { data: supplierResponses, error: responsesError } = await supabase
        .from('quote_responses')
        .select('*')
        .eq('supplier_id', user.supplierId);

      if (responsesError) {
        console.error('❌ Error fetching supplier responses:', responsesError);
        throw responsesError;
      }

      console.log('📋 Supplier responses found:', supplierResponses?.length || 0);

      // Get quote IDs from responses
      const quotesWithResponsesIds = supplierResponses?.map(r => r.quote_id) || [];

      // Fetch quotes that have responses from this supplier
      let quotesData: any[] = [];
      if (quotesWithResponsesIds.length > 0) {
        const { data: quotesWithResponses, error: quotesWithResponsesError } = await supabase
          .from('quotes')
          .select('*')
          .in('id', quotesWithResponsesIds)
          .order('created_at', { ascending: false });

        if (quotesWithResponsesError) {
          console.error('❌ Error fetching quotes with responses:', quotesWithResponsesError);
          throw quotesWithResponsesError;
        }

        quotesData = quotesWithResponses || [];
      }

      console.log('📋 Quotes with responses found:', quotesData.length);

      // Also fetch quotes that are available for suppliers
      // 1. Global/all quotes available to all suppliers
      const { data: globalQuotes, error: globalQuotesError } = await supabase
        .from('quotes')
        .select('*')
        .in('supplier_scope', ['global', 'all'])
        .in('status', ['sent', 'receiving'])
        .order('created_at', { ascending: false });

      // 2. Local quotes available to this supplier (sent but without specific assignment)
      const { data: localQuotes, error: localQuotesError } = await supabase
        .from('quotes')
        .select('*')
        .eq('supplier_scope', 'local')
        .is('supplier_id', null)
        .in('status', ['sent', 'receiving'])
        .order('created_at', { ascending: false });

      if (globalQuotesError) {
        console.error('❌ Error fetching global quotes:', globalQuotesError);
        // Don't throw here - this is optional data
      } else {
        console.log('📋 Global quotes found:', globalQuotes?.length || 0);
      }

      if (localQuotesError) {
        console.error('❌ Error fetching local quotes:', localQuotesError);
        // Don't throw here - this is optional data
      } else {
        console.log('📋 Local quotes found:', localQuotes?.length || 0);
      }

      // 3. Quotes explicitly assigned to this supplier via quote_suppliers
      const { data: assignedMappings, error: assignedMapError } = await supabase
        .from('quote_suppliers')
        .select('quote_id')
        .eq('supplier_id', user.supplierId);

      if (assignedMapError) {
        console.error('❌ Error fetching assigned mappings:', assignedMapError);
      }

      let assignedQuotes: any[] = [];
      const assignedIds = (assignedMappings || []).map(m => m.quote_id).filter(Boolean);
      if (assignedIds.length > 0) {
        const { data: assignedQuotesData, error: assignedQuotesError } = await supabase
          .from('quotes')
          .select('*')
          .in('id', assignedIds)
          .order('created_at', { ascending: false });

        if (assignedQuotesError) {
          console.error('❌ Error fetching assigned quotes:', assignedQuotesError);
        } else {
          assignedQuotes = assignedQuotesData || [];
          console.log('📋 Assigned quotes found:', assignedQuotes.length);
        }
      }

      // Combine and deduplicate quotes
      const allQuotes = [...quotesData, ...assignedQuotes, ...(globalQuotes || []), ...(localQuotes || [])];
      const uniqueQuotes = allQuotes.reduce((acc, quote) => {
        if (!acc.find(q => q.id === quote.id)) {
          acc.push(quote);
        }
        return acc;
      }, [] as any[]);

      // Fetch items separately to avoid RLS recursion via embedded selects
      let itemsByQuoteId: Record<string, any[]> = {};
      try {
        const quoteIds = uniqueQuotes.map((q: any) => q.id);
        if (quoteIds.length > 0) {
          const { data: itemsData, error: itemsError } = await supabase
            .from('quote_items')
            .select('*')
            .in('quote_id', quoteIds);
          if (!itemsError && itemsData) {
            itemsByQuoteId = itemsData.reduce((acc: Record<string, any[]>, item: any) => {
              (acc[item.quote_id] ||= []).push(item);
              return acc;
            }, {});
          } else if (itemsError) {
            console.error('❌ Error fetching quote items:', itemsError);
          }
        }
      } catch (itemsErr) {
        console.error('❌ Unexpected error fetching quote items:', itemsErr);
      }

      console.log('📋 Total unique quotes found:', uniqueQuotes.length);

      // Transform quotes to supplier format
      const transformedQuotes: SupplierQuote[] = uniqueQuotes.map(quote => {
        const existingResponse = supplierResponses?.find(r => r.quote_id === quote.id);
        
        return {
          id: quote.id,
          title: quote.title,
          description: quote.description || '',
          client: quote.client_name,
          clientId: quote.client_id,
          status: existingResponse ? getSupplierStatus(existingResponse.status) : 'pending',
          deadline: quote.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          estimatedValue: quote.total > 0 ? quote.total : undefined,
          sentAt: existingResponse?.created_at,
          createdAt: quote.created_at,
          items: (itemsByQuoteId[quote.id] || []).map((item: any) => ({
            id: item.id,
            productName: item.product_name,
            description: item.product_name,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            total: item.total,
          })),
          attachments: [],
          proposal: existingResponse ? {
            id: existingResponse.id,
            quoteId: quote.id,
            supplierId: user.supplierId,
            items: [], // Will be loaded separately if needed
            totalValue: existingResponse.total_amount,
            deliveryTime: existingResponse.delivery_time || 7,
            paymentTerms: '30 dias',
            observations: existingResponse.notes,
            attachments: [],
            status: existingResponse.status === 'approved' ? 'approved' : (existingResponse.status === 'pending' ? 'draft' : 'sent'),
            createdAt: existingResponse.created_at,
            sentAt: existingResponse.status === 'sent' ? existingResponse.created_at : undefined,
          } : undefined,
        };
      });

      console.log('📋 Transformed quotes:', transformedQuotes.length);
      setSupplierQuotes(transformedQuotes);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar cotações';
      console.error('❌ Complete error in fetchSupplierQuotes:', err);
      console.error('❌ Error details:', {
        message: errorMessage,
        code: (err as any)?.code,
        details: (err as any)?.details,
        hint: (err as any)?.hint
      });
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  // Setup realtime subscriptions for quote responses
  useEffect(() => {
    if (!user?.supplierId) return;

    console.log('📡 Setting up realtime subscriptions for supplier quotes');

    // Listen to quote_responses changes for this supplier
    const quotesChannel = supabase
      .channel('supplier-quote-responses')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quote_responses',
          filter: `supplier_id=eq.${user.supplierId}`
        },
        (payload) => {
          console.log('📡 Quote response changed:', payload);
          
          if (payload.eventType === 'UPDATE') {
            const updatedResponse = payload.new as any;
            
            // Update local state with new status
            setSupplierQuotes(prev => prev.map(quote => {
              if (quote.id === updatedResponse.quote_id && quote.proposal) {
                const newStatus = updatedResponse.status === 'approved' ? 'approved' : 
                                 updatedResponse.status === 'rejected' ? 'rejected' :
                                 updatedResponse.status === 'pending' ? 'pending' : 'approved';
                
                return {
                  ...quote,
                  status: updatedResponse.status === 'approved' ? 'approved' : quote.status,
                  proposal: {
                    ...quote.proposal,
                    status: newStatus,
                    totalValue: updatedResponse.total_amount,
                    deliveryTime: updatedResponse.delivery_time || quote.proposal.deliveryTime,
                    observations: updatedResponse.notes || quote.proposal.observations,
                  }
                };
              }
              return quote;
            }));

            // Show toast notification for status changes
            if (updatedResponse.status === 'approved') {
              toast({
                title: '🎉 Proposta Aprovada!',
                description: `Sua proposta foi aprovada pelo cliente!`,
                duration: 5000,
              });
            } else if (updatedResponse.status === 'rejected') {
              toast({
                title: '❌ Proposta Rejeitada',
                description: `Sua proposta foi rejeitada pelo cliente.`,
                variant: 'destructive',
                duration: 5000,
              });
            }
          }
        }
      )
      .subscribe();

    // Also listen to quotes table changes for status updates
    const quotesTableChannel = supabase
      .channel('supplier-quotes-table')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'quotes'
        },
        (payload) => {
          console.log('📡 Quote table changed:', payload);
          
          const updatedQuote = payload.new as any;
          
          // Update quote status if it affects our quotes
          setSupplierQuotes(prev => prev.map(quote => {
            if (quote.id === updatedQuote.id) {
              return {
                ...quote,
                status: updatedQuote.status === 'approved' ? 'approved' : quote.status,
              };
            }
            return quote;
          }));
        }
      )
      .subscribe();

    return () => {
      console.log('📡 Cleaning up realtime subscriptions');
      supabase.removeChannel(quotesChannel);
      supabase.removeChannel(quotesTableChannel);
    };
  }, [user?.supplierId, toast]);

  // Fetch quotes when user changes
  useEffect(() => {
    fetchSupplierQuotes();
  }, [fetchSupplierQuotes]);

  // Get quote by ID
  const getQuoteById = useCallback((id: string) => {
    return supplierQuotes.find(quote => quote.id === id);
  }, [supplierQuotes]);

  // Create or update proposal
  const createProposal = useCallback(async (
    quoteId: string, 
    proposalData: Omit<QuoteProposal, 'id' | 'quoteId' | 'supplierId' | 'createdAt' | 'status'>
  ) => {
    if (!user || !user.supplierId) return null;

    try {
      // Check if response already exists
      const { data: existingResponse } = await supabase
        .from('quote_responses')
        .select('*')
        .eq('quote_id', quoteId)
        .eq('supplier_id', user.supplierId)
        .maybeSingle();

      const responseData = {
        quote_id: quoteId,
        supplier_id: user.supplierId,
        supplier_name: user.name || 'Fornecedor',
        total_amount: proposalData.totalValue,
        delivery_time: proposalData.deliveryTime,
        notes: proposalData.observations,
        status: 'pending'
      };

      let savedResponse;
      if (existingResponse) {
        // Update existing response
        const { data, error } = await supabase
          .from('quote_responses')
          .update(responseData)
          .eq('id', existingResponse.id)
          .select()
          .single();

        if (error) throw error;
        savedResponse = data;
      } else {
        // Create new response
        const { data, error } = await supabase
          .from('quote_responses')
          .insert(responseData)
          .select()
          .single();

        if (error) throw error;
        savedResponse = data;
      }

      // Update local state
      setSupplierQuotes(prev => prev.map(quote => 
        quote.id === quoteId 
          ? {
              ...quote,
              proposal: {
                id: savedResponse.id,
                quoteId,
                supplierId: user.supplierId,
                items: proposalData.items,
                totalValue: proposalData.totalValue,
                deliveryTime: proposalData.deliveryTime,
                paymentTerms: proposalData.paymentTerms,
                observations: proposalData.observations,
                attachments: proposalData.attachments,
                status: 'draft',
                createdAt: savedResponse.created_at,
              }
            }
          : quote
      ));

      // Create audit log
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: existingResponse ? 'UPDATE' : 'CREATE',
        entity_type: 'quote_responses',
        entity_id: savedResponse.id,
        panel_type: 'supplier',
        details: { 
          quote_id: quoteId,
          total_amount: proposalData.totalValue,
          delivery_time: proposalData.deliveryTime
        }
      });

      toast({
        title: 'Sucesso',
        description: 'Proposta salva com sucesso',
      });

      return savedResponse;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar proposta';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    }
  }, [user, toast]);

  // Update proposal
  const updateProposal = useCallback(async (proposalId: string, updates: Partial<QuoteProposal>) => {
    if (!user) return;

    try {
      const updateData: any = {};
      if (updates.totalValue !== undefined) updateData.total_amount = updates.totalValue;
      if (updates.deliveryTime !== undefined) updateData.delivery_time = updates.deliveryTime;
      if (updates.observations !== undefined) updateData.notes = updates.observations;

      const { data, error } = await supabase
        .from('quote_responses')
        .update(updateData)
        .eq('id', proposalId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setSupplierQuotes(prev => prev.map(quote => 
        quote.proposal?.id === proposalId
          ? {
              ...quote,
              proposal: quote.proposal ? {
                ...quote.proposal,
                ...updates,
              } : undefined
            }
          : quote
      ));

      toast({
        title: 'Sucesso',
        description: 'Proposta atualizada com sucesso',
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar proposta';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    }
  }, [user, toast]);

  // Send proposal
  const sendProposal = useCallback(async (proposalId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('quote_responses')
        .update({ 
          status: 'sent',
          created_at: new Date().toISOString() // Update timestamp when sent
        })
        .eq('id', proposalId)
        .select()
        .single();

      if (error) throw error;

      // Determine target quote and update local state robustly
      const existingQuoteByProposal = supplierQuotes.find(q => q.proposal?.id === proposalId);
      const targetQuoteId = existingQuoteByProposal?.id || (data as any)?.quote_id;

      // Update local state using quote_id fallback
      setSupplierQuotes(prev => prev.map(q => {
        if (q.id !== targetQuoteId) return q;
        const prevProposal = q.proposal;
        const updatedProposal: QuoteProposal = {
          id: (data as any).id,
          quoteId: targetQuoteId,
          supplierId: user.supplierId!,
          items: prevProposal?.items || [],
          totalValue: (data as any).total_amount,
          deliveryTime: (data as any).delivery_time || prevProposal?.deliveryTime || 7,
          paymentTerms: prevProposal?.paymentTerms || '30 dias',
          observations: (data as any).notes ?? prevProposal?.observations,
          attachments: prevProposal?.attachments || [],
          status: 'sent',
          createdAt: (data as any).created_at,
          sentAt: new Date().toISOString(),
        };

        return {
          ...q,
          status: 'proposal_sent',
          sentAt: new Date().toISOString(),
          proposal: updatedProposal,
        };
      }));

      // Update quote status to "receiving" and notify client via WhatsApp
      if (targetQuoteId) {
        try {
          // Update quote status to "receiving" when first proposal is sent
          await supabase
            .from('quotes')
            .update({ status: 'receiving' })
            .eq('id', targetQuoteId);

          await supabase.functions.invoke('notify-client-proposal', {
            body: {
              quoteId: targetQuoteId,
              supplierId: user.supplierId,
              supplierName: user.name || 'Fornecedor',
              totalValue: (data as any).total_amount
            }
          });
        } catch (notifyError) {
          console.warn('Failed to notify client:', notifyError);
          // Don't fail the whole operation if notification fails
        }
      }

      // Create audit log
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'SEND_PROPOSAL',
        entity_type: 'quote_responses',
        entity_id: proposalId,
        panel_type: 'supplier',
        details: { sent_at: new Date().toISOString() }
      });

      toast({
        title: 'Sucesso',
        description: 'Proposta enviada com sucesso',
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao enviar proposta';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    }
  }, [user, toast]);

  // Add attachment (using Supabase Storage)
  const addAttachment = useCallback(async (quoteId: string, file: File) => {
    if (!user) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `quotes/${quoteId}/${fileName}`;

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);

      const attachment: QuoteAttachment = {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type,
        url: publicUrl,
        uploadedAt: new Date().toISOString(),
      };

      // Update local state - add to proposal attachments
      setSupplierQuotes(prev => prev.map(quote => 
        quote.id === quoteId
          ? {
              ...quote,
              proposal: quote.proposal ? {
                ...quote.proposal,
                attachments: [...quote.proposal.attachments, attachment]
              } : undefined
            }
          : quote
      ));

      toast({
        title: 'Sucesso',
        description: 'Arquivo anexado com sucesso',
      });

      return attachment;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao anexar arquivo';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    }
  }, [user, toast]);

  // Remove attachment
  const removeAttachment = useCallback(async (quoteId: string, attachmentId: string) => {
    try {
      // Find the attachment to get the file path
      const quote = supplierQuotes.find(q => q.id === quoteId);
      const attachment = quote?.attachments?.find(a => a.id === attachmentId);
      
      if (attachment) {
        // Extract file path from URL
        const urlParts = attachment.url.split('/');
        const filePath = `quotes/${quoteId}/${urlParts[urlParts.length - 1]}`;
        
        // Delete from storage
        const { error: deleteError } = await supabase.storage
          .from('attachments')
          .remove([filePath]);

        if (deleteError) {
          console.warn('Error deleting file from storage:', deleteError);
        }
      }

      // Update local state - remove from proposal attachments
      setSupplierQuotes(prev => prev.map(quote => 
        quote.id === quoteId
          ? {
              ...quote,
              proposal: quote.proposal ? {
                ...quote.proposal,
                attachments: quote.proposal.attachments.filter(att => att.id !== attachmentId)
              } : undefined
            }
          : quote
      ));

      toast({
        title: 'Sucesso',
        description: 'Arquivo removido com sucesso',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao remover arquivo';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [supplierQuotes, toast]);

  // Fetch data on mount and when user changes
  useEffect(() => {
    console.log('🔍 useSupabaseSupplierQuotes useEffect triggered:', {
      userRole: user?.role,
      supplierId: user?.supplierId,
      userId: user?.id,
      userEmail: user?.email,
    });
    
    if (user?.role === 'supplier') {
      console.log('📋 User is supplier, calling fetchSupplierQuotes...');
      fetchSupplierQuotes();
    } else {
      console.log('⚠️ User is not supplier, role:', user?.role);
    }
  }, [user?.role, user?.supplierId]); // Don't include fetchSupplierQuotes to avoid infinite loops

  return {
    supplierQuotes,
    proposals,
    isLoading,
    error,
    getQuoteById,
    createProposal,
    updateProposal,
    sendProposal,
    addAttachment,
    removeAttachment,
    refetch: fetchSupplierQuotes,
  };
};