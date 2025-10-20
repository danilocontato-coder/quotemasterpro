import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppRequest {
  to: string;
  message: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, message }: WhatsAppRequest = await req.json();

    console.log('[send-whatsapp] Enviando mensagem para:', to);

    // Validar número de telefone
    const cleanNumber = to.replace(/\D/g, '');
    if (cleanNumber.length < 10 || cleanNumber.length > 13) {
      throw new Error('Número de telefone inválido');
    }

    // Aqui você pode integrar com Twilio, WhatsApp Business API, ou outro provedor
    // Por enquanto, vamos apenas logar e retornar sucesso
    
    // Exemplo com Twilio (descomente quando tiver as credenciais):
    /*
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioWhatsAppNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER');

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append('From', `whatsapp:${twilioWhatsAppNumber}`);
    formData.append('To', `whatsapp:+${cleanNumber}`);
    formData.append('Body', message);

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    const twilioData = await twilioResponse.json();
    
    if (!twilioResponse.ok) {
      console.error('[send-whatsapp] Erro Twilio:', twilioData);
      throw new Error(twilioData.message || 'Erro ao enviar via Twilio');
    }

    console.log('[send-whatsapp] ✅ Mensagem enviada com sucesso:', twilioData.sid);
    */

    // Log simulado (remover quando integrar com provedor real)
    console.log('[send-whatsapp] 📱 Simulação - Mensagem enviada para:', cleanNumber);
    console.log('[send-whatsapp] 💬 Conteúdo:', message);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'WhatsApp enviado com sucesso',
        to: cleanNumber,
        simulated: true, // Remover quando integrar com provedor real
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
