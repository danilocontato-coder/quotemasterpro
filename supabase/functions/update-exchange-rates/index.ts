import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AwesomeAPIResponse {
  code: string;
  codein: string;
  name: string;
  high: string;
  low: string;
  varBid: string;
  pctChange: string;
  bid: string;
  ask: string;
  timestamp: string;
  create_date: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[update-exchange-rates] Iniciando atualização de taxas de câmbio...');

    // Buscar taxa atual USD -> BRL da AwesomeAPI
    const response = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
    
    if (!response.ok) {
      throw new Error(`AwesomeAPI retornou status ${response.status}`);
    }

    const data = await response.json() as { USDBRL: AwesomeAPIResponse };
    const usdBrlRate = parseFloat(data.USDBRL.bid);

    console.log(`[update-exchange-rates] Taxa obtida: 1 USD = ${usdBrlRate} BRL`);

    // Inserir ou atualizar taxa no banco
    const { error: upsertError } = await supabase
      .from('exchange_rates')
      .upsert({
        currency_from: 'USD',
        currency_to: 'BRL',
        rate: usdBrlRate,
        effective_date: new Date().toISOString().split('T')[0],
        source: 'awesomeapi',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'currency_from,currency_to,effective_date'
      });

    if (upsertError) {
      console.error('[update-exchange-rates] Erro ao salvar taxa:', upsertError);
      throw upsertError;
    }

    console.log('[update-exchange-rates] ✅ Taxa atualizada com sucesso!');

    return new Response(
      JSON.stringify({ 
        success: true, 
        rate: usdBrlRate,
        source: 'awesomeapi',
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[update-exchange-rates] Erro:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});