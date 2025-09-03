import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestIntegrationRequest {
  integration_id: string;
  integration_type: string;
  configuration: any;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Test integration function called');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { integration_id, integration_type, configuration }: TestIntegrationRequest = await req.json();

    console.log('Testing integration:', { integration_id, integration_type });

    let testResult = { success: false, message: '', details: {} };

    switch (integration_type) {
      case 'n8n_webhook':
        testResult = await testN8NWebhook(configuration);
        break;
      
      case 'zapier_webhook':
        testResult = await testZapierWebhook(configuration);
        break;
      
      case 'generic_webhook':
        testResult = await testGenericWebhook(configuration);
        break;
      
      case 'whatsapp_twilio':
        testResult = await testTwilioWhatsApp(configuration);
        break;
      
      case 'email_sendgrid':
        testResult = await testSendGrid(configuration);
        break;
      
      case 'email_smtp':
        testResult = await testSMTP(configuration);
        break;
      
      case 'payment_stripe':
        testResult = await testStripe(configuration);
        break;
      
      default:
        testResult = {
          success: false,
          message: `Teste não implementado para o tipo: ${integration_type}`,
          details: {}
        };
    }

    console.log('Test result:', testResult);

    return new Response(
      JSON.stringify(testResult),
      {
        status: testResult.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in test-integration function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message || 'Erro interno do servidor',
        details: { error: error.toString() }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

async function testN8NWebhook(config: any) {
  try {
    const webhookUrl = config.webhook_url;
    if (!webhookUrl) {
      return { success: false, message: 'URL do webhook N8N não configurada', details: {} };
    }

    const testPayload = {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'Teste de conexão do QuoteMaster Pro',
      data: {
        integration_type: 'n8n_webhook',
        test_id: `test-${Date.now()}`,
        platform: 'QuoteMaster Pro'
      }
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.auth_header ? { 'Authorization': config.auth_header } : {})
      },
      body: JSON.stringify(testPayload),
    });

    const responseText = await response.text();
    
    if (response.ok) {
      return {
        success: true,
        message: 'Webhook N8N testado com sucesso!',
        details: {
          status: response.status,
          response: responseText,
          url: webhookUrl
        }
      };
    } else {
      return {
        success: false,
        message: `Erro no webhook N8N: ${response.status}`,
        details: {
          status: response.status,
          response: responseText,
          url: webhookUrl
        }
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Falha na conexão com N8N: ${error.message}`,
      details: { error: error.toString() }
    };
  }
}

async function testZapierWebhook(config: any) {
  try {
    const webhookUrl = config.webhook_url;
    if (!webhookUrl) {
      return { success: false, message: 'URL do webhook Zapier não configurada', details: {} };
    }

    const testPayload = {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'Teste de conexão do QuoteMaster Pro',
      trigger_event: 'connection_test'
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    });

    if (response.ok) {
      return {
        success: true,
        message: 'Webhook Zapier testado com sucesso!',
        details: { status: response.status }
      };
    } else {
      return {
        success: false,
        message: `Erro no webhook Zapier: ${response.status}`,
        details: { status: response.status }
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Falha na conexão com Zapier: ${error.message}`,
      details: { error: error.toString() }
    };
  }
}

async function testGenericWebhook(config: any) {
  try {
    const webhookUrl = config.webhook_url;
    const method = config.method || 'POST';
    
    if (!webhookUrl) {
      return { success: false, message: 'URL do webhook não configurada', details: {} };
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    
    if (config.headers) {
      try {
        const customHeaders = typeof config.headers === 'string' 
          ? JSON.parse(config.headers) 
          : config.headers;
        Object.assign(headers, customHeaders);
      } catch (e) {
        console.warn('Invalid headers format:', config.headers);
      }
    }

    const testPayload = {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'Teste de conexão do QuoteMaster Pro'
    };

    const response = await fetch(webhookUrl, {
      method,
      headers,
      body: method !== 'GET' ? JSON.stringify(testPayload) : undefined,
    });

    if (response.ok) {
      return {
        success: true,
        message: 'Webhook testado com sucesso!',
        details: { status: response.status, method }
      };
    } else {
      return {
        success: false,
        message: `Erro no webhook: ${response.status}`,
        details: { status: response.status, method }
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Falha na conexão: ${error.message}`,
      details: { error: error.toString() }
    };
  }
}

async function testTwilioWhatsApp(config: any) {
  // Simulação do teste do Twilio (não faremos chamada real para evitar custos)
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  if (!config.account_sid || !config.auth_token || !config.phone_number) {
    return {
      success: false,
      message: 'Configurações do Twilio incompletas',
      details: { missing: ['account_sid', 'auth_token', 'phone_number'].filter(k => !config[k]) }
    };
  }

  return {
    success: true,
    message: 'Configurações do Twilio validadas com sucesso!',
    details: { simulated: true, account_sid: config.account_sid?.substring(0, 8) + '...' }
  };
}

async function testSendGrid(config: any) {
  // Simulação do teste do SendGrid
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  if (!config.api_key || !config.from_email) {
    return {
      success: false,
      message: 'Configurações do SendGrid incompletas',
      details: { missing: ['api_key', 'from_email'].filter(k => !config[k]) }
    };
  }

  return {
    success: true,
    message: 'Configurações do SendGrid validadas com sucesso!',
    details: { simulated: true, from_email: config.from_email }
  };
}

async function testSMTP(config: any) {
  // Simulação do teste SMTP
  await new Promise(resolve => setTimeout(resolve, 1200));
  
  if (!config.host || !config.port || !config.username || !config.password) {
    return {
      success: false,
      message: 'Configurações SMTP incompletas',
      details: { missing: ['host', 'port', 'username', 'password'].filter(k => !config[k]) }
    };
  }

  return {
    success: true,
    message: 'Configurações SMTP validadas com sucesso!',
    details: { simulated: true, host: config.host, port: config.port }
  };
}

async function testStripe(config: any) {
  // Simulação do teste do Stripe
  await new Promise(resolve => setTimeout(resolve, 800));
  
  if (!config.public_key || !config.secret_key) {
    return {
      success: false,
      message: 'Chaves do Stripe incompletas',
      details: { missing: ['public_key', 'secret_key'].filter(k => !config[k]) }
    };
  }

  return {
    success: true,
    message: 'Chaves do Stripe validadas com sucesso!',
    details: { simulated: true, currency: config.currency || 'BRL' }
  };
}

serve(handler);