import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { resolveEvolutionConfig, sendEvolutionWhatsApp, normalizePhone } from '../_shared/evolution.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface WhatsAppRequest {
  to: string;
  message?: string;
  template?: 'delivery_code';
  template_data?: {
    client_name?: string;
    confirmation_code?: string;
    delivery_id?: string;
    quote_id?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { to, message, template, template_data }: WhatsAppRequest = await req.json();

    console.log('[send-whatsapp] Request:', { to, hasMessage: !!message, template });

    // Normalizar telefone
    const normalizedPhone = normalizePhone(to);
    
    if (!normalizedPhone || normalizedPhone.length < 10) {
      throw new Error('Número de telefone inválido');
    }

    // Resolver configuração Evolution API
    const config = await resolveEvolutionConfig(supabase, null, true);
    
    if (!config || !config.apiUrl || !config.token) {
      console.error('Evolution API not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'WhatsApp not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construir mensagem baseada no template ou usar mensagem direta
    let finalMessage = message || '';

    if (template === 'delivery_code' && template_data) {
      // Template de código de entrega
      finalMessage = `🚚 *Entrega Agendada - Cotiz*

Olá ${template_data.client_name || 'Cliente'}!

Sua entrega foi agendada. Para confirmar o recebimento dos produtos/serviços, use o código abaixo:

🔐 *Código de Confirmação:* ${template_data.confirmation_code}

⚠️ *Importante:*
• Validade: 7 dias
• Confirme apenas após receber tudo
• O pagamento será liberado automaticamente

📲 Acesse: ${Deno.env.get('SUPABASE_URL')?.replace('https://', '').replace('.supabase.co', '')}.lovable.app/client/deliveries

Dúvidas? Fale conosco!`;

      // Registrar no audit log
      if (template_data.delivery_id) {
        await supabase.from('audit_logs').insert({
          action: 'DELIVERY_CODE_WHATSAPP_SENT',
          entity_type: 'deliveries',
          entity_id: template_data.delivery_id,
          panel_type: 'system',
          details: {
            phone: normalizedPhone,
            confirmation_code: template_data.confirmation_code,
            quote_id: template_data.quote_id
          }
        });
      }
    }

    if (!finalMessage) {
      throw new Error('Mensagem não fornecida');
    }

    // Enviar via Evolution API
    const result = await sendEvolutionWhatsApp(config, normalizedPhone, finalMessage);

    if (!result.success) {
      console.error('Failed to send WhatsApp:', result.error);
      
      // Registrar falha se for template de delivery
      if (template === 'delivery_code' && template_data?.delivery_id) {
        await supabase.from('audit_logs').insert({
          action: 'DELIVERY_CODE_WHATSAPP_FAILED',
          entity_type: 'deliveries',
          entity_id: template_data.delivery_id,
          panel_type: 'system',
          details: {
            phone: normalizedPhone,
            error: result.error,
            quote_id: template_data.quote_id
          }
        });
      }

      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[send-whatsapp] ✅ Message sent successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'WhatsApp enviado com sucesso',
        to: normalizedPhone
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[send-whatsapp] Erro:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
