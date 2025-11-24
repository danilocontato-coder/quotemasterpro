import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar configuração do webhook
    const { data: webhookConfig, error: configError } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'asaas_webhook_config')
      .single();

    if (configError) {
      throw new Error('Configuração do webhook não encontrada');
    }

    const config = webhookConfig.setting_value as any;

    if (!config?.enabled) {
      throw new Error('Webhook não está habilitado');
    }

    if (!config?.auth_token) {
      throw new Error('Token de autenticação não configurado');
    }

    // Simular payload do Asaas
    const testPayload = {
      transfer: {
        id: 'tra_test_' + Date.now(),
        value: 1000.00,
        status: 'PENDING',
        operationType: 'PIX',
      },
      transferData: {
        bankAccount: {
          bank: {
            code: '001',
            name: 'Banco do Brasil'
          },
          accountName: 'Fornecedor Teste',
          cpfCnpj: '12345678000190',
          agency: '1234',
          account: '12345-6',
          accountDigit: '6',
          pixKey: 'teste@fornecedor.com'
        }
      }
    };

    // Chamar o webhook de aprovação
    const webhookUrl = `${supabaseUrl}/functions/v1/approve-transfer-webhook`;
    
    console.log('🧪 Testando webhook:', webhookUrl);
    console.log('🔑 Token:', config.auth_token?.substring(0, 8) + '...');

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'asaas-webhook-token': config.auth_token,
      },
      body: JSON.stringify(testPayload),
    });

    const responseData = await response.json();

    console.log('📨 Resposta do webhook:', responseData);

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Webhook retornou status ${response.status}`,
          details: responseData,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Teste bem-sucedido
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook testado com sucesso',
        webhook_response: responseData,
        config_summary: {
          enabled: config.enabled,
          has_token: !!config.auth_token,
          max_amount: config.max_auto_approve_amount,
          validate_pix: config.validate_pix_key,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro ao testar webhook:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.toString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
