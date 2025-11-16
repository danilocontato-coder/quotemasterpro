import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SupplierQuote {
  id: string;
  local_code?: string;
  title: string;
  description: string;
  client: string;
  clientId: string;
  clientName?: string;
  supplierId?: string;
  status: 'pending' | 'proposal_sent' | 'approved' | 'rejected' | 'expired' | 'paid' | 'delivering' | 'awaiting_visit' | 'visit_scheduled' | 'visit_confirmed' | 'visit_overdue';
  deadline: string;
  estimatedValue?: number;
  sentAt?: string;
  createdAt: string;
  items: SupplierQuoteItem[];
  attachments?: QuoteAttachment[];
  proposal?: QuoteProposal;
  requires_visit?: boolean;
  visit_deadline?: string;
  client_name?: string;
  supplierCount?: number; // Número de fornecedores convidados para esta cotação
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
  shippingCost?: number;
  warrantyMonths?: number;
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

const getSupplierStatus = (quoteStatus: string, responseStatus?: string): SupplierQuote['status'] => {
  // Se a cotação está paga, retornar 'paid'
  if (quoteStatus === 'paid') {
    return 'paid';
  }
  
  // Se a cotação está aprovada, retornar 'approved'
  if (quoteStatus === 'approved') {
    return 'approved';
  }
  
  // Se há resposta do fornecedor, usar o status da resposta
  if (responseStatus) {
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
  }
  
  // Caso contrário, usar o status da cotação principal
  switch (quoteStatus) {
    case 'sent':
    case 'receiving':
      return 'pending';
    case 'received':
      return 'proposal_sent';
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
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

      console.log('🎯 Buscando cotações para fornecedor:', {
        supplierId: user.supplierId,
        email: user.email,
        onboardingCompleted: user.onboardingCompleted
      });

      // PASSO 1: Buscar cotações através da tabela quote_suppliers (relacionamento direto)
      const { data: targetedQuotes, error: targetedError } = await supabase
        .from('quote_suppliers')
        .select(`
          quote_id,
          quotes!inner (
            id,
            local_code,
            title,
            description,
            status,
            client_id,
            client_name,
            total,
            items_count,
            responses_count,
            deadline,
            requires_visit,
            visit_deadline,
            created_at,
            updated_at
          )
        `)
        .eq('supplier_id', user.supplierId);

      if (targetedError) {
        console.error('❌ Erro ao buscar cotações direcionadas:', targetedError);
        throw targetedError;
      }

      console.log('📋 Resultados quote_suppliers:', {
        found: targetedQuotes?.length || 0,
        quoteIds: targetedQuotes?.map(q => q.quote_id)
      });

      // PASSO 2: Buscar cotações onde já respondi
      const { data: supplierResponses, error: responsesError } = await supabase
        .from('quote_responses')
        .select(`
          quote_id,
          status,
          created_at,
          quotes!inner (
            id,
            local_code,
            title,
            description,
            status,
            client_id,
            client_name,
            total,
            items_count,
            responses_count,
            deadline,
            requires_visit,
            visit_deadline,
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

      // PASSO 3: Buscar contagem de fornecedores para cada cotação
      const quoteIds = uniqueQuotesArray.map(q => q.id);
      const { data: supplierCounts, error: countsError } = await supabase
        .from('quote_suppliers')
        .select('quote_id')
        .in('quote_id', quoteIds);

      if (countsError) {
        console.error('⚠️ Erro ao buscar contagem de fornecedores:', countsError);
      }

      // Criar mapa de contagem de fornecedores por cotação
      const supplierCountMap = new Map<string, number>();
      supplierCounts?.forEach(item => {
        const currentCount = supplierCountMap.get(item.quote_id) || 0;
        supplierCountMap.set(item.quote_id, currentCount + 1);
      });

      // Transform to SupplierQuote format
      const transformedQuotes: SupplierQuote[] = uniqueQuotesArray.map(quote => {
        const response = responsesMap.get(quote.id);
        // Usar client_name da tabela quotes
        const clientName = quote.client_name || 'Cliente não informado';
        
        return {
          id: quote.id,
          local_code: quote.local_code,
          title: quote.title,
          description: quote.description || '',
          client: clientName,
          clientId: quote.client_id,
          clientName: clientName,
          supplierId: user.supplierId, // ID do fornecedor logado
          client_name: clientName, // Adicionar para uso no modal
          status: getSupplierStatus(quote.status, response?.status),
          deadline: quote.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          estimatedValue: quote.total > 0 ? quote.total : undefined,
          createdAt: quote.created_at,
          items: [], // Will be loaded separately when needed
          sentAt: response ? response.created_at : undefined,
          requires_visit: quote.requires_visit || false,
          visit_deadline: quote.visit_deadline,
          supplierCount: supplierCountMap.get(quote.id) || 1, // Número de fornecedores convidados
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
    shipping_cost?: number;
    warranty_months?: number;
    payment_terms: string;
    notes?: string;
  }) => {
    if (!user?.supplierId) {
      throw new Error('Supplier ID not found');
    }

    try {
      console.log('🔍 Submitting quote response:', { quoteId, responseData });

      // 🔄 PHASE 3: Retry automático para INSERT com exponential backoff
      const maxRetries = 3;
      let lastError: any = null;
      let response: any = null;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`🔄 [PHASE 3] INSERT attempt ${attempt}/${maxRetries}`);
        
        const { data, error } = await supabase
          .from('quote_responses')
          .insert({
            quote_id: quoteId,
            supplier_id: user.supplierId,
            supplier_name: user.name || 'Fornecedor',
            items: responseData.items,
            total_amount: responseData.total_amount,
            delivery_time: responseData.delivery_time,
            shipping_cost: responseData.shipping_cost || 0,
            warranty_months: responseData.warranty_months || 12,
            payment_terms: responseData.payment_terms,
            notes: responseData.notes,
            status: 'sent'
          })
          .select()
          .single();
        
        if (!error && data) {
          response = data;
          console.log(`✅ [PHASE 3] INSERT succeeded on attempt ${attempt}`);
          break;
        }
        
        lastError = error;
        console.error(`❌ [PHASE 3] INSERT failed on attempt ${attempt}:`, error);
        
        // Se não é a última tentativa, aguarda antes de tentar novamente
        if (attempt < maxRetries) {
          const backoffMs = Math.pow(2, attempt) * 500; // 1s, 2s, 4s
          console.log(`⏳ [PHASE 3] Waiting ${backoffMs}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }

      if (lastError && !response) {
        console.error('❌ [PHASE 1] Error submitting quote response after retries:', lastError);
        throw lastError;
      }

      // 🔒 PHASE 1: Validação Crítica - Verificar se INSERT foi bem-sucedido
      if (!response || !response.id) {
        const criticalError = new Error('INSERT falhou silenciosamente - response.id não existe');
        console.error('❌ [PHASE 1] CRITICAL:', criticalError, {
          quoteId,
          supplierId: user.supplierId,
          responseData: {
            ...responseData,
            items: `${responseData.items?.length || 0} itens`
          }
        });
        
        toast({
          title: "Erro Crítico",
          description: "Falha ao salvar proposta. Por favor, tente novamente ou contate o suporte.",
          variant: "destructive",
        });
        
        throw criticalError;
      }

      console.log('✅ [PHASE 1] Quote response submitted successfully:', response.id);
      
      // 📢 PHASE 2: Notificação WhatsApp com feedback diferenciado
      let notificationSuccess = false;
      try {
        const notifyResult = await supabase.functions.invoke('notify-client-proposal', {
          body: {
            quoteId: quoteId,
            supplierId: user.supplierId,
            supplierName: user.name || 'Fornecedor',
            totalValue: responseData.total_amount,
            responseId: response.id // PHASE 3: Enviar responseId para validação
          }
        });
        
        if (notifyResult.error) {
          throw notifyResult.error;
        }
        
        notificationSuccess = notifyResult.data?.whatsappSent === true;
        console.log('✅ [PHASE 2] Client notification sent:', { whatsappSent: notificationSuccess });
        
      } catch (notificationError) {
        console.error('⚠️ [PHASE 2] Error sending client notification (non-critical):', notificationError);
      }
      
      // Refresh quotes to update status
      await fetchSupplierQuotes();
      
      // 🎯 PHASE 2: Feedback diferenciado baseado no resultado da notificação
      if (notificationSuccess) {
        toast({
          title: "✅ Proposta Enviada",
          description: "Cliente notificado por WhatsApp com sucesso!",
        });
      } else {
        toast({
          title: "✅ Proposta Enviada",
          description: "Proposta salva! O cliente verá no painel (notificação WhatsApp indisponível).",
        });
      }

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
      
      // Normalizar nome do arquivo removendo caracteres especiais
      const normalizedFileName = file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-zA-Z0-9._-]/g, '_') // Substitui caracteres especiais por underscore
        .replace(/_{2,}/g, '_'); // Remove underscores múltiplos
      
      const fileName = `${user.supplierId}/${quoteId}/${attachmentId}_${normalizedFileName}`;
      
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
    
    // Subscribe to real-time quote updates
    const channel = supabase
      .channel('supplier-quotes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'quotes',
          filter: 'status=eq.paid'
        },
        (payload) => {
          console.log('Quote payment confirmed:', payload);
          // Refetch quotes when payment is confirmed
          fetchSupplierQuotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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