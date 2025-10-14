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
    const { to } = await req.json();

    if (!to) {
      throw new Error('Destinatário não especificado');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🧪 Enviando e-mail de teste para:', to);

    // Call send-email function
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to,
        subject: '✅ Teste de Configuração de E-mail - QuoteMaster Pro',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #003366 0%, #0055aa 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">QuoteMaster Pro</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Sistema de Gestão de Cotações</p>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
              <h2 style="color: #003366; margin-top: 0;">🎉 Configuração bem-sucedida!</h2>
              
              <p style="color: #333; line-height: 1.6;">
                Parabéns! Seu sistema de e-mail está configurado corretamente e funcionando perfeitamente.
              </p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #003366; margin-top: 0;">✅ Teste realizado com sucesso</h3>
                <ul style="color: #666; line-height: 1.8;">
                  <li>Conexão com servidor de e-mail estabelecida</li>
                  <li>Credenciais validadas</li>
                  <li>E-mail enviado e entregue</li>
                </ul>
              </div>
              
              <p style="color: #666; line-height: 1.6;">
                Agora você pode usar o sistema para:
              </p>
              
              <ul style="color: #666; line-height: 1.8;">
                <li>📧 Enviar notificações automáticas</li>
                <li>📨 Comunicar-se com fornecedores</li>
                <li>🔔 Alertas de cotações</li>
                <li>📊 Relatórios por e-mail</li>
              </ul>
              
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
              
              <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
                Este é um e-mail de teste automático do QuoteMaster Pro<br>
                Configurado em ${new Date().toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        `,
        text: `
          QuoteMaster Pro - Teste de E-mail
          
          Configuração bem-sucedida!
          
          Seu sistema de e-mail está funcionando corretamente.
          Agora você pode usar o sistema para enviar notificações, comunicados e relatórios.
          
          Este é um e-mail de teste automático.
        `
      }
    });

    if (error) {
      throw new Error(error.message);
    }

    console.log('✅ E-mail de teste enviado com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `E-mail de teste enviado para ${to}. Verifique sua caixa de entrada.`,
        data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro no teste de e-mail:', error);

    return new Response(
      JSON.stringify({ 
        success: false,
        message: error.message || 'Erro ao enviar e-mail de teste'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
