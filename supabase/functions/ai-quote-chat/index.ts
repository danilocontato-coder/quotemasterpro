import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      console.error('OpenAI API key not found in settings or env');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured in system settings' }), 
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
      // Suporte para nesting: { value: { key: 'sk-...' } }
      if (!openaiApiKey) {
        const v = (rawKey as Record<string, unknown>).value;
        if (v && typeof v === 'object') {
          openaiApiKey = pickFromObj(v as Record<string, unknown>);
        }
      }
    }
    console.log('[ai-quote-chat] Key source shape:', {
      isString: typeof rawKey === 'string',
      isObject: !!rawKey && typeof rawKey === 'object',
      objectKeys: rawKey && typeof rawKey === 'object' ? Object.keys(rawKey as Record<string, unknown>) : undefined,
    });


    if (!openaiApiKey) {
      console.error('OpenAI API key resolved to empty string. Check system_settings.openai_api_key format.');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key inválida nas configurações do sistema.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { conversationId, message, messageHistory } = await req.json();

    console.log('Processing chat message:', { conversationId, message });

    // Construir histórico da conversa
    const messages = [
      {
        role: 'system',
        content: `Você é um assistente especializado em ajudar a criar cotações (RFQs) detalhadas para condomínios e empresas no Brasil.

Sua função é:
1. Fazer perguntas inteligentes para obter todas as informações necessárias
2. Sugerir opções práticas que o usuário possa clicar
3. Quando tiver informações suficientes, gerar uma cotação estruturada

SEMPRE responda em português e seja conversacional. Faça UMA pergunta por vez.

Para gerar sugestões úteis, considere:
- Categorias comuns: limpeza, manutenção, segurança, jardinagem, administração
- Especificações técnicas necessárias
- Quantidades aproximadas
- Prazos típicos

Quando tiver informações suficientes, responda com "GERAR_COTACAO:" seguido do JSON da cotação.

Formato da cotação final:
{
  "title": "Título da cotação",
  "description": "Descrição detalhada",
  "items": [
    {
      "product_name": "Nome do produto/serviço",
      "quantity": número_inteiro,
      "unit": "unidade",
      "description": "Descrição técnica"
    }
  ],
  "considerations": ["Consideração 1", "Consideração 2"]
}`
      },
      ...messageHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('AI response:', aiResponse);

    // Verificar se a IA quer gerar uma cotação
    if (aiResponse.includes('GERAR_COTACAO:')) {
      const jsonPart = aiResponse.split('GERAR_COTACAO:')[1].trim();
      try {
        const quoteData = JSON.parse(jsonPart);
        return new Response(JSON.stringify({
          response: "Perfeito! Gerei sua cotação com base nas informações fornecidas. ✅",
          quote: quoteData,
          suggestions: []
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (parseError) {
        console.error('Error parsing quote JSON:', parseError);
      }
    }

    // Extrair sugestões do texto da IA
    const suggestions = extractSuggestions(aiResponse, message);

    return new Response(JSON.stringify({
      response: aiResponse,
      suggestions,
      quote: null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-quote-chat:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ 
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function extractSuggestions(aiResponse: string, userMessage: string): string[] {
  const suggestions: string[] = [];
  
  // Sugestões contextuais baseadas na mensagem do usuário
  const lowerMessage = userMessage.toLowerCase();
  const lowerResponse = aiResponse.toLowerCase();

  // Se está perguntando sobre categoria
  if (lowerResponse.includes('categoria') || lowerResponse.includes('tipo de')) {
    suggestions.push('Limpeza e higiene', 'Manutenção predial', 'Segurança', 'Jardinagem', 'Equipamentos');
  }
  
  // Se está perguntando sobre quantidade
  if (lowerResponse.includes('quantidade') || lowerResponse.includes('quantos')) {
    suggestions.push('Pequena quantidade', 'Quantidade média', 'Grande quantidade', 'Não sei ainda');
  }
  
  // Se está perguntando sobre prazo
  if (lowerResponse.includes('prazo') || lowerResponse.includes('quando')) {
    suggestions.push('Urgente (até 7 dias)', 'Moderado (15 dias)', 'Flexível (30 dias)', 'Não tenho pressa');
  }
  
  // Se está perguntando sobre orçamento
  if (lowerResponse.includes('orçamento') || lowerResponse.includes('valor')) {
    suggestions.push('Até R$ 1.000', 'R$ 1.000 - R$ 5.000', 'R$ 5.000 - R$ 20.000', 'Acima de R$ 20.000');
  }

  // Sugestões para limpeza
  if (lowerMessage.includes('limpeza')) {
    suggestions.push('Produtos de limpeza', 'Equipamentos de limpeza', 'Serviços de limpeza', 'Materiais descartáveis');
  }

  // Sugestões para manutenção
  if (lowerMessage.includes('manutenção')) {
    suggestions.push('Manutenção elétrica', 'Manutenção hidráulica', 'Pintura', 'Reparos gerais');
  }

  // Sugestões gerais se não há contexto específico
  if (suggestions.length === 0) {
    suggestions.push('Sim', 'Não', 'Preciso de mais detalhes', 'Tenho outras necessidades');
  }

  return suggestions.slice(0, 4); // Limitar a 4 sugestões
}