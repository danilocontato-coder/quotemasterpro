import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendQuoteRequest {
  quote_id: string;
  supplier_ids?: string[];
  send_whatsapp: boolean;
  send_email: boolean;
  custom_message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Send quote to suppliers function called');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { quote_id, supplier_ids, send_whatsapp, send_email, custom_message }: SendQuoteRequest = await req.json();

    console.log('Processing quote:', quote_id);

    // Get quote details with items
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        quote_items (*)
      `)
      .eq('id', quote_id)
      .single();

    if (quoteError || !quote) {
      console.error('Quote not found:', quoteError);
      return new Response(
        JSON.stringify({ error: 'Cotação não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get suppliers - either specific ones or all active suppliers
    let suppliersQuery = supabase
      .from('suppliers')
      .select('*')
      .eq('status', 'active');

    if (supplier_ids && supplier_ids.length > 0) {
      suppliersQuery = suppliersQuery.in('id', supplier_ids);
    }

    const { data: suppliers, error: suppliersError } = await suppliersQuery;

    if (suppliersError || !suppliers || suppliers.length === 0) {
      console.error('No suppliers found:', suppliersError);
      return new Response(
        JSON.stringify({ error: 'Nenhum fornecedor encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client info
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', quote.client_id)
      .single();

    if (clientError || !client) {
      console.error('Client not found:', clientError);
      return new Response(
        JSON.stringify({ error: 'Cliente não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare data for N8N
    const n8nPayload = {
      quote: {
        id: quote.id,
        title: quote.title,
        description: quote.description,
        total: quote.total,
        deadline: quote.deadline,
        created_at: quote.created_at,
        items: quote.quote_items?.map((item: any) => ({
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total
        })) || []
      },
      client: {
        name: client.name,
        email: client.email,
        phone: client.phone,
        cnpj: client.cnpj
      },
      suppliers: suppliers.map(supplier => ({
        id: supplier.id,
        name: supplier.name,
        email: supplier.email,
        phone: supplier.phone,
        whatsapp: supplier.whatsapp
      })),
      settings: {
        send_whatsapp,
        send_email,
        custom_message: custom_message || `Nova cotação disponível: ${quote.title}`
      },
      timestamp: new Date().toISOString(),
      platform: 'QuoteMaster Pro'
    };

    console.log('Sending to N8N:', { quote_id, suppliers_count: suppliers.length });

    // Resolve N8N webhook URL from DB integration (per client) or fallback to env
    let n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL') || '';

    const { data: n8nIntegration, error: n8nError } = await supabase
      .from('integrations')
      .select('configuration')
      .eq('integration_type', 'n8n_webhook')
      .eq('active', true)
      .eq('client_id', quote.client_id)
      .maybeSingle();

    let configuredUrl = n8nIntegration?.configuration?.webhook_url;
    if (!(configuredUrl && typeof configuredUrl === 'string' && configuredUrl.length > 0)) {
      const { data: globalN8n, error: globalErr } = await supabase
        .from('integrations')
        .select('configuration')
        .eq('integration_type', 'n8n_webhook')
        .eq('active', true)
        .is('client_id', null)
        .maybeSingle();
      if (globalErr) console.warn('Failed to load global n8n integration:', globalErr);
      configuredUrl = globalN8n?.configuration?.webhook_url;
    }

    if (configuredUrl && typeof configuredUrl === 'string' && configuredUrl.length > 0) {
      n8nWebhookUrl = configuredUrl;
    }

    console.log('Resolved N8N webhook URL:', n8nWebhookUrl);

    if (!n8nWebhookUrl) {
      console.error('N8N webhook URL not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook N8N não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(n8nPayload),
    });

    if (!n8nResponse.ok) {
      console.error('N8N webhook failed:', n8nResponse.status, await n8nResponse.text());
      return new Response(
        JSON.stringify({ error: 'Falha ao enviar para N8N' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the activity
    const { error: logError } = await supabase
      .from('audit_logs')
      .insert({
        user_id: quote.created_by,
        action: 'QUOTE_SENT_TO_SUPPLIERS',
        entity_type: 'quotes',
        entity_id: quote_id,
        details: {
          suppliers_count: suppliers.length,
          send_whatsapp,
          send_email,
          supplier_names: suppliers.map(s => s.name)
        }
      });

    if (logError) {
      console.warn('Failed to log activity:', logError);
    }

    console.log('Quote sent successfully to N8N');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Cotação enviada para ${suppliers.length} fornecedor(es)`,
        suppliers_contacted: suppliers.length,
        webhook_url_used: n8nWebhookUrl
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in send-quote-to-suppliers function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno do servidor' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);