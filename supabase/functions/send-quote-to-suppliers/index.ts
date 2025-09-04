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
  send_via?: 'n8n' | 'direct';
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

    const { quote_id, supplier_ids, send_whatsapp, send_email, custom_message, send_via = 'n8n' }: SendQuoteRequest = await req.json();

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

    // Load Evolution API integration (client-specific, fallback to global)
    let evolutionInstance: string | null = null;
    let evolutionApiUrl: string | null = null;
    let evolutionToken: string | null = null;

    const { data: evoClientInt } = await supabase
      .from('integrations')
      .select('configuration')
      .eq('integration_type', 'whatsapp_evolution')
      .eq('active', true)
      .eq('client_id', quote.client_id)
      .maybeSingle();

    let evoCfg: any = evoClientInt?.configuration || null;
    if (!evoCfg) {
      const { data: evoGlobalInt } = await supabase
        .from('integrations')
        .select('configuration')
        .eq('integration_type', 'whatsapp_evolution')
        .eq('active', true)
        .is('client_id', null)
        .maybeSingle();
      evoCfg = evoGlobalInt?.configuration || null;
    }

    try {
      if (evoCfg) {
        evolutionInstance = (evoCfg.instance ?? evoCfg['evolution_instance']) || null;
        evolutionApiUrl = (evoCfg.api_url ?? evoCfg['evolution_api_url']) || null;
        evolutionToken = (evoCfg.token ?? evoCfg['evolution_token']) || null;
      }
    } catch {}

    if (!evolutionApiUrl) {
      evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL') || null;
    }
    if (!evolutionToken) {
      evolutionToken = Deno.env.get('EVOLUTION_API_TOKEN') || null;
    }

    // Load WhatsApp template
    let whatsappTemplate = null;
    
    // Try to find client-specific template first
    const { data: clientTemplate } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('template_type', 'quote_request')
      .eq('active', true)
      .eq('client_id', quote.client_id)
      .maybeSingle();

    if (clientTemplate) {
      whatsappTemplate = clientTemplate;
    } else {
      // Fallback to global template
      const { data: globalTemplate } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('template_type', 'quote_request')
        .eq('active', true)
        .eq('is_global', true)
        .maybeSingle();
      
      whatsappTemplate = globalTemplate;
    }

    // Format deadline
    const deadlineFormatted = quote.deadline 
      ? new Date(quote.deadline).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'Não definido';

    // Format total
    const totalFormatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(quote.total || 0);

    // Format items list
    const itemsList = quote.quote_items?.map((item: any) => {
      const itemTotal = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(item.total || 0);
      
      return `• ${item.product_name} - Qtd: ${item.quantity} - Valor: ${itemTotal}`;
    }).join('\n') || 'Nenhum item especificado';

    // Generate proposal link (placeholder for now)
    const proposalLink = `${Deno.env.get('SUPABASE_URL')}/supplier/quotes/${quote.id}/proposal`;

    // Build variables for template rendering on n8n side
    const templateVariables = {
      client_name: client.name,
      client_email: client.email || 'Não informado',
      client_phone: client.phone || '',
      quote_title: quote.title,
      quote_id: quote.id,
      deadline_formatted: deadlineFormatted,
      total_formatted: totalFormatted,
      items_list: itemsList,
      items_count: String(quote.quote_items?.length || 0),
      proposal_link: proposalLink,
    };

    // Prepare suppliers (no pre-rendered message; rendering will happen in n8n)
    const suppliersClean = suppliers.map((supplier: any) => ({
      id: supplier.id,
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      whatsapp: supplier.whatsapp,
    }));

    const n8nPayload: any = {
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
      suppliers: suppliersClean,
      settings: {
        send_whatsapp,
        send_email,
        custom_message: custom_message || null,
        whatsapp_provider: evolutionInstance ? 'evolution_api' : 'default',
        evolution: evolutionInstance ? { 
          instance: evolutionInstance, 
          api_url: evolutionApiUrl,
          token: evolutionToken
        } : null
      },
      template_data: whatsappTemplate ? {
        template_name: whatsappTemplate.name,
        subject: whatsappTemplate.subject,
        message: whatsappTemplate.message_content,
        variables: templateVariables,
        items: quote.quote_items?.map((item: any) => ({
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total
        })) || []
      } : null,
      timestamp: new Date().toISOString(),
      platform: 'QuoteMaster Pro'
    };

    console.log(`Processing via ${send_via}:`, { quote_id, suppliers_count: suppliers.length });

    // Check if sending directly via Evolution API
    if (send_via === 'direct' && send_whatsapp && evolutionApiUrl && evolutionToken) {
      return await handleDirectEvolutionSending();
    }
    
    // Fallback to N8N integration
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
    let configuredHeaders: Record<string, string> | null = null;
    let configuredSecret: string | null = null;
    let configuredAuthHeader: string | null = null;

    // Attempt to read optional headers and auth from configuration
    try {
      const cfg = n8nIntegration?.configuration || {};
      configuredSecret = cfg.webhook_secret || null;
      configuredAuthHeader = cfg.auth_header || null;
      if (cfg.headers) {
        configuredHeaders = typeof cfg.headers === 'string' ? JSON.parse(cfg.headers) : cfg.headers;
      }
    } catch (e) {
      console.warn('Failed to parse N8N headers from configuration');
    }

    if (!(configuredUrl && typeof configuredUrl === 'string' && configuredUrl.length > 0)) {
      const { data: globalN8n, error: globalErr } = await supabase
        .from('integrations')
        .select('configuration')
        .eq('integration_type', 'n8n_webhook')
        .eq('active', true)
        .is('client_id', null)
        .maybeSingle();
      if (globalErr) console.warn('Failed to load global n8n integration:', globalErr);
      const cfg = globalN8n?.configuration || {};
      configuredUrl = cfg.webhook_url;
      configuredSecret = configuredSecret || cfg.webhook_secret || null;
      configuredAuthHeader = configuredAuthHeader || cfg.auth_header || null;
      if (!configuredHeaders && cfg.headers) {
        try { configuredHeaders = typeof cfg.headers === 'string' ? JSON.parse(cfg.headers) : cfg.headers; } catch {}
      }
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

    // Build headers with optional configuration
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (configuredHeaders) {
      try { Object.assign(requestHeaders, configuredHeaders); } catch {}
    }
    if (configuredSecret) {
      requestHeaders['X-Webhook-Secret'] = String(configuredSecret);
    }
    if (configuredAuthHeader) {
      requestHeaders['Authorization'] = String(configuredAuthHeader);
    }
    if (evolutionInstance) {
      requestHeaders['X-Evolution-Instance'] = String(evolutionInstance);
    }

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(n8nPayload),
    });

    if (!n8nResponse.ok) {
      const respText = await n8nResponse.text();

      // Attempt fallback: toggle between /webhook-test/ and /webhook/
      let fallbackTried = false;
      let fallbackOk = false;
      let fallbackStatus = 0;
      let fallbackRespText = '';
      let fallbackUrl = n8nWebhookUrl;

      if (n8nResponse.status === 404) {
        if (n8nWebhookUrl.includes('/webhook-test/')) {
          fallbackUrl = n8nWebhookUrl.replace('/webhook-test/', '/webhook/');
          fallbackTried = true;
        } else if (n8nWebhookUrl.includes('/webhook/')) {
          fallbackUrl = n8nWebhookUrl.replace('/webhook/', '/webhook-test/');
          fallbackTried = true;
        }

        if (fallbackTried && fallbackUrl !== n8nWebhookUrl) {
          console.warn('N8N webhook 404, trying fallback URL:', fallbackUrl);
          const fb = await fetch(fallbackUrl, {
            method: 'POST',
            headers: requestHeaders,
            body: JSON.stringify(n8nPayload),
          });
          fallbackStatus = fb.status;
          fallbackOk = fb.ok;
          if (!fb.ok) fallbackRespText = await fb.text();

          if (fb.ok) {
            // Use fallback as the effective URL
            n8nWebhookUrl = fallbackUrl;
          }
        }
      }

      if (!fallbackOk) {
        console.error('N8N webhook failed:', n8nResponse.status, respText);
        return new Response(
          JSON.stringify({ 
            error: 'Falha ao enviar para N8N', 
            details: { 
              status: n8nResponse.status, 
              response: respText, 
              webhook_url_used: n8nWebhookUrl,
              fallback_tried: fallbackTried,
              fallback_url: fallbackTried ? fallbackUrl : undefined,
              fallback_status: fallbackTried ? fallbackStatus : undefined,
              fallback_response: fallbackTried ? fallbackRespText : undefined
            }
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // If we reach here, the N8N webhook was successful
    // Update quote status to 'sent' using EdgeRuntime.waitUntil for background processing
    EdgeRuntime.waitUntil((async () => {
      try {
        const { error: statusError } = await supabase
          .from('quotes')
          .update({ 
            status: 'sent',
            suppliers_sent_count: suppliers.length,
            updated_at: new Date().toISOString()
          })
          .eq('id', quote_id);

        if (statusError) {
          console.error('Failed to update quote status:', statusError);
        } else {
          console.log(`Quote ${quote_id} status updated to 'sent'`);
        }
      } catch (error) {
        console.error('Error updating quote status:', error);
      }
    })());

    // Log the activity (also in background)
    EdgeRuntime.waitUntil((async () => {
      try {
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
              supplier_names: suppliers.map(s => s.name),
              webhook_url_used: n8nWebhookUrl
            }
          });

        if (logError) {
          console.warn('Failed to log activity:', logError);
        }
      } catch (error) {
        console.error('Error logging activity:', error);
      }
    })());

    console.log('Quote sent successfully to N8N');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Cotação enviada para ${suppliers.length} fornecedor(es) e status atualizado para 'enviado'`,
        suppliers_contacted: suppliers.length,
        webhook_url_used: n8nWebhookUrl,
        quote_status_updated: true
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

  // Handle direct Evolution API sending
  async function handleDirectEvolutionSending() {
    console.log('Sending directly via Evolution API');
    
    try {
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Render template message
      let finalMessage = whatsappTemplate?.message_content || 'Nova cotação disponível: {{quote_title}}';
      
      // Replace template variables
      Object.entries(templateVariables).forEach(([key, value]) => {
        finalMessage = finalMessage.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      });

      // Add custom message if provided
      if (custom_message?.trim()) {
        finalMessage = `${custom_message.trim()}\n\n${finalMessage}`;
      }

      console.log('Template rendered:', finalMessage.substring(0, 100) + '...');

      // Send to each supplier
      for (const supplier of suppliers) {
        if (!supplier.whatsapp && !supplier.phone) {
          console.warn(`Supplier ${supplier.name} has no WhatsApp/phone number`);
          errorCount++;
          errors.push(`${supplier.name}: sem WhatsApp/telefone`);
          continue;
        }

        // Normalize phone number (remove non-digits, ensure country code)
        const phone = supplier.whatsapp || supplier.phone || '';
        const normalizedPhone = phone.replace(/[^0-9]/g, '');
        const finalPhone = normalizedPhone.startsWith('55') ? normalizedPhone : `55${normalizedPhone}`;

        if (finalPhone.length < 12) {
          console.warn(`Invalid phone number for supplier ${supplier.name}: ${phone}`);
          errorCount++;
          errors.push(`${supplier.name}: número inválido (${phone})`);
          continue;
        }

        try {
          // Send via Evolution API
          const evolutionResponse = await fetch(`${evolutionApiUrl}/message/sendText/${evolutionInstance}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': evolutionToken,
            },
            body: JSON.stringify({
              number: finalPhone,
              text: finalMessage,
            }),
          });

          if (!evolutionResponse.ok) {
            const errorText = await evolutionResponse.text();
            console.error(`Evolution API error for ${supplier.name}:`, evolutionResponse.status, errorText);
            errorCount++;
            errors.push(`${supplier.name}: ${evolutionResponse.status} - ${errorText.substring(0, 100)}`);
            continue;
          }

          const responseData = await evolutionResponse.json();
          console.log(`Message sent to ${supplier.name} (${finalPhone}):`, responseData);
          successCount++;

        } catch (error: any) {
          console.error(`Error sending to ${supplier.name}:`, error);
          errorCount++;
          errors.push(`${supplier.name}: ${error.message}`);
        }
      }

      console.log(`Direct Evolution sending completed: ${successCount} success, ${errorCount} errors`);

      // Update quote status in background
      EdgeRuntime.waitUntil((async () => {
        try {
          const { error: statusError } = await supabase
            .from('quotes')
            .update({ 
              status: 'sent',
              suppliers_sent_count: successCount,
              updated_at: new Date().toISOString()
            })
            .eq('id', quote_id);

          if (statusError) {
            console.error('Failed to update quote status:', statusError);
          } else {
            console.log(`Quote ${quote_id} status updated to 'sent'`);
          }
        } catch (error) {
          console.error('Error updating quote status:', error);
        }
      })());

      // Log the activity in background
      EdgeRuntime.waitUntil((async () => {
        try {
          const { error: logError } = await supabase
            .from('audit_logs')
            .insert({
              user_id: quote.created_by,
              action: 'QUOTE_SENT_TO_SUPPLIERS_DIRECT',
              entity_type: 'quotes',
              entity_id: quote_id,
              details: {
                suppliers_total: suppliers.length,
                suppliers_success: successCount,
                suppliers_errors: errorCount,
                send_method: 'evolution_direct',
                evolution_instance: evolutionInstance,
                errors: errors.length > 0 ? errors : undefined
              }
            });

          if (logError) {
            console.warn('Failed to log activity:', logError);
          }
        } catch (error) {
          console.error('Error logging activity:', error);
        }
      })());

      const responseMessage = successCount > 0 
        ? `Cotação enviada com sucesso para ${successCount} fornecedor(es)${errorCount > 0 ? `. ${errorCount} erro(s) encontrado(s)` : ''}`
        : `Falha ao enviar para todos os fornecedores (${errorCount} erro(s))`;

      return new Response(
        JSON.stringify({ 
          success: successCount > 0, 
          message: responseMessage,
          suppliers_contacted: successCount,
          suppliers_total: suppliers.length,
          errors: errorCount > 0 ? errors : undefined,
          send_method: 'evolution_direct',
          quote_status_updated: true
        }),
        {
          status: successCount > 0 ? 200 : 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );

    } catch (error: any) {
      console.error('Error in direct Evolution sending:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao enviar via Evolution API', 
          details: error.message 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  }
};

serve(handler);