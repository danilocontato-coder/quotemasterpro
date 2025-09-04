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

const getSupplierStatus = (clientStatus: string): SupplierQuote['status'] => {
  switch (clientStatus) {
    case 'sent':
    case 'receiving':
      return 'pending';
    case 'under_review':
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
          .select(`
            *,
            quote_items (*)
          `)
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
      // 1. Global quotes available to all suppliers
      const { data: globalQuotes, error: globalQuotesError } = await supabase
        .from('quotes')
        .select(`
          *,
          quote_items (*)
        `)
        .eq('supplier_scope', 'global')
        .in('status', ['sent', 'receiving'])
        .order('created_at', { ascending: false });

      // 2. Local quotes specifically assigned to this supplier
      const { data: localQuotes, error: localQuotesError } = await supabase
        .from('quotes')
        .select(`
          *,
          quote_items (*)
        `)
        .eq('supplier_scope', 'local')
        .eq('supplier_id', user.supplierId)
        .in('status', ['sent', 'receiving'])
        .order('created_at', { ascending: false });

      if (localQuotesError) {
        console.error('❌ Error fetching local quotes:', localQuotesError);
        // Don't throw here - this is optional data
      } else {
        console.log('📋 Local quotes found:', localQuotes?.length || 0);
      }

      // Combine and deduplicate quotes
      const allQuotes = [...quotesData, ...(globalQuotes || []), ...(localQuotes || [])];
      const uniqueQuotes = allQuotes.reduce((acc, quote) => {
        if (!acc.find(q => q.id === quote.id)) {
          acc.push(quote);
        }
        return acc;
      }, [] as any[]);

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
          items: (quote.quote_items || []).map((item: any) => ({
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
            status: existingResponse.status === 'pending' ? 'draft' : 'sent',
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

      // Update local state
      setSupplierQuotes(prev => prev.map(quote => 
        quote.proposal?.id === proposalId
          ? {
              ...quote,
              status: 'proposal_sent',
              sentAt: new Date().toISOString(),
              proposal: quote.proposal ? {
                ...quote.proposal,
                status: 'sent',
                sentAt: new Date().toISOString(),
              } : undefined
            }
          : quote
      ));

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

      // Update local state
      setSupplierQuotes(prev => prev.map(quote => 
        quote.id === quoteId
          ? {
              ...quote,
              attachments: [...(quote.attachments || []), attachment]
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

      // Update local state
      setSupplierQuotes(prev => prev.map(quote => 
        quote.id === quoteId
          ? {
              ...quote,
              attachments: quote.attachments?.filter(att => att.id !== attachmentId) || []
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
    if (user?.role === 'supplier') {
      fetchSupplierQuotes();
    }
  }, [user?.role, user?.supplierId]); // Only depend on primitive values to prevent infinite loops

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