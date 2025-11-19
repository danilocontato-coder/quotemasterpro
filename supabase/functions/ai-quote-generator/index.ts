import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { trackAIUsage } from '../_shared/track-ai-usage.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar chave da API do OpenAI das configurações do sistema (superadmin)
    const possibleKeys = ['openai_api_key', 'OPENAI_API_KEY', 'ai_openai_api_key'];
    let aiSettings: any = null;
    let settingsError: any = null;

    for (const k of possibleKeys) {
      const { data, error } = await supabaseClient
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', k)
        .single();
      if (data?.setting_value) { aiSettings = data; break; }
      if (!settingsError) settingsError = error;
    }

    if (!aiSettings?.setting_value) {
      // Fallback: usar secret OPENAI_API_KEY se existir
      const envKey = Deno.env.get('OPENAI_API_KEY');
      if (envKey) {
        aiSettings = { setting_value: envKey } as any;
      }
    }

    if (!aiSettings?.setting_value) {
      console.error('[ai-quote-generator] OpenAI API key not found in settings or env:', settingsError);
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normaliza formato da chave (string direta, string JSON ou objeto)
    const rawKey = aiSettings.setting_value as unknown;
    let openaiApiKey = '';

    const pickFromObj = (obj: Record<string, unknown>) => {
      const candidates = [
        obj.value,
        obj.apiKey,
        obj.api_key,
        obj.OPENAI_API_KEY,
        obj.key,
        obj.openai_api_key,
      ];
      return (candidates.find((v) => typeof v === 'string' && v.trim().length > 0) as string | undefined)?.trim() || '';
    };

    if (typeof rawKey === 'string') {
      const s = rawKey.trim();
      if (s.startsWith('{') && s.endsWith('}')) {
        try {
          const parsed = JSON.parse(s);
          if (parsed && typeof parsed === 'object') {
            openaiApiKey = pickFromObj(parsed as Record<string, unknown>);
          }
        } catch (_) {/* ignore parse error */}
      }
      if (!openaiApiKey) openaiApiKey = s; // assume já é a chave pura
    } else if (rawKey && typeof rawKey === 'object') {
      openaiApiKey = pickFromObj(rawKey as Record<string, unknown>);
      if (!openaiApiKey) {
        const v = (rawKey as Record<string, unknown>).value;
        if (v && typeof v === 'object') {
          openaiApiKey = pickFromObj(v as Record<string, unknown>);
        }
      }
    }

    if (!openaiApiKey) {
      console.error('[ai-quote-generator] OpenAI key vazia após normalização.');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key inválida nas configurações do sistema.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { description, clientInfo, preferences } = await req.json();

    console.log('Generating AI quote for:', { description, clientInfo, preferences });

    // Obter client_id do usuário autenticado via JWT
    const authHeader = req.headers.get('Authorization');
    let effectiveClientId = clientInfo?.client_id || 'unknown';
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
        
        if (!userError && user) {
          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('client_id')
            .eq('id', user.id)
            .single();
          
          if (profile?.client_id) {
            effectiveClientId = profile.client_id;
            console.log('[ai-quote-generator] client_id obtido do JWT:', effectiveClientId);
          }
        }
      } catch (jwtError) {
        console.error('[ai-quote-generator] Erro ao obter client_id do JWT:', jwtError);
      }
    }
    
    console.log('[ai-quote-generator] client_id final:', effectiveClientId, {
      from_payload: clientInfo?.client_id || null,
      from_jwt: effectiveClientId !== 'unknown' && effectiveClientId !== clientInfo?.client_id
    });

    // Prompt para gerar cotação estruturada
    const systemPrompt = `Você é um assistente especializado em criar cotações detalhadas para condomínios e empresas no Brasil.

Baseado na descrição fornecida, gere uma cotação estruturada com:
1. Título claro e profissional
2. Lista de itens necessários com quantidades estimadas
3. Descrições técnicas apropriadas
4. Considerações especiais se aplicável

Seja preciso e profissional. Use termos técnicos apropriados para o setor.

Responda APENAS em formato JSON com esta estrutura exata:
{
  "title": "Título da cotação",
  "description": "Descrição detalhada expandida",
  "items": [
    {
      "product_name": "Nome do produto/serviço",
      "quantity": número_inteiro,
      "unit": "unidade (ex: m², kg, peça, etc.)",
      "description": "Descrição técnica detalhada"
    }
  ],
  "considerations": ["Consideração 1", "Consideração 2"]
}`;

    const userPrompt = `
Descrição da necessidade: ${description}

Informações do cliente:
- Nome: ${clientInfo?.name || 'Não informado'}
- Tipo: ${clientInfo?.type || 'Condomínio'}
- Localização: ${clientInfo?.location || 'Não informado'}

Preferências:
- Orçamento aproximado: ${preferences?.budget || 'Não informado'}
- Prazo: ${preferences?.deadline || 'Não informado'}
- Prioridades: ${preferences?.priorities || 'Qualidade e prazo'}

Gere uma cotação detalhada e profissional.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;

    console.log('Generated content:', generatedContent);

    // Rastrear uso de tokens - SEMPRE tentar rastrear, mesmo sem client_id
    if (data.usage) {
      console.log('[ai-quote-generator] Rastreando uso de IA:', {
        client_id: effectiveClientId,
        model: data.model || 'gpt-4o-mini',
        total_tokens: data.usage.total_tokens || 0,
        prompt_tokens: data.usage.prompt_tokens || 0,
        completion_tokens: data.usage.completion_tokens || 0
      });
      
      trackAIUsage({
        supabaseUrl: Deno.env.get('SUPABASE_URL') || '',
        supabaseKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
        clientId: effectiveClientId,
        provider: 'openai',
        model: data.model || 'gpt-4o-mini',
        feature: 'quote_generator',
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0,
        requestId: data.id,
        metadata: {
          description_length: description?.length || 0,
          client_id_source: effectiveClientId === 'unknown' ? 'none' : (clientInfo?.client_id ? 'payload' : 'jwt'),
          client_id_missing: effectiveClientId === 'unknown'
        }
      }).catch(err => console.error('[track-ai-usage] Erro ao rastrear:', err));
    } else {
      console.warn('[ai-quote-generator] Nenhum dado de usage retornado pela OpenAI');
    }

    // Parse do JSON gerado com tratamento UTF-8
    let parsedQuote;
    try {
      // Limpar possíveis caracteres de controle e garantir UTF-8
      const cleanContent = generatedContent
        .trim()
        .replace(/^\s*```json\s*/i, '')  // Remove markdown code blocks
        .replace(/\s*```\s*$/, '')
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Remove caracteres de controle
      
      parsedQuote = JSON.parse(cleanContent);
      
      // Validar estrutura
      if (!parsedQuote.title || !Array.isArray(parsedQuote.items)) {
        throw new Error('Invalid quote structure');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('Raw content:', generatedContent);
      // Fallback se o parsing falhar
      parsedQuote = {
        title: "Cotação Gerada por IA",
        description: description,
        items: [{
          product_name: "Item a ser especificado",
          quantity: 1,
          unit: "unidade",
          description: "Especificação a ser detalhada"
        }],
        considerations: ["Especificações detalhadas necessárias"]
      };
    }

    // Retornar com encoding UTF-8 explícito
    const responseBody = JSON.stringify({
      success: true,
      quote: parsedQuote
    });

    return new Response(responseBody, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': new TextEncoder().encode(responseBody).length.toString()
      },
    });

  } catch (error) {
    console.error('Error in ai-quote-generator:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ 
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});