import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { api_key, from_email, from_name } = await req.json();

    if (!api_key || !from_email) {
      throw new Error('API Key e From Email são obrigatórios');
    }

    const resend = new Resend(api_key);

    const { data, error } = await resend.emails.send({
      from: `${from_name} <${from_email}>`,
      to: [from_email],
      subject: 'Teste de Configuração - Cotiz',
      html: `
        <h1>Teste de Configuração</h1>
        <p>Sua configuração do Resend está funcionando corretamente!</p>
        <p>Este é um e-mail de teste enviado do sistema Cotiz.</p>
      `
    });

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
