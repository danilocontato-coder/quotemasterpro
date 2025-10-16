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

    const url = new URL(req.url);
    const type = url.searchParams.get('type'); // open, click, unsubscribe
    const campaignId = url.searchParams.get('campaign');
    const recipientId = url.searchParams.get('recipient');
    const targetUrl = url.searchParams.get('url');

    console.log(`📊 Tracking event: ${type} for campaign ${campaignId}, recipient ${recipientId}`);

    if (!campaignId || !recipientId) {
      throw new Error('Missing required parameters');
    }

    const userAgent = req.headers.get('user-agent') || '';
    const forwardedFor = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
    const ipAddress = forwardedFor.split(',')[0].trim();

    // Processar eventos
    switch (type) {
      case 'open':
        await trackOpen(supabaseClient, campaignId, recipientId, userAgent, ipAddress);
        // Retornar pixel transparente 1x1
        return new Response(
          new Uint8Array([
            0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
            0x80, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x21,
            0xF9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2C, 0x00, 0x00,
            0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
            0x01, 0x00, 0x3B
          ]),
          {
            headers: {
              'Content-Type': 'image/gif',
              'Cache-Control': 'no-store, no-cache, must-revalidate, private',
            }
          }
        );

      case 'click':
        await trackClick(supabaseClient, campaignId, recipientId, targetUrl, userAgent, ipAddress);
        // Redirecionar para URL original
        return Response.redirect(targetUrl || 'https://cotiz.com', 302);

      case 'unsubscribe':
        await trackUnsubscribe(supabaseClient, campaignId, recipientId);
        // Retornar página de confirmação
        return new Response(
          `<!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Descadastro Confirmado - Cotiz</title>
            <style>
              body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 40px; text-align: center; }
              .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              h1 { color: #003366; }
              p { color: #0F172A; line-height: 1.6; }
              a { color: #003366; text-decoration: none; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>✅ Descadastro Confirmado</h1>
              <p>Você foi removido da nossa lista de e-mails com sucesso.</p>
              <p>Sentiremos sua falta, mas respeitamos sua decisão.</p>
              <p style="margin-top: 30px;"><a href="https://cotiz.com">← Voltar para Cotiz</a></p>
            </div>
          </body>
          </html>`,
          {
            headers: { 'Content-Type': 'text/html; charset=UTF-8' }
          }
        );

      default:
        throw new Error('Invalid event type');
    }

  } catch (error) {
    console.error('❌ Error in track-email-events:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function trackOpen(supabaseClient: any, campaignId: string, recipientId: string, userAgent: string, ipAddress: string) {
  // Atualizar destinatário
  const { data: recipient } = await supabaseClient
    .from('email_campaign_recipients')
    .select('open_count, opened_at')
    .eq('id', recipientId)
    .single();

  await supabaseClient
    .from('email_campaign_recipients')
    .update({
      opened_at: recipient?.opened_at || new Date().toISOString(),
      open_count: (recipient?.open_count || 0) + 1,
      user_agent: userAgent,
      ip_address: ipAddress,
      send_status: 'delivered'
    })
    .eq('id', recipientId);

  console.log(`✅ Tracked open for recipient ${recipientId}`);
}

async function trackClick(supabaseClient: any, campaignId: string, recipientId: string, targetUrl: string | null, userAgent: string, ipAddress: string) {
  // Atualizar destinatário
  const { data: recipient } = await supabaseClient
    .from('email_campaign_recipients')
    .select('click_count, first_click_at')
    .eq('id', recipientId)
    .single();

  await supabaseClient
    .from('email_campaign_recipients')
    .update({
      first_click_at: recipient?.first_click_at || new Date().toISOString(),
      click_count: (recipient?.click_count || 0) + 1,
      user_agent: userAgent,
      ip_address: ipAddress
    })
    .eq('id', recipientId);

  // Registrar clique específico
  await supabaseClient
    .from('email_clicks')
    .insert({
      campaign_id: campaignId,
      recipient_id: recipientId,
      link_url: targetUrl || '',
      user_agent: userAgent,
      ip_address: ipAddress
    });

  console.log(`✅ Tracked click for recipient ${recipientId} -> ${targetUrl}`);
}

async function trackUnsubscribe(supabaseClient: any, campaignId: string, recipientId: string) {
  // Buscar e-mail do destinatário
  const { data: recipient } = await supabaseClient
    .from('email_campaign_recipients')
    .select('recipient_email')
    .eq('id', recipientId)
    .single();

  if (!recipient) return;

  // Adicionar à lista de unsubscribes
  await supabaseClient
    .from('email_unsubscribes')
    .insert({
      email: recipient.recipient_email,
      unsubscribed_from_campaign_id: campaignId
    })
    .onConflict('email')
    .ignore();

  // Atualizar destinatário
  await supabaseClient
    .from('email_campaign_recipients')
    .update({
      unsubscribed_at: new Date().toISOString()
    })
    .eq('id', recipientId);

  console.log(`✅ Tracked unsubscribe for ${recipient.recipient_email}`);
}