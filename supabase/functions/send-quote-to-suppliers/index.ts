import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { resolveEvolutionConfig, normalizePhone, sendEvolutionWhatsApp } from '../_shared/evolution.ts';
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
  supplier_links?: { supplier_id: string; link: string; token?: string }[];
  frontend_base_url?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Send quote to suppliers function called');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Expose resolved Evolution config to all branches (including helper function)
  let resolvedEvolution: any = null;

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { quote_id, supplier_ids, send_whatsapp, send_email, custom_message, send_via, supplier_links, frontend_base_url }: SendQuoteRequest = await req.json();

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
        JSON.stringify({ success: false, error: 'Cotação não encontrada' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Load quote items explicitly (no FK required)
    const { data: quoteItems } = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', quote_id);
    const items = Array.isArray(quoteItems) ? quoteItems : [];

    // Get suppliers - filter by selected IDs or by client/global active suppliers
    let suppliersQuery = supabase
      .from('suppliers')
      .select('*')
      .eq('status', 'active')
      .or(`client_id.eq.${quote.client_id},client_id.is.null`)
      .order('type', { ascending: false }); // Certified suppliers first

    if (supplier_ids && supplier_ids.length > 0) {
      suppliersQuery = suppliersQuery.in('id', supplier_ids);
    }

    const { data: suppliers, error: suppliersError } = await suppliersQuery;

    if (suppliersError || !suppliers || suppliers.length === 0) {
      console.error('No suppliers found:', suppliersError);
      return new Response(
        JSON.stringify({ success: false, error: 'Nenhum fornecedor encontrado' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Persist supplier assignments for this quote
    try {
      const mappings = suppliers.map((s: any) => ({ quote_id: quote.id, supplier_id: s.id }));
      const { error: mapErr } = await supabase
        .from('quote_suppliers')
        .upsert(mappings, { onConflict: 'quote_id,supplier_id' });
      if (mapErr) {
        console.warn('Failed to upsert quote_suppliers mapping:', mapErr);
      } else {
        console.log(`Mapped quote ${quote.id} to ${mappings.length} supplier(s)`);
      }
    } catch (e) {
      console.warn('Error while mapping suppliers to quote:', e);
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
        JSON.stringify({ success: false, error: 'Cliente não encontrado' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Load Evolution API integration using shared resolver (client -> global -> env)
    const evo = await resolveEvolutionConfig(supabase, quote.client_id)
    const evolutionInstance: string | null = evo.instance || null;
    const evolutionApiUrl: string | null = evo.apiUrl || null;
    const evolutionToken: string | null = evo.token || null;

    resolvedEvolution = {
      instance: evolutionInstance,
      api_url_defined: Boolean(evolutionApiUrl),
      token_defined: Boolean(evolutionToken),
      source: { scope: evo.scope }
    };

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
    const itemsList = items.map((item: any) => {
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
      items_count: String(items.length || 0),
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
        items: items.map((item: any) => ({
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total
        }))
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
        items: items.map((item: any) => ({
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total
        }))
      } : null,
      timestamp: new Date().toISOString(),
      platform: 'QuoteMaster Pro',
      supplier_links: supplier_links || [],
      frontend_base_url: frontend_base_url || null
    };

    const hasEvolution = Boolean(evolutionInstance && evolutionApiUrl && evolutionToken);
    // Always prioritize direct Evolution when available and WhatsApp is selected, regardless of client hint
    const chosenMethod: 'direct' | 'n8n' = (hasEvolution && send_whatsapp) ? 'direct' : 'n8n';

    console.log('Chosen sending method:', { chosenMethod, client_hint: send_via, hasEvolution, send_whatsapp, quote_id, suppliers_count: suppliers.length });

    if (chosenMethod === 'direct') {
      return await handleDirectEvolutionSending(supabase, {
        suppliers,
        customMessage: custom_message || null,
        evolutionApiUrl: evolutionApiUrl as string,
        evolutionInstance: evolutionInstance as string,
        evolutionToken: evolutionToken as string,
        templateVariables,
        whatsappTemplate,
        templateContent: (whatsappTemplate?.message_content as string) || '',
        quoteId: quote_id,
        createdBy: quote.created_by,
        resolvedEvolution,
        supplierLinks: supplier_links || [],
        frontendBaseUrl: frontend_base_url || null
      });
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
        JSON.stringify({ success: false, error: 'Webhook N8N não configurado' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
            success: false,
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
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        quote_status_updated: true,
        send_method: 'n8n',
        resolved_evolution: resolvedEvolution
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in send-quote-to-suppliers function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Erro interno do servidor' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Handle direct Evolution API sending
  async function handleDirectEvolutionSending(
    supabase: any,
    {
      suppliers,
      customMessage,
      evolutionApiUrl,
      evolutionInstance,
      evolutionToken,
      templateVariables,
      whatsappTemplate,
      templateContent,
      quoteId,
      createdBy,
      resolvedEvolution: resolvedEvo,
      supplierLinks,
      frontendBaseUrl
    }: any
  ) {
    console.log('Sending directly via Evolution API');
    
    try {
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Render template message
      let finalMessage = whatsappTemplate?.message_content || 'Nova cotação disponível: {{quote_title}}';
      const hasItemsPlaceholder = typeof templateContent === 'string' && templateContent.includes('{{items_list}}');
      
      // Replace template variables
      Object.entries(templateVariables || {}).forEach(([key, value]) => {
        finalMessage = finalMessage.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      });

      // Ensure items breakdown is present even if template doesn't include it
      if (!hasItemsPlaceholder && templateVariables?.items_list) {
        finalMessage = `${finalMessage}\n\nItens da cotação (${templateVariables.items_count || '0'}):\n${templateVariables.items_list}`;
      }

      // Add custom message if provided
      if (customMessage?.trim()) {
        finalMessage = `${customMessage.trim()}\n\n${finalMessage}`;
      }

      console.log('Template rendered:', finalMessage.substring(0, 100) + '...');

      // Preflight: check Evolution instance connection state with multiple variants
      try {
        const base = evolutionApiUrl.replace(/\/+$/, '')
        const bases = Array.from(new Set([base, `${base}/api`]))
        const headerVariants: Record<string, string>[] = [
          { apikey: evolutionToken },
          { Authorization: `Bearer ${evolutionToken}` },
        ]
        let preflightOk = false
        let lastTxt = ''
        let lastStatus = 0
        for (const b of bases) {
          for (const headers of headerVariants) {
            const cs = await fetch(`${b}/instance/connectionState/${encodeURIComponent(evolutionInstance)}`, { headers })
            lastStatus = cs.status
            if (cs.ok) { preflightOk = true; break }
            lastTxt = await cs.text().catch(() => '')
          }
          if (preflightOk) break
        }
        if (!preflightOk) {
          return new Response(
            JSON.stringify({ success: false, error: 'Evolution API indisponível para a instância', details: { status: lastStatus, response: lastTxt }, resolved_evolution: resolvedEvo }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } catch (e: any) {
        return new Response(
          JSON.stringify({ success: false, error: 'Falha ao conectar à Evolution API', details: e.message, resolved_evolution: resolvedEvo }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Send to each supplier
      for (const supplier of suppliers) {
        if (!supplier.whatsapp && !supplier.phone) {
          console.warn(`Supplier ${supplier.name} has no WhatsApp/phone number`);
          errorCount++;
          errors.push(`${supplier.name}: sem WhatsApp/telefone`);
          continue;
        }

        // Normalize phone number and validate
        const phone = supplier.whatsapp || supplier.phone || '';
        const finalPhone = normalizePhone(phone);

        if (!finalPhone || finalPhone.length < 12) {
          console.warn(`Invalid phone number for supplier ${supplier.name}: ${phone}`);
          errorCount++;
          errors.push(`${supplier.name}: número inválido (${phone})`);
          continue;
        }

        try {
          // Compose message with per-supplier link when available
          const linkEntry = Array.isArray(supplierLinks)
            ? (supplierLinks as any[]).find((l: any) => l.supplier_id === supplier.id)
            : null;
          const textForSupplier = linkEntry?.link
            ? `${finalMessage}\n\nResponda sua proposta aqui: ${linkEntry.link}`
            : finalMessage;

          // Send via Evolution API using shared helper
          const sent = await sendEvolutionWhatsApp({ apiUrl: evolutionApiUrl, token: evolutionToken, instance: evolutionInstance, scope: 'client' }, finalPhone, textForSupplier);

          if (!sent.success) {
            console.error(`Evolution API error for ${supplier.name}:`, sent.error);
            errorCount++;
            errors.push(`${supplier.name}: ${String(sent.error).substring(0, 100)}`);
            continue;
          }

          console.log(`Message sent to ${supplier.name} (${finalPhone}) via ${sent.endpoint}`);
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
            .eq('id', quoteId);

          if (statusError) {
            console.error('Failed to update quote status:', statusError);
          } else {
            console.log(`Quote ${quoteId} status updated to 'sent'`);
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
              user_id: createdBy,
              action: 'QUOTE_SENT_TO_SUPPLIERS_DIRECT',
              entity_type: 'quotes',
              entity_id: quoteId,
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
          quote_status_updated: true,
          resolved_evolution: resolvedEvo
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );

    } catch (error: any) {
      console.error('Error in direct Evolution sending:', error);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Erro ao enviar via Evolution API', 
          details: error.message,
          resolved_evolution: resolvedEvo
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  }
};

serve(handler);