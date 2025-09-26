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

    const { conversationId, message, messageHistory = [] } = await req.json();

    console.log('Processing chat message:', { conversationId, message });

    // Construir histórico da conversa
    const messages = [
      {
        role: 'system',
        content: `Você é um assistente comprador especializado em criar RFQs (Request for Quote) para condomínios e empresas no Brasil.

OBJETIVO: Coletar informações específicas para gerar uma cotação profissional e completa.

PROCESSO:
1. Identifique a CATEGORIA do que o cliente precisa
2. Colete ESPECIFICAÇÕES técnicas detalhadas
3. Determine QUANTIDADES precisas  
4. Estabeleça PRAZO de entrega
5. Identifique ORÇAMENTO aproximado
6. Quando tiver informações suficientes, gere a RFQ

SEMPRE:
- Faça UMA pergunta focada por vez
- Seja específico e técnico quando necessário
- Sugira opções práticas que o cliente possa clicar
- Use seu conhecimento sobre produtos brasileiros e padrões de mercado

CATEGORIAS PRINCIPAIS:
- Limpeza e higiene (detergentes, desinfetantes, materiais)
- Manutenção predial (elétrica, hidráulica, pintura, reparos)
- Segurança (equipamentos, monitoramento, controle de acesso)
- Jardinagem e paisagismo (plantas, fertilizantes, ferramentas)
- Construção e reforma (materiais, ferramentas, serviços)
- Escritório e administração (papelaria, equipamentos, móveis)

ESPECIFICAÇÕES IMPORTANTES:
- Marcas preferenciais ou genéricas
- Certificações necessárias (Inmetro, ISO, etc.)
- Dimensões, capacidades, potências
- Cores, modelos, versões específicas
- Compatibilidades técnicas

INFORMAÇÕES OBRIGATÓRIAS PARA RFQ:
- Título claro e objetivo
- Lista de itens com descrições técnicas
- Quantidades específicas por item
- Unidades de medida (un, kg, l, m², etc.)
- Prazo de entrega desejado
- Local de entrega

Quando tiver todas as informações, responda com "GERAR_RFQ:" seguido do JSON.

Formato da RFQ final:
{
  "title": "Título profissional da RFQ",
  "description": "Descrição detalhada incluindo contexto de uso",
  "items": [
    {
      "product_name": "Nome técnico específico do produto",
      "quantity": número_inteiro,
      "unit": "unidade de medida",
      "description": "Especificações técnicas detalhadas, marcas, certificações"
    }
  ],
  "deadline_days": número_de_dias,
  "considerations": ["Consideração técnica 1", "Prazo de entrega", "Local de entrega"]
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
    if (aiResponse.includes('GERAR_RFQ:')) {
      const jsonPart = aiResponse.split('GERAR_RFQ:')[1].trim();
      try {
        const quoteData = JSON.parse(jsonPart);
        console.log('📝 Gerando RFQ no banco:', quoteData);
        
        // Buscar user info
        const { data: userData } = await supabaseClient.auth.getUser();
        const userId = userData?.user?.id;
        
        if (!userId) {
          throw new Error('Usuário não autenticado');
        }

        // Buscar client_id do usuário
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('client_id')
          .eq('id', userId)
          .single();

        if (!profile?.client_id) {
          throw new Error('Cliente não encontrado');
        }

        // Calcular total aproximado (placeholder)
        const estimatedTotal = quoteData.items.reduce((sum: number, item: any) => {
          // Estimativa básica baseada na quantidade
          return sum + (item.quantity * 100); // R$ 100 por unidade como estimativa
        }, 0);

        // Inserir cotação
        const { data: newQuote, error: quoteError } = await supabaseClient
          .from('quotes')
          .insert({
            title: quoteData.title,
            description: quoteData.description,
            client_id: profile.client_id,
            created_by: userId,
            status: 'draft',
            total: estimatedTotal,
            deadline: quoteData.deadline_days ? 
              new Date(Date.now() + quoteData.deadline_days * 24 * 60 * 60 * 1000).toISOString() : 
              null
          })
          .select()
          .single();

        if (quoteError) throw quoteError;

        console.log('✅ RFQ criada:', newQuote.id);

        // Inserir itens da cotação
        if (quoteData.items?.length > 0) {
          const items = quoteData.items.map((item: any) => ({
            quote_id: newQuote.id,
            client_id: profile.client_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: null, // Será preenchido pelos fornecedores
            total: null
          }));

          const { error: itemsError } = await supabaseClient
            .from('quote_items')
            .insert(items);

          if (itemsError) {
            console.error('Erro ao inserir itens:', itemsError);
          }
        }

        return new Response(JSON.stringify({
          response: `🎉 Perfeito! Criei sua RFQ #${newQuote.id} com ${quoteData.items.length} itens. Você pode visualizá-la na página de cotações para enviar aos fornecedores.`,
          quote: quoteData,
          quoteId: newQuote.id,
          suggestions: ['Ver minha cotação', 'Criar outra RFQ', 'Enviar para fornecedores']
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (parseError) {
        console.error('Erro ao gerar RFQ:', parseError);
        return new Response(JSON.stringify({
          response: "Ocorreu um erro ao criar a RFQ. Por favor, tente novamente.",
          suggestions: ['Tentar novamente', 'Começar do zero']
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
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