import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuoteRequest {
  pickup: {
    address: string;
    name: string;
    phone: string;
  };
  dropoff: {
    address: string;
    name: string;
    phone: string;
  };
  packageSize?: 'small' | 'medium' | 'large';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[UBER-QUOTE] Starting quote request');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Buscar credenciais Uber
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'uber_credentials')
      .single();

    if (settingsError || !settings?.setting_value) {
      console.error('[UBER-QUOTE] Credenciais não encontradas:', settingsError);
      throw new Error('Credenciais Uber não configuradas');
    }

    const uberCreds = settings.setting_value as any;
    const { customer_id, client_id, client_secret, api_url } = uberCreds;

    if (!customer_id || !client_id || !client_secret || !api_url) {
      throw new Error('Credenciais Uber incompletas');
    }

    console.log('[UBER-QUOTE] Autenticando com Uber...');

    // Obter access token
    const tokenResponse = await fetch(`${api_url}/v1/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id,
        client_secret,
        grant_type: 'client_credentials',
        scope: 'eats.deliveries direct.organizations',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[UBER-QUOTE] Erro na autenticação:', errorText);
      throw new Error('Falha na autenticação Uber');
    }

    const { access_token } = await tokenResponse.json();
    console.log('[UBER-QUOTE] Autenticado com sucesso');

    const body: QuoteRequest = await req.json();

    // Criar cotação
    const quotePayload = {
      pickup_address: body.pickup.address,
      pickup_name: body.pickup.name,
      pickup_phone_number: body.pickup.phone,
      dropoff_address: body.dropoff.address,
      dropoff_name: body.dropoff.name,
      dropoff_phone_number: body.dropoff.phone,
      manifest_items: [
        {
          name: 'Package',
          quantity: 1,
          size: body.packageSize || 'small',
        },
      ],
    };

    console.log('[UBER-QUOTE] Solicitando cotação...');

    const quoteResponse = await fetch(
      `${api_url}/v1/customers/${customer_id}/delivery_quotes`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quotePayload),
      }
    );

    if (!quoteResponse.ok) {
      const errorText = await quoteResponse.text();
      console.error('[UBER-QUOTE] Erro ao criar cotação:', errorText);
      throw new Error('Falha ao obter cotação Uber');
    }

    const quoteData = await quoteResponse.json();
    console.log('[UBER-QUOTE] Cotação obtida:', quoteData);

    return new Response(
      JSON.stringify({
        success: true,
        quote: {
          id: quoteData.id,
          fee: quoteData.fee,
          currency: quoteData.currency_type,
          pickup_eta: quoteData.pickup_eta,
          dropoff_eta: quoteData.dropoff_eta,
          expires_at: quoteData.expires_at,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[UBER-QUOTE] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
