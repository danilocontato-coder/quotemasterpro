import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { getClientMergeTags } from "../_shared/merge-tags.ts";
import { replaceVariables } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaign_id } = await req.json();

    if (!campaign_id) {
      throw new Error("campaign_id é obrigatório");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Buscar campanha
    const { data: campaign, error: campaignError } = await supabaseClient
      .from("email_marketing_campaigns")
      .select(`
        *,
        clients!inner (id, name, email)
      `)
      .eq("id", campaign_id)
      .single();

    if (campaignError || !campaign) {
      throw new Error("Campanha não encontrada");
    }

    // 2. Verificar se já foi enviada
    if (campaign.status === "sent" || campaign.sent_at) {
      throw new Error("Campanha já foi enviada");
    }

    // 3. Buscar destinatários da campanha com filtros
    let contactsQuery = supabaseClient
      .from("clients")
      .select("id, email, name, client_type, group_id, region, state")
      .eq("status", "active");

    // Aplicar filtros de segmentação se existirem
    if (campaign.target_segment && campaign.target_segment.criteria && campaign.target_segment.criteria.length > 0) {
      console.log('📊 Aplicando filtros de segmentação:', campaign.target_segment);
      
      for (const rule of campaign.target_segment.criteria) {
        if (!rule.value) continue;

        switch (rule.field) {
          case 'group_id':
            if (rule.operator === 'equals') {
              contactsQuery = contactsQuery.eq('group_id', rule.value);
            } else if (rule.operator === 'not_equals') {
              contactsQuery = contactsQuery.neq('group_id', rule.value);
            }
            break;
          case 'client_type':
            if (rule.operator === 'equals') {
              contactsQuery = contactsQuery.eq('client_type', rule.value);
            } else if (rule.operator === 'not_equals') {
              contactsQuery = contactsQuery.neq('client_type', rule.value);
            }
            break;
          case 'state':
            if (rule.operator === 'equals') {
              contactsQuery = contactsQuery.eq('state', rule.value);
            } else if (rule.operator === 'contains') {
              contactsQuery = contactsQuery.ilike('state', `%${rule.value}%`);
            }
            break;
          case 'region':
            if (rule.operator === 'equals') {
              contactsQuery = contactsQuery.eq('region', rule.value);
            } else if (rule.operator === 'contains') {
              contactsQuery = contactsQuery.ilike('region', `%${rule.value}%`);
            }
            break;
        }
      }
    }

    const { data: contacts, error: contactsError } = await contactsQuery;

    if (contactsError || !contacts || contacts.length === 0) {
      throw new Error("Nenhum cliente ativo encontrado para os filtros selecionados.");
    }

    console.log(`📧 Enviando campanha para ${contacts.length} cliente(s)`);

    // 4. Buscar merge tags do cliente UMA VEZ
    const clientMergeTags = await getClientMergeTags(supabaseClient, campaign.client_id);
    
    // Buscar base_url para unsubscribe
    const { data: baseUrlData } = await supabaseClient
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'base_url')
      .maybeSingle();
    
    const baseUrl = String(baseUrlData?.setting_value || 'https://cotiz.com.br').replace(/"/g, '');

    // 5. Atualizar status da campanha para "sending"
    await supabaseClient
      .from("email_marketing_campaigns")
      .update({ 
        status: "sending",
        sent_at: new Date().toISOString()
      })
      .eq("id", campaign_id);

    let sent_count = 0;
    let delivered_count = 0;
    let bounced_count = 0;

    // 6. Enviar e-mails
    for (const contact of contacts) {
      try {
        // Combinar dados do cliente + dados do contato
        const mergeTags = {
          ...clientMergeTags,
          recipient_name: contact.name || '',
          recipient_email: contact.email,
          recipient_type: contact.client_type || '',
          unsubscribe_url: `${baseUrl}/unsubscribe/${contact.email}`
        };
        
        // Aplicar variáveis no conteúdo
        const personalizedSubject = replaceVariables(campaign.subject_line, mergeTags);
        const personalizedHtml = replaceVariables(campaign.html_content, mergeTags);
        const personalizedText = campaign.plain_text_content 
          ? replaceVariables(campaign.plain_text_content, mergeTags) 
          : undefined;

        // Criar registro de destinatário
        const { data: recipient, error: recipientError } = await supabaseClient
          .from("email_campaign_recipients")
          .insert({
            campaign_id: campaign_id,
            recipient_email: contact.email,
            recipient_name: contact.name || "",
            recipient_type: "contact",
            send_status: "pending",
            personalization_data: mergeTags
          })
          .select()
          .single();

        if (recipientError) {
          console.error(`Erro ao criar destinatário: ${contact.email}`, recipientError);
          bounced_count++;
          continue;
        }

        // Enviar e-mail via send-email function
        const { data: emailResult, error: emailError } = await supabaseClient.functions.invoke('send-email', {
          body: {
            to: contact.email,
            subject: personalizedSubject,
            html: personalizedHtml,
            plainText: personalizedText,
            client_id: campaign.client_id
          }
        });

        sent_count++;

        if (!emailError && emailResult?.success !== false) {
          delivered_count++;
          await supabaseClient
            .from("email_campaign_recipients")
            .update({
              send_status: "delivered",
              delivered_at: new Date().toISOString()
            })
            .eq("id", recipient.id);
        } else {
          bounced_count++;
          await supabaseClient
            .from("email_campaign_recipients")
            .update({
              send_status: "bounced",
              bounced_at: new Date().toISOString(),
              error_message: emailError?.message || emailResult?.error || "Erro desconhecido"
            })
            .eq("id", recipient.id);
        }

        // Delay de 100ms entre envios para respeitar rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: any) {
        console.error(`Erro ao enviar para ${contact.email}:`, error.message);
        bounced_count++;
      }
    }

    // 7. Atualizar campanha com resultados
    const { error: updateError } = await supabaseClient
      .from("email_marketing_campaigns")
      .update({
        status: "sent",
        sent_count,
        delivered_count,
        bounced_count,
        recipient_count: contacts.length,
        bounce_rate: contacts.length > 0 ? (bounced_count / contacts.length) * 100 : 0
      })
      .eq("id", campaign_id);

    if (updateError) {
      console.error("Erro ao atualizar campanha:", updateError);
    }

    console.log(`✅ Campanha enviada: ${sent_count} enviados, ${delivered_count} entregues, ${bounced_count} com erro`);

    return new Response(
      JSON.stringify({
        success: true,
        sent_count,
        delivered_count,
        bounced_count,
        recipient_count: contacts.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {
    console.error("❌ Erro ao enviar campanha:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
