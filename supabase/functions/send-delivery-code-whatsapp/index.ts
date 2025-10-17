import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { resolveEvolutionConfig, sendEvolutionWhatsApp, normalizePhone } from '../_shared/evolution.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  phone: string;
  client_name: string;
  confirmation_code: string;
  delivery_id: string;
  quote_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { phone, client_name, confirmation_code, delivery_id, quote_id }: RequestBody = await req.json();

    console.log('Sending delivery code via WhatsApp:', { phone, client_name, delivery_id, quote_id });

    // Normalizar telefone
    const normalizedPhone = normalizePhone(phone);

    // Buscar configuração da Evolution API
    const config = await resolveEvolutionConfig(supabase, null, true);
    
    if (!config) {
      console.error('Evolution API not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'WhatsApp not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Template da mensagem
    const message = `🚚 *Entrega Agendada - Cotiz*

Olá ${client_name}!

Sua entrega foi agendada. Para confirmar o recebimento dos produtos/serviços, use o código abaixo:

🔐 *Código de Confirmação:* ${confirmation_code}

⚠️ *Importante:*
• Validade: 7 dias
• Confirme apenas após receber tudo
• O pagamento será liberado automaticamente

📲 Acesse: ${Deno.env.get('SUPABASE_URL')?.replace('https://', '').replace('.supabase.co', '')}.lovable.app/client/deliveries

Dúvidas? Fale conosco!`;

    // Enviar via Evolution API
    const result = await sendEvolutionWhatsApp(config, normalizedPhone, message);

    if (!result.success) {
      console.error('Failed to send WhatsApp:', result.error);
      
      // Registrar falha no log de auditoria
      await supabase.from('audit_logs').insert({
        action: 'DELIVERY_CODE_WHATSAPP_FAILED',
        entity_type: 'deliveries',
        entity_id: delivery_id,
        panel_type: 'system',
        details: {
          phone: normalizedPhone,
          error: result.error,
          quote_id: quote_id
        }
      });

      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Registrar sucesso no log de auditoria
    await supabase.from('audit_logs').insert({
      action: 'DELIVERY_CODE_WHATSAPP_SENT',
      entity_type: 'deliveries',
      entity_id: delivery_id,
      panel_type: 'system',
      details: {
        phone: normalizedPhone,
        confirmation_code: confirmation_code,
        quote_id: quote_id
      }
    });

    console.log('WhatsApp sent successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-delivery-code-whatsapp:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
