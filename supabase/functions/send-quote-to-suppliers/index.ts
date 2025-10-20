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
  short_links?: { supplier_id: string; short_link: string; full_link?: string; short_code?: string; full_token?: string }[];
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

    // Buscar base URL do sistema
    let systemBaseUrl = 'https://cotiz.com.br'; // fallback
    try {
      const { data: settingsData } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'base_url')
        .single();
      
      if (settingsData?.setting_value) {
        const settingValue = typeof settingsData.setting_value === 'string' 
          ? settingsData.setting_value.replace(/"/g, '')
          : String(settingsData.setting_value || '').replace(/"/g, '');
        
        if (settingValue) {
          systemBaseUrl = settingValue;
          console.log('🌐 [SYSTEM] Base URL carregada:', systemBaseUrl);
        }
      }
    } catch (error) {
      console.log('⚠️ [SYSTEM] Não foi possível carregar base URL, usando fallback:', systemBaseUrl);
    }

    const { quote_id, supplier_ids, send_whatsapp, send_email, custom_message, send_via, supplier_links, short_links }: SendQuoteRequest = await req.json();

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

      // Criar registros de status para cada fornecedor
      const statusMappings = suppliers.map((s: any) => ({
        quote_id: quote.id,
        supplier_id: s.id,
        client_id: quote.client_id,
        status: 'pending'
      }));
      
      const { error: statusErr } = await supabase
        .from('quote_supplier_status')
        .upsert(statusMappings, { onConflict: 'quote_id,supplier_id' });
      
      if (statusErr) {
        console.warn('Failed to upsert supplier status:', statusErr);
      } else {
        console.log(`Created status tracking for ${statusMappings.length} supplier(s)`);
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

    // Load WhatsApp template with new default logic
    let whatsappTemplate = null;
    let emailTemplate = null;
    
    try {
      // First try to find client-specific default template
      let { data: clientDefaultTemplate } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('template_type', 'quote_request')
        .eq('active', true)
        .eq('client_id', quote.client_id)
        .eq('is_default', true)
        .maybeSingle();

      // Load email template in parallel
      let { data: clientEmailTemplate } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('template_type', 'email_quote_request')
        .eq('active', true)
        .eq('client_id', quote.client_id)
        .eq('is_default', true)
        .maybeSingle();

      if (clientDefaultTemplate) {
        whatsappTemplate = clientDefaultTemplate;
      } else {
        // Try global default template
        const { data: globalDefaultTemplate } = await supabase
          .from('whatsapp_templates')
          .select('*')
          .eq('template_type', 'quote_request')
          .eq('active', true)
          .eq('is_global', true)
          .eq('is_default', true)
          .maybeSingle();
        
        if (globalDefaultTemplate) {
          whatsappTemplate = globalDefaultTemplate;
        } else {
          // Fallback to any active template (client-specific first, then global)
          const { data: fallbackTemplate } = await supabase
            .from('whatsapp_templates')
            .select('*')
            .eq('template_type', 'quote_request')
            .eq('active', true)
            .or(`client_id.eq.${quote.client_id},is_global.eq.true`)
            .order('is_global', { ascending: true })
            .limit(1)
            .maybeSingle();
          
          whatsappTemplate = fallbackTemplate;
        }
      }

      // Same logic for email template
      if (clientEmailTemplate) {
        emailTemplate = clientEmailTemplate;
      } else {
        const { data: globalEmailTemplate } = await supabase
          .from('whatsapp_templates')
          .select('*')
          .eq('template_type', 'email_quote_request')
          .eq('active', true)
          .eq('is_global', true)
          .eq('is_default', true)
          .maybeSingle();
        
        emailTemplate = globalEmailTemplate;
      }
    } catch (error) {
      console.warn('Error loading templates:', error);
    }
    
    // Buscar template de convite de registro (para fornecedores não cadastrados)
    let registrationTemplate = null;
    try {
      const { data: regTemplate } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('template_type', 'supplier_registration_invite')
        .eq('active', true)
        .eq('is_global', true)
        .eq('is_default', true)
        .maybeSingle();
        
      registrationTemplate = regTemplate;
      if (registrationTemplate) {
        console.log('📧 Registration invitation template loaded:', registrationTemplate.name);
      }
    } catch (error) {
      console.warn('⚠️ Error loading registration template:', error);
    }

    // 📧 Carregar template de convite por e-mail (para fornecedores não registrados)
    let emailRegistrationTemplate: any = null;
    try {
      const { data: emailRegTemplate } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('template_type', 'email_supplier_invite')
        .eq('active', true)
        .single();
      
      emailRegistrationTemplate = emailRegTemplate;
      if (emailRegistrationTemplate) {
        console.log('📧 Email registration template loaded:', emailRegistrationTemplate.name);
      }
    } catch (error) {
      console.warn('⚠️ Error loading email registration template:', error);
    }
    
    // Validar template carregado
    if (!whatsappTemplate || !whatsappTemplate.message_content) {
      console.warn('⚠️ Nenhum template de WhatsApp encontrado, usando padrão do sistema');
      whatsappTemplate = {
        message_content: `Olá {{supplier_name}}!\n\n` +
          `🏢 *{{client_name}}* solicita uma cotação:\n\n` +
          `📋 *Cotação:* {{quote_title}}\n` +
          `🆔 *ID:* {{quote_id}}\n` +
          `📅 *Prazo:* {{deadline}}\n\n` +
          `📦 *ITENS:*\n{{items_list}}\n\n` +
          `🔗 *Acesse para responder:*\n{{proposal_link}}\n\n` +
          `_Cotiz - Sistema de Cotações_`
      };
    }
    
    const templateContent = whatsappTemplate.message_content;
    console.log('📋 Template carregado:', templateContent.substring(0, 50) + '...');

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

    // Extract short_links from request body
    // short_links is obtained from request body above

    // Build variables for template rendering
    const templateVariables = {
      client_name: client.name,
      client_email: client.email || 'Não informado',
      client_phone: client.phone || '',
      quote_title: quote.title,
      quote_id: quote.local_code || quote.id, // Usar local_code (RFQ01) ao invés de UUID
      deadline: deadlineFormatted,
      deadline_formatted: deadlineFormatted,
      total: totalFormatted,
      total_formatted: totalFormatted,
      items_list: itemsList,
      items_count: String(items.length || 0),
      proposal_link: 'PLACEHOLDER_WILL_BE_REPLACED_PER_SUPPLIER',
      response_link: 'PLACEHOLDER_WILL_BE_REPLACED_PER_SUPPLIER',
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
      supplier_links: supplier_links || []
    };

    const hasEvolution = Boolean(evolutionInstance && evolutionApiUrl && evolutionToken);
    // Use direct method if: (has Evolution AND wants WhatsApp) OR wants email
    const chosenMethod: 'direct' | 'n8n' = (hasEvolution && send_whatsapp) || send_email ? 'direct' : 'n8n';

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
        emailTemplate,
        emailRegistrationTemplate,
        registrationTemplate,
        templateContent: (whatsappTemplate?.message_content as string) || '',
        quoteId: quote_id,
        quote,
        client,
        items,
        createdBy: quote.created_by,
        resolvedEvolution,
        supplierLinks: supplier_links || [],
        shortLinks: short_links || [],
        frontendBaseUrl: systemBaseUrl,
        clientName: client.name,
        quoteTitle: quote.title,
        deadline: deadlineFormatted,
        itemsList,
        totalFormatted,
        registrationTemplate,
        send_whatsapp,
        send_email
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
    // Update quote status to 'sent' in background
    (async () => {
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
          
          // Create notifications for suppliers that received the quote
          try {
            console.log('Creating notifications for suppliers...');
            const supplierNotifications = suppliers.map((supplier: any) => ({
              title: 'Nova Cotação Recebida',
              message: `Você recebeu uma nova cotação: ${quote.title} (#${quote.local_code || quote.id})`,
              type: 'quote',
              priority: 'normal',
              action_url: `/supplier/quotes`,
              metadata: {
                quote_id: quote.id,
                quote_title: quote.title,
                client_name: client.name,
                deadline: quote.deadline
              },
              supplier_id: supplier.id,
              notify_all_supplier_users: true
            }));

            // Create notifications for all suppliers
            for (const notificationData of supplierNotifications) {
              try {
                const { error: notificationError } = await supabase.functions.invoke('create-notification', {
                  body: notificationData
                });

                if (notificationError) {
                  console.error('Failed to create supplier notification:', notificationError);
                } else {
                  console.log(`Created notification for supplier: ${notificationData.supplier_id}`);
                }
              } catch (notifyError) {
                console.error('Error creating supplier notification:', notifyError);
              }
            }
          } catch (error) {
            console.error('Error creating supplier notifications:', error);
          }
        }
      } catch (error) {
        console.error('Error updating quote status:', error);
      }
    })().catch(err => console.error('Background update error:', err));

    // Log the activity (also in background)
    (async () => {
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
    })().catch(err => console.error('Background log error:', err));

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
      emailTemplate,
      emailRegistrationTemplate,
      registrationTemplate,
      templateContent,
      quoteId,
      quote,
      client,
      items,
      createdBy,
      resolvedEvolution: resolvedEvo,
      supplierLinks,
      shortLinks,
      frontendBaseUrl,
      clientName,
      quoteTitle,
      deadline,
      itemsList,
      totalFormatted,
      send_whatsapp = false,
      send_email = false
    }: any
  ) {
    console.log('Sending directly via Evolution API or Email', { send_whatsapp, send_email });
    
    // Helper function to replace all template variables
    function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
      let result = template;
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, String(value || ''));
      }
      // Convert literal \n to actual line breaks for WhatsApp
      result = result.replace(/\\n/g, '\n');
      return result;
    }
    
    try {
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];
      let emailsSent = 0;
      let emailErrors: Array<{ supplier: string; error: string }> = [];

      // Store template content for checking later
      const templateContent = whatsappTemplate?.message_content || 'Nova cotação disponível: {{quote_title}}';

      // Preflight: check Evolution instance connection state ONLY if sending WhatsApp
      if (send_whatsapp) {
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
      }

      // Send to each supplier
      console.log('📨 Starting to send to suppliers:', {
        total: suppliers.length,
        supplier_details: suppliers.map((s: any) => ({
          name: s.name,
          id: s.id,
          phone: s.whatsapp || s.phone || 'N/A'
        }))
      });
      
      for (const supplier of suppliers) {
        // Skip phone validation if only sending email
        let finalPhone = '';
        if (send_whatsapp) {
          if (!supplier.whatsapp && !supplier.phone) {
            console.warn(`Supplier ${supplier.name} has no WhatsApp/phone number`);
            if (!send_email || !supplier.email) {
              errorCount++;
              errors.push(`${supplier.name}: sem WhatsApp/telefone`);
              continue;
            }
          } else {
            // Normalize phone number and validate
            const phone = supplier.whatsapp || supplier.phone || '';
            finalPhone = normalizePhone(phone);

            console.log(`📱 [${supplier.name}] Phone normalization:`, {
              original: phone,
              normalized: finalPhone,
              length: finalPhone.length,
              valid: finalPhone.length >= 12
            });

            if (!finalPhone || finalPhone.length < 12) {
              console.warn(`❌ [${supplier.name}] Invalid phone: "${phone}" → "${finalPhone}" (length: ${finalPhone.length})`);
              if (!send_email || !supplier.email) {
                errorCount++;
                errors.push(`${supplier.name}: número inválido (${phone} → ${finalPhone})`);
                continue;
              }
            }
          }
        }

        try {
          // Get supplier-specific short link
          const shortLinkEntry = Array.isArray(shortLinks)
            ? (shortLinks as any[]).find((l: any) => l.supplier_id === supplier.id)
            : null;
          
          // Get fallback long link
          const linkEntry = Array.isArray(supplierLinks)
            ? (supplierLinks as any[]).find((l: any) => l.supplier_id === supplier.id)
            : null;

          // Use short link if available, otherwise fallback to long link
          const supplierProposalLink = shortLinkEntry?.short_link || linkEntry?.link || `${frontendBaseUrl}/supplier/quick-response/${quoteId}/fallback-token`;

          // 🆕 Verificar se fornecedor já está registrado (tem auth.users vinculado)
          const isRegistered = supplier.status === 'active' && supplier.registration_status === 'active';
          
          // 🆕 Construir mensagem diferente para registrados vs não-registrados
          let finalMessage = '';
          
          if (isRegistered) {
            // Fornecedor já cadastrado: mensagem normal de cotação
            const supplierVars = {
              ...templateVariables,
              supplier_name: supplier.name || 'Fornecedor',
              proposal_link: supplierProposalLink,
              response_link: supplierProposalLink,
            };
            
            console.log(`📝 [${supplier.name}] Variáveis do template:`, {
              supplier_name: supplierVars.supplier_name,
              client_name: supplierVars.client_name,
              quote_title: supplierVars.quote_title,
              quote_id: supplierVars.quote_id,
              deadline: supplierVars.deadline,
              items_count: supplierVars.items_count,
              proposal_link: supplierVars.proposal_link.substring(0, 30) + '...'
            });
            
            try {
              finalMessage = replaceTemplateVariables(templateContent, supplierVars);
              
              // Validar que todas as variáveis foram substituídas
              const unreplacedVars = finalMessage.match(/{{[^}]+}}/g);
              if (unreplacedVars && unreplacedVars.length > 0) {
                console.warn(`⚠️ [${supplier.name}] Variáveis não substituídas:`, unreplacedVars);
              }
            } catch (error) {
              console.error(`❌ [${supplier.name}] Erro ao substituir variáveis:`, error);
              throw new Error(`Falha ao processar template para ${supplier.name}`);
            }
          } else {
            // 🎯 Fornecedor NÃO cadastrado: usar short link se disponível
            const registrationLink = shortLinkEntry?.short_link 
              || linkEntry?.link 
              || `${frontendBaseUrl}/supplier/register/${linkEntry?.token || 'token'}`;
            
            console.log(`🔗 [${supplier.name}] Registration link (short): ${registrationLink}`);
            
            // 🆕 Usar template do banco se disponível
            if (registrationTemplate && registrationTemplate.message_content) {
              const regVars = {
                supplier_name: supplier.name || 'Fornecedor',
                quote_title: quoteTitle,
                client_name: clientName,
                deadline: deadline,
                registration_link: registrationLink
              };
              
              finalMessage = replaceTemplateVariables(registrationTemplate.message_content, regVars);
              console.log(`📧 [${supplier.name}] Using database registration template: "${registrationTemplate.name}"`);
            } else {
              // Fallback para mensagem hardcoded (caso template não exista)
              finalMessage = 
                `🎉 Olá, ${supplier.name}!\n\n` +
                `Você tem *1 nova cotação* aguardando sua resposta!\n\n` +
                `📋 *Cotação:* ${quoteTitle}\n` +
                `🏢 *Cliente:* ${clientName}\n` +
                `⏰ *Prazo:* ${deadline}\n\n` +
                `⚠️ *Para visualizar e responder, você precisa completar seu cadastro.*\n\n` +
                `✅ É rápido! Clique no link abaixo:\n` +
                `${registrationLink}\n\n` +
                `Após o cadastro, você receberá suas credenciais por WhatsApp e poderá responder a cotação imediatamente! 🚀`;
              console.warn(`⚠️ [${supplier.name}] Registration template not found, using fallback`);
            }
            
            console.log(`📧 [${supplier.name}] Message type: REGISTRATION_INVITE`);
          }

          console.log(`📧 [${supplier.name}] Message type:`, isRegistered ? 'QUOTE_NOTIFICATION' : 'REGISTRATION_INVITE');

          // Add custom message if provided
          if (customMessage?.trim()) {
            finalMessage = `${customMessage.trim()}\n\n${finalMessage}`;
          }

          // 📱 SEND WHATSAPP (if send_whatsapp = true)
          if (send_whatsapp && finalPhone) {
            console.log(`📱 Sending WhatsApp to ${supplier.name} with link: ${supplierProposalLink.substring(0, 50)}...`);

            // Send via Evolution API using shared helper
            const sent = await sendEvolutionWhatsApp({ apiUrl: evolutionApiUrl, token: evolutionToken, instance: evolutionInstance, scope: 'client' }, finalPhone, finalMessage);

            if (!sent.success) {
              console.error(`❌ Evolution API error for ${supplier.name}:`, sent.error);
              errorCount++;
              errors.push(`${supplier.name}: ${String(sent.error).substring(0, 100)}`);
            } else {
              console.log(`✅ Message sent to ${supplier.name} (${finalPhone}) via ${sent.endpoint}`);
              successCount++;
            }
          }

          // 📧 SEND EMAIL (if send_email = true AND supplier has email)
          if (send_email && supplier.email) {
            try {
              // Verificar se fornecedor está registrado (MESMO critério do WhatsApp: active + active)
              const isRegistered = supplier.registration_status === 'active' && supplier.status === 'active';
              
              // Selecionar template baseado no status de registro
              const selectedEmailTemplate = isRegistered ? 'email_quote_request' : 'email_supplier_invite';
              const emailTemplateData: any = {
                supplier_name: supplier.name,
                client_name: clientName,
                client_email: client.email || 'Não informado',
                client_phone: client.phone || ''
              };

              // Buscar configurações globais de branding para nome e logo do sistema
              const { data: globalBranding } = await supabase
                .from('branding_settings')
                .select('*')
                .is('client_id', null)
                .limit(1)
                .maybeSingle();

              const systemName = globalBranding?.company_name || 'Sistema de Cotações';
              const systemLogo = globalBranding?.logo_url || '';

              if (isRegistered) {
                // Fornecedor registrado: enviar cotação completa
                console.log(`📧 [${supplier.name}] REGISTERED - Sending full quote email`);
                console.log(`📧 [${supplier.name}] Email proposal link: ${supplierProposalLink}`);
                Object.assign(emailTemplateData, {
                  quote_title: quoteTitle,
                  quote_id: quote.local_code || quoteId,
                  deadline_formatted: deadline,
                  items_count: String(items.length || 0),
                  items_list: itemsList,
                  total_formatted: totalFormatted,
                  proposal_link: supplierProposalLink,
                  system_name: systemName,
                  system_logo: systemLogo
                });
              } else {
                // Fornecedor NÃO registrado: usar short link para registro
                const registrationLink = shortLinkEntry?.short_link 
                  || linkEntry?.link 
                  || `${frontendBaseUrl}/supplier/register/${linkEntry?.token || 'token'}`;
                
                console.log(`📧 [${supplier.name}] PENDING - Sending registration invite email`);
                console.log(`📧 [${supplier.name}] Email registration link (short): ${registrationLink}`);
                Object.assign(emailTemplateData, {
                  registration_link: registrationLink,
                  quote_preview: quoteTitle,
                  benefit_1: '📊 Acompanhamento em tempo real de todas as suas cotações',
                  benefit_2: '💰 Sistema transparente de negociação e pagamentos',
                  benefit_3: '🎯 Oportunidades personalizadas para seu negócio',
                  benefit_4: '⚡ Resposta rápida e comunicação direta com clientes',
                  system_name: systemName,
                  system_logo: systemLogo,
                  cta_text: 'Criar Conta Grátis'
                });
              }
              
              console.log(`📧 [${supplier.name}] Email template: ${selectedEmailTemplate}`);
              
              const { error: emailError } = await supabase.functions.invoke('send-email', {
                body: {
                  to: supplier.email,
                  template_type: selectedEmailTemplate,
                  template_data: emailTemplateData,
                  client_id: quote.client_id
                }
              });
              
              if (emailError) {
                console.error(`❌ [${supplier.name}] Email error:`, emailError);
                emailErrors.push({
                  supplier: supplier.name,
                  error: emailError.message || String(emailError)
                });
              } else {
                console.log(`✅ [${supplier.name}] Email sent successfully`);
                emailsSent++;
                
                // If only sending email (no WhatsApp), count in success
                if (!send_whatsapp) {
                  successCount++;
                }
              }
            } catch (emailError: any) {
              console.error(`❌ [${supplier.name}] Failed to send email:`, emailError);
              emailErrors.push({
                supplier: supplier.name,
                error: emailError.message || String(emailError)
              });
            }
          }

        } catch (error: any) {
          console.error(`Error sending to ${supplier.name}:`, error);
          errorCount++;
          errors.push(`${supplier.name}: ${error.message}`);
        }
      }

      console.log(`Direct Evolution sending completed: ${successCount} success, ${errorCount} errors`);

      // Update quote status SYNCHRONOUSLY (not in background)
      console.log(`📝 Updating quote ${quoteId} status to 'sent'...`);
      
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
          console.error('❌ Failed to update quote status:', statusError);
          // Still continue - status update failure shouldn't block notifications
        } else {
          console.log(`✅ Quote ${quoteId} status updated to 'sent' (${successCount} suppliers)`);
        }
      } catch (error) {
        console.error('❌ Error updating quote status:', error);
      }

      // Create notifications in background (keep as-is)
      (async () => {
        try {
          console.log('Creating notifications for suppliers (direct method)...');
          const supplierNotifications = suppliers.map((supplier: any) => ({
            title: 'Nova Cotação Recebida',
            message: `Você recebeu uma nova cotação: ${templateVariables.quote_title} (#${templateVariables.quote_id})`,
            type: 'quote',
            priority: 'normal',
            action_url: `/supplier/quotes`,
            metadata: {
              quote_id: quoteId,
              quote_title: templateVariables.quote_title,
              client_name: templateVariables.client_name,
              deadline: templateVariables.deadline_formatted
            },
            client_id: quote.client_id,  // ✅ ADICIONAR client_id
            supplier_id: supplier.id,
            notify_all_supplier_users: true
          }));

          // Create notifications for all suppliers (non-blocking)
          for (const notificationData of supplierNotifications) {
            try {
              console.log('📬 Creating notification for supplier:', notificationData.supplier_id);
              
              const { error: notificationError } = await supabase.functions.invoke('create-notification', {
                body: notificationData
              });

              if (notificationError) {
                console.warn('⚠️ Notification failed (non-critical):', notificationError);
              } else {
                console.log(`✅ Notification created for supplier: ${notificationData.supplier_id}`);
              }
            } catch (notifyError: any) {
              // Não bloquear fluxo principal se notificação falhar
              console.warn('⚠️ Failed to create notification (non-critical):', notifyError.message);
            }
          }
        } catch (error) {
          console.error('Error creating supplier notifications:', error);
        }
      })().catch(err => console.error('Background notification error:', err));

      // Log the activity in background
      (async () => {
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
      })().catch(err => console.error('Background activity log error:', err));

      const responseMessage = successCount > 0 
        ? `${successCount} fornecedor(es) notificado(s) • ${emailsSent} e-mail(s) enviado(s)`
        : `Falha ao enviar para todos os fornecedores (${errorCount} erro(s))`;

      return new Response(
        JSON.stringify({ 
          success: successCount > 0, 
          message: responseMessage,
          suppliers_sent: successCount,
          whatsapp_sent: send_whatsapp ? successCount : 0,
          emails_sent: emailsSent,
          suppliers_total: suppliers.length,
          whatsapp_errors: send_whatsapp ? errors : [],
          email_errors: emailErrors,
          send_method: send_whatsapp ? 'evolution_direct' : 'email_only',
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