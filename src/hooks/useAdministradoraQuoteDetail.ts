import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdministradoraQuoteDetail, QuoteItem, QuoteProposal } from '@/types/administradoraQuotes';

export const useAdministradoraQuoteDetail = (quoteId?: string) => {
  const [quote, setQuote] = useState<AdministradoraQuoteDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuoteDetail = useCallback(async () => {
    if (!quoteId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 Fetching administradora quote detail for:', quoteId);

      // Fetch quote with complete data
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (quoteError) throw quoteError;

      // Use client_name from quotes table (already populated)
      const clientName = quoteData.client_name || 'Cliente';
      
      // For on_behalf_of_client, we need to fetch separately if there's an ID
      let onBehalfOfClientName: string | undefined;
      if (quoteData.on_behalf_of_client_id) {
        // Try to fetch from clients table (might be named clients, not clients_condos)
        const { data: onBehalfData } = await supabase
          .from('clients')
          .select('name')
          .eq('id', quoteData.on_behalf_of_client_id)
          .single();
        if (onBehalfData) onBehalfOfClientName = onBehalfData.name;
      }

      // Fetch items
      const { data: itemsData, error: itemsError } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', quoteId)
        .order('product_name');

      if (itemsError) throw itemsError;

      // Fetch proposals with supplier details (only submitted proposals)
      const { data: proposalsData, error: proposalsError } = await supabase
        .from('quote_responses')
        .select(`
          *,
          suppliers (
            id,
            name,
            rating,
            is_certified,
            whatsapp,
            phone,
            status
          )
        `)
        .eq('quote_id', quoteId)
        .eq('status', 'submitted')
        .order('created_at', { ascending: false });

      if (proposalsError) throw proposalsError;

      // Fetch AI analyses for this quote
      const { data: analysesData } = await supabase
        .from('ai_proposal_analyses')
        .select('*')
        .eq('quote_id', quoteId)
        .order('created_at', { ascending: false });

      // Fetch visits if quote requires visit
      let visitsData = null;
      if (quoteData.requires_visit) {
        const { data } = await supabase
          .from('quote_visits')
          .select('*')
          .eq('quote_id', quoteId)
          .order('scheduled_date', { ascending: true });
        visitsData = data;
      }

      // Fetch audit logs
      const { data: auditLogsData } = await supabase
        .from('audit_logs')
        .select(`
          id,
          action,
          entity_type,
          entity_id,
          created_at,
          details,
          user_id,
          profiles:user_id (
            name,
            email
          )
        `)
        .eq('entity_id', quoteId)
        .eq('entity_type', 'quotes')
        .order('created_at', { ascending: false })
        .limit(50);

      // Transform items
      const items: QuoteItem[] = (itemsData || []).map(item => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price || 0,
        total: item.total || (item.quantity * (item.unit_price || 0))
      }));

      // Transform proposals
      const proposals: QuoteProposal[] = (proposalsData || []).map(p => {
        // Parse items from JSONB (convert from Json type to proper structure)
        const parsedItems = Array.isArray(p.items) 
          ? (p.items as any[]).map((item: any) => ({
              product_name: item.product_name || '',
              quantity: item.quantity || 0,
              unit_price: item.unit_price || 0,
              total: item.total || 0,
              brand: item.brand,
              specifications: item.specifications
            }))
          : [];

        return {
          id: p.id,
          supplier_id: p.supplier_id,
          supplier_name: p.supplier_name || p.suppliers?.name || 'Fornecedor',
          supplier_rating: p.suppliers?.rating,
          supplier_certified: p.suppliers?.is_certified || false,
          total_amount: p.total_amount || 0,
          delivery_time: p.delivery_time || 7,
          shipping_cost: p.shipping_cost || 0,
          warranty_months: p.warranty_months || 12,
          notes: p.notes,
          status: p.status || 'pending',
          created_at: p.created_at,
          items: parsedItems // ✅ Itens parseados da proposta
        };
      });

      // Build complete detail object
      const detail: AdministradoraQuoteDetail = {
        id: quoteData.id,
        title: quoteData.title,
        description: quoteData.description,
        status: quoteData.status,
        client_id: quoteData.client_id,
        client_name: clientName,
        on_behalf_of_client_id: quoteData.on_behalf_of_client_id,
        on_behalf_of_client_name: onBehalfOfClientName,
        supplier_id: quoteData.supplier_id,
        supplier_name: quoteData.supplier_name,
        total: quoteData.total || 0,
        items_count: items.length,
        responses_count: proposals.length,
        deadline: quoteData.deadline,
        created_at: quoteData.created_at,
        updated_at: quoteData.updated_at,
        requires_visit: quoteData.requires_visit || false,
        visit_deadline: quoteData.visit_deadline,
        advance_payment_required: quoteData.advance_payment_required || false,
        advance_payment_percentage: quoteData.advance_payment_percentage,
        local_code: quoteData.local_code,
        items,
        proposals,
        visits: visitsData || [],
        analyses: analysesData || []
      };

      console.log('✅ Quote detail loaded:', {
        id: detail.id,
        title: detail.title,
        items: items.length,
        proposals: proposals.length,
        analyses: (analysesData || []).length,
        visits: (visitsData || []).length
      });

      setQuote(detail);
    } catch (err: any) {
      console.error('❌ Error fetching quote detail:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    fetchQuoteDetail();

    // Setup realtime subscription for updates
    if (!quoteId) return;

    const channel = supabase
      .channel(`administradora-quote-${quoteId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'quotes',
        filter: `id=eq.${quoteId}`
      }, () => {
        console.log('📡 Quote updated, refetching...');
        fetchQuoteDetail();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'quote_responses',
        filter: `quote_id=eq.${quoteId}`
      }, () => {
        console.log('📡 New proposal received, refetching...');
        fetchQuoteDetail();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ai_proposal_analyses',
        filter: `quote_id=eq.${quoteId}`
      }, () => {
        console.log('📡 New AI analysis, refetching...');
        fetchQuoteDetail();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [quoteId, fetchQuoteDetail]);

  return {
    quote,
    isLoading,
    error,
    refetch: fetchQuoteDetail,
  };
};
