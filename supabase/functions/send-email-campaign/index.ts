import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, campaign_id } = await req.json();
    console.log(`📧 Send email campaign action: ${action}, campaign_id: ${campaign_id || 'N/A'}`);

    // Processar campanhas agendadas (chamada do cron)
    if (action === 'process_scheduled') {
      return await processScheduledCampaigns(supabaseClient);
    }

    // Enviar campanha específica
    if (campaign_id) {
      return await sendCampaign(supabaseClient, campaign_id);
    }

    throw new Error('Invalid request: missing campaign_id or action');

  } catch (error) {
    console.error('❌ Error in send-email-campaign:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processScheduledCampaigns(supabaseClient: any) {
  console.log('🔍 Checking for scheduled campaigns...');
  
  const { data: campaigns, error } = await supabaseClient
    .from('email_marketing_campaigns')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_send_at', new Date().toISOString());

  if (error) throw error;

  console.log(`📋 Found ${campaigns?.length || 0} scheduled campaigns`);

  const results = [];
  for (const campaign of campaigns || []) {
    try {
      const result = await sendCampaign(supabaseClient, campaign.id);
      results.push({ campaign_id: campaign.id, success: true });
    } catch (err) {
      console.error(`❌ Failed to send campaign ${campaign.id}:`, err);
      results.push({ campaign_id: campaign.id, success: false, error: err.message });
    }
  }

  return new Response(JSON.stringify({ 
    success: true, 
    processed: results.length,
    results 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function sendCampaign(supabaseClient: any, campaignId: string) {
  console.log(`📤 Sending campaign ${campaignId}...`);

  // 1. Buscar campanha
  const { data: campaign, error: campaignError } = await supabaseClient
    .from('email_marketing_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (campaignError) throw campaignError;
  if (!campaign) throw new Error('Campaign not found');

  // 2. Atualizar status para 'sending'
  await supabaseClient
    .from('email_marketing_campaigns')
    .update({ status: 'sending' })
    .eq('id', campaignId);

  // 3. Buscar destinatários baseado em segmentação
  const recipients = await getRecipients(supabaseClient, campaign);
  console.log(`👥 Found ${recipients.length} recipients`);

  // 4. Filtrar unsubscribes
  const { data: unsubscribes } = await supabaseClient
    .from('email_unsubscribes')
    .select('email');
  
  const unsubscribedEmails = new Set(unsubscribes?.map((u: any) => u.email.toLowerCase()) || []);
  const validRecipients = recipients.filter(r => !unsubscribedEmails.has(r.email.toLowerCase()));

  console.log(`✅ ${validRecipients.length} valid recipients (after filtering ${recipients.length - validRecipients.length} unsubscribes)`);

  // 5. Criar registros de destinatários
  const recipientRecords = validRecipients.map(r => ({
    campaign_id: campaignId,
    recipient_email: r.email,
    recipient_name: r.name,
    recipient_type: r.type,
    recipient_id: r.id,
    personalization_data: r.personalization_data || {}
  }));

  const { data: insertedRecipients, error: insertError } = await supabaseClient
    .from('email_campaign_recipients')
    .insert(recipientRecords)
    .select();

  if (insertError) throw insertError;

  // 6. Enviar e-mails em lotes (rate limiting: 50 por vez)
  const batchSize = 50;
  let sentCount = 0;
  let failedCount = 0;

  for (let i = 0; i < insertedRecipients.length; i += batchSize) {
    const batch = insertedRecipients.slice(i, i + batchSize);
    
    for (const recipient of batch) {
      try {
        await sendEmail(supabaseClient, campaign, recipient);
        sentCount++;
        
        // Atualizar status do destinatário
        await supabaseClient
          .from('email_campaign_recipients')
          .update({ 
            send_status: 'sent',
            delivered_at: new Date().toISOString()
          })
          .eq('id', recipient.id);
          
      } catch (emailError) {
        console.error(`❌ Failed to send to ${recipient.recipient_email}:`, emailError);
        failedCount++;
        
        await supabaseClient
          .from('email_campaign_recipients')
          .update({ 
            send_status: 'failed',
            error_message: emailError.message 
          })
          .eq('id', recipient.id);
      }
    }

    // Rate limiting: aguardar 1 segundo entre lotes
    if (i + batchSize < insertedRecipients.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // 7. Atualizar métricas da campanha
  await supabaseClient
    .from('email_marketing_campaigns')
    .update({ 
      status: 'sent',
      sent_count: sentCount,
      sent_at: new Date().toISOString()
    })
    .eq('id', campaignId);

  console.log(`✅ Campaign sent: ${sentCount} successful, ${failedCount} failed`);

  return new Response(JSON.stringify({ 
    success: true, 
    sent_count: sentCount,
    failed_count: failedCount
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function getRecipients(supabaseClient: any, campaign: any) {
  console.log('Fetching recipients for campaign segmentation');
  
  let query = supabaseClient
    .from('email_contacts')
    .select('id, client_id, email, name, phone, tags, custom_fields')
    .eq('status', 'active');

  // Se target_all_contacts é false, filtrar por tags específicas
  if (campaign.target_all_contacts === false && campaign.contact_tags && campaign.contact_tags.length > 0) {
    query = query.overlaps('tags', campaign.contact_tags);
  }

  const { data: contacts, error } = await query;

  if (error) {
    console.error('Error fetching email contacts:', error);
    throw error;
  }

  return (contacts || []).map((c: any) => ({
    id: c.id,
    email: c.email,
    name: c.name,
    type: 'contact',
    personalization_data: { 
      name: c.name || '',
      phone: c.phone || '',
      ...c.custom_fields
    }
  }));
}

async function sendEmail(supabaseClient: any, campaign: any, recipient: any) {
  // Buscar configuração de e-mail (Resend/SendGrid)
  const { data: emailConfig } = await supabaseClient
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'email_service_config')
    .single();

  if (!emailConfig?.setting_value?.api_key) {
    throw new Error('Email service not configured');
  }

  // Personalizar conteúdo
  const personalizedHtml = personalizeContent(
    campaign.html_content, 
    recipient.personalization_data,
    campaign.id,
    recipient.id
  );

  // Enviar via Resend
  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${emailConfig.setting_value.api_key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${campaign.from_name} <${emailConfig.setting_value.from_email}>`,
      to: [recipient.recipient_email],
      subject: campaign.subject_line,
      html: personalizedHtml,
      text: campaign.plain_text_content || stripHtml(personalizedHtml),
      reply_to: campaign.reply_to_email || emailConfig.setting_value.from_email,
    }),
  });

  if (!resendResponse.ok) {
    const error = await resendResponse.text();
    throw new Error(`Resend API error: ${error}`);
  }

  const result = await resendResponse.json();
  return result;
}

function personalizeContent(html: string, data: any, campaignId: string, recipientId: string): string {
  let personalized = html;

  // Substituir variáveis {{variable}}
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    personalized = personalized.replace(regex, data[key] || '');
  });

  // Inserir pixel de rastreamento de abertura
  const trackingPixel = `<img src="${Deno.env.get('SUPABASE_URL')}/functions/v1/track-email-events?type=open&campaign=${campaignId}&recipient=${recipientId}" width="1" height="1" style="display:none;" />`;
  personalized = personalized.replace('</body>', `${trackingPixel}</body>`);

  // Converter links em links rastreáveis
  personalized = personalized.replace(
    /href="([^"]+)"/g,
    (match, url) => {
      if (url.startsWith('#') || url.startsWith('mailto:')) return match;
      const trackedUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/track-email-events?type=click&campaign=${campaignId}&recipient=${recipientId}&url=${encodeURIComponent(url)}`;
      return `href="${trackedUrl}"`;
    }
  );

  // Adicionar link de descadastro
  const unsubscribeLink = `<div style="text-align: center; margin-top: 40px; padding: 20px; font-size: 12px; color: #666;">
    <a href="${Deno.env.get('SUPABASE_URL')}/functions/v1/track-email-events?type=unsubscribe&campaign=${campaignId}&recipient=${recipientId}" style="color: #666; text-decoration: underline;">Descadastrar</a>
  </div>`;
  personalized = personalized.replace('</body>', `${unsubscribeLink}</body>`);

  return personalized;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}