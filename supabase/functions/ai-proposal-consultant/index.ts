import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, prompt } = await req.json();
    
    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Buscar chave da API Perplexity do sistema
    const { data: settingData, error: settingError } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'perplexity_api_key')
      .single();
    
    if (settingError || !settingData) {
      throw new Error('PERPLEXITY_API_KEY não configurada no sistema');
    }
    
    const PERPLEXITY_API_KEY = settingData.setting_value?.value;
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY vazia');
    }

    // Validar formato da API key
    if (!PERPLEXITY_API_KEY.startsWith('pplx-')) {
      throw new Error('PERPLEXITY_API_KEY com formato inválido. Deve começar com "pplx-"');
    }

    console.log('🧠 Consultoria IA - Tipo:', type);
    console.log('🔑 API Key configurada:', PERPLEXITY_API_KEY ? 'Sim' : 'Não');
    console.log('✅ PERPLEXITY_API_KEY válida');

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        temperature: 0.3,
        max_tokens: 3000,
        messages: [
          {
            role: 'system',
            content: 'Você é um consultor especializado em análise de propostas comerciais. Responda sempre em JSON válido conforme solicitado.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro Perplexity:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
    }

    const aiData = await response.json();
    const content = aiData.choices[0]?.message?.content || '{}';
    
    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch {
      console.error('Failed to parse AI response:', content);
      analysis = { error: 'Failed to parse AI response' };
    }

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na consultoria IA:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
