import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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

      console.log('🎯 CRÍTICO: Buscando APENAS cotações direcionadas especificamente para:', user.supplierId);

      // PASSO 1: Buscar cotações através da tabela quote_suppliers (relacionamento direto)
      const { data: targetedQuotes, error: targetedError } = await supabase
        .from('quote_suppliers')
        .select(`
          quote_id,
          quotes!inner (
            id,
            title,
            description,
            status,
            client_id,
            client_name,
            total,
            items_count,
            responses_count,
            deadline,
            created_at,
            updated_at
          )
        `)
        .eq('supplier_id', user.supplierId);

      if (targetedError) {
        console.error('❌ Error fetching targeted quotes:', targetedError);
        throw targetedError;
      }

      console.log('🎯 Cotações direcionadas encontradas:', targetedQuotes?.length || 0);

      // PASSO 2: Buscar cotações onde já respondi
      const { data: supplierResponses, error: responsesError } = await supabase
        .from('quote_responses')
        .select(`
          quote_id,
          status,
          created_at,
          quotes!inner (
            id,
            title,
            description,
            status,
            client_id,
            client_name,
            total,
            items_count,
            responses_count,
            deadline,
            created_at,
            updated_at
          )
        `)
        .eq('supplier_id', user.supplierId);

      if (responsesError) {
        console.error('❌ Error fetching responded quotes:', responsesError);
        throw responsesError;
      }

      console.log('📋 Cotações com resposta encontradas:', supplierResponses?.length || 0);

      // Combinar e remover duplicatas
      const quotesMap = new Map<string, any>();
      const responsesMap = new Map<string, any>();
      
      // Adicionar cotações direcionadas
      targetedQuotes?.forEach(item => {
        if (item.quotes) {
          quotesMap.set(item.quotes.id, item.quotes);
        }
      });

      // Adicionar cotações respondidas e mapear respostas
      supplierResponses?.forEach(item => {
        if (item.quotes) {
          quotesMap.set(item.quotes.id, item.quotes);
          responsesMap.set(item.quote_id, {
            status: item.status,
            created_at: item.created_at
          });
        }
      });

      const uniqueQuotesArray = Array.from(quotesMap.values());
      console.log('✅ Total de cotações únicas para o fornecedor:', uniqueQuotesArray.length);

      // Transform to SupplierQuote format
      const transformedQuotes: SupplierQuote[] = uniqueQuotesArray.map(quote => {
        const response = responsesMap.get(quote.id);
        // Usar client_name da tabela quotes
        const clientName = quote.client_name || 'Cliente não informado';
        
        return {
          id: quote.id,
          title: quote.title,
          description: quote.description || '',
          client: clientName,
          clientId: quote.client_id,
          status: response ? getSupplierStatus(response.status) : 'pending',
          deadline: quote.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          estimatedValue: quote.total > 0 ? quote.total : undefined,
          createdAt: quote.created_at,
          items: [], // Will be loaded separately when needed
          sentAt: response ? response.created_at : undefined,
        };
      });

      setSupplierQuotes(transformedQuotes);
      console.log('✅ Supplier quotes set successfully:', transformedQuotes.length);

    } catch (error) {
      console.error('❌ Error in fetchSupplierQuotes:', error);
      setError('Erro ao carregar cotações');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Get quote by ID
  const getQuoteById = useCallback(async (quoteId: string) => {
    try {
      const { data: quote, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (error) {
        console.error('Error fetching quote by ID:', error);
        return null;
      }

      return quote;
    } catch (error) {
      console.error('Error in getQuoteById:', error);
      return null;
    }
  }, []);

  // Get quote items
  const getQuoteItems = useCallback(async (quoteId: string) => {
    try {
      const { data: items, error } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', quoteId);

      if (error) {
        console.error('Error fetching quote items:', error);
        return [];
      }

      return items.map(item => ({
        id: item.id,
        productName: item.product_name,
        description: `Produto: ${item.product_name}`,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        total: item.total,
      }));
    } catch (error) {
      console.error('Error in getQuoteItems:', error);
      return [];
    }
  }, []);

  // Submit quote response
  const submitQuoteResponse = useCallback(async (quoteId: string, responseData: {
    items: Array<{
      product_name: string;
      quantity: number;
      unit_price: number;
      total: number;
      notes?: string;
    }>;
    total_amount: number;
    delivery_time: number;
    payment_terms: string;
    notes?: string;
  }) => {
    if (!user?.supplierId) {
      throw new Error('Supplier ID not found');
    }

    try {
      console.log('🔍 Submitting quote response:', { quoteId, responseData });

      const { data: response, error } = await supabase
        .from('quote_responses')
        .insert({
          quote_id: quoteId,
          supplier_id: user.supplierId,
          supplier_name: user.name || 'Fornecedor',
          items: responseData.items,
          total_amount: responseData.total_amount,
          delivery_time: responseData.delivery_time,
          payment_terms: responseData.payment_terms,
          notes: responseData.notes,
          status: 'sent'
        })
        .select()
        .single();

      if (error) {
        console.error('Error submitting quote response:', error);
        throw error;
      }

      console.log('✅ Quote response submitted successfully');
      
      // Criar notificação para o cliente sobre nova proposta
      try {
        const { data: quoteData } = await supabase
          .from('quotes')
          .select('client_id')
          .eq('id', quoteId)
          .single();

        if (quoteData?.client_id) {
          await supabase.functions.invoke('create-notification', {
            body: {
              client_id: quoteData.client_id,
              notify_all_client_users: true,
              title: 'Nova Proposta Recebida',
              message: `${user.name || 'Fornecedor'} enviou uma proposta de R$ ${responseData.total_amount.toFixed(2)} para a cotação #${quoteId}`,
              type: 'proposal',
              priority: 'high',
              action_url: '/quotes',
              metadata: {
                quote_id: quoteId,
                supplier_name: user.name || 'Fornecedor',
                total_amount: responseData.total_amount
              }
            }
          });
        }
      } catch (notificationError) {
        console.error('⚠️ Error creating proposal notification (non-critical):', notificationError);
      }
      
      // Refresh quotes to update status
      await fetchSupplierQuotes();
      
      toast({
        title: "Proposta Enviada",
        description: "Sua proposta foi enviada com sucesso!",
      });

      return response;
    } catch (error) {
      console.error('Error in submitQuoteResponse:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar proposta. Tente novamente.",
        variant: "destructive",
      });
      throw error;
    }
  }, [user, fetchSupplierQuotes, toast]);

  // Create proposal (compatibility)
  const createProposal = useCallback(async (quoteId: string, proposalData: Omit<QuoteProposal, 'id' | 'quoteId' | 'supplierId' | 'createdAt' | 'status'>) => {
    if (!user?.supplierId) {
      throw new Error('Supplier ID not found');
    }

    const newProposal: QuoteProposal = {
      ...proposalData,
      id: crypto.randomUUID(),
      quoteId,
      supplierId: user.supplierId,
      status: 'draft',
      createdAt: new Date().toISOString(),
    };

    setProposals(prev => [newProposal, ...prev]);
    return newProposal;
  }, [user?.supplierId]);

  // Update proposal (compatibility)
  const updateProposal = useCallback((proposalId: string, updates: Partial<QuoteProposal>) => {
    setProposals(prev => prev.map(proposal =>
      proposal.id === proposalId
        ? { ...proposal, ...updates }
        : proposal
    ));
  }, []);

  // Send proposal (compatibility)
  const sendProposal = useCallback(async (proposalId: string) => {
    const proposal = proposals.find(p => p.id === proposalId);
    if (!proposal) return;

    try {
      await submitQuoteResponse(proposal.quoteId, {
        items: proposal.items.map(item => ({
          product_name: item.productName,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total: item.total,
          notes: item.specifications
        })),
        total_amount: proposal.totalValue,
        delivery_time: proposal.deliveryTime,
        payment_terms: proposal.paymentTerms,
        notes: proposal.observations
      });

      updateProposal(proposalId, {
        status: 'sent',
        sentAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error sending proposal:', error);
      throw error;
    }
  }, [proposals, submitQuoteResponse, updateProposal]);

  // Add attachment (real upload to Supabase Storage)
  const addAttachment = useCallback(async (quoteId: string, file: File) => {
    if (!user?.supplierId) {
      throw new Error('Supplier ID not found');
    }

    try {
      const attachmentId = crypto.randomUUID();
      const fileName = `${user.supplierId}/${quoteId}/${attachmentId}_${file.name}`;
      
      console.log('📎 Uploading attachment:', fileName);

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Error uploading file:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(fileName);

      console.log('✅ File uploaded successfully:', publicUrl);

      const attachment: QuoteAttachment = {
        id: attachmentId,
        name: file.name,
        size: file.size,
        type: file.type,
        url: publicUrl,
        uploadedAt: new Date().toISOString(),
      };

      return attachment;
    } catch (error) {
      console.error('Error in addAttachment:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível anexar o arquivo. Tente novamente.",
        variant: "destructive",
      });
      throw error;
    }
  }, [user?.supplierId, toast]);

  // Remove attachment (compatibility)
  const removeAttachment = useCallback((quoteId: string, attachmentId: string) => {
    // This is a placeholder for compatibility
    console.log('Remove attachment:', quoteId, attachmentId);
  }, []);

  // Load quotes on mount
  useEffect(() => {
    fetchSupplierQuotes();
  }, [fetchSupplierQuotes]);

  return {
    supplierQuotes,
    proposals,
    isLoading,
    error,
    getQuoteById,
    getQuoteItems,
    submitQuoteResponse,
    createProposal,
    updateProposal,
    sendProposal,
    addAttachment,
    removeAttachment,
    refetch: fetchSupplierQuotes,
  };
};