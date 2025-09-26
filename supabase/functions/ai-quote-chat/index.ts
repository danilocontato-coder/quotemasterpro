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

    if (!openaiApiKey) {
      console.error('OpenAI API key resolved to empty string. Check system_settings.openai_api_key format.');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key inválida nas configurações do sistema.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { conversationId, message, messageHistory = [] } = await req.json();

    console.log('Processing chat message:', { conversationId, message });

    // Buscar informações do cliente atual para contexto
    const { data: userData } = await supabaseClient.auth.getUser();
    const userId = userData?.user?.id;
    
    let clientInfo = { name: 'Cliente', type: 'empresa', sector: 'geral' };
    if (userId) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('client_id')
        .eq('id', userId)
        .single();

      if (profile?.client_id) {
        const { data: client } = await supabaseClient
          .from('clients')
          .select('name, company_name, notes')
          .eq('id', profile.client_id)
          .single();

        if (client) {
          clientInfo.name = client.name;
          clientInfo.type = client.company_name ? 'empresa' : 'condominio';
          
          // Detectar setor baseado no nome e notas da empresa
          const fullText = `${client.name} ${client.company_name || ''} ${client.notes || ''}`.toLowerCase();
          
          if (fullText.includes('condomin') || fullText.includes('predial') || fullText.includes('sínd')) {
            clientInfo.sector = 'condominio';
          } else if (fullText.includes('hospital') || fullText.includes('clínica') || fullText.includes('médico') || fullText.includes('saúde')) {
            clientInfo.sector = 'saude';
          } else if (fullText.includes('escola') || fullText.includes('universidade') || fullText.includes('educação')) {
            clientInfo.sector = 'educacao';
          } else if (fullText.includes('indústria') || fullText.includes('fábrica') || fullText.includes('manufatura')) {
            clientInfo.sector = 'industria';
          } else if (fullText.includes('restaurante') || fullText.includes('hotel') || fullText.includes('alimentação')) {
            clientInfo.sector = 'alimentacao';
          } else if (fullText.includes('escritório') || fullText.includes('consultoria') || fullText.includes('advocacia')) {
            clientInfo.sector = 'escritorio';
          } else {
            clientInfo.sector = 'geral';
          }
        }
      }
    }

    // Definir categorias e sugestões baseadas no setor
    const sectorCategories: Record<string, string[]> = {
      condominio: [
        'Limpeza e higiene (detergentes, desinfetantes, materiais)',
        'Manutenção predial (elétrica, hidráulica, pintura, reparos)',
        'Segurança (equipamentos, monitoramento, controle de acesso)',
        'Jardinagem e paisagismo (plantas, fertilizantes, ferramentas)',
        'Construção e reforma (materiais, ferramentas, serviços)',
        'Administração predial (papelaria, equipamentos, móveis)'
      ],
      saude: [
        'Equipamentos médicos e hospitalares',
        'Materiais de limpeza hospitalar e desinfecção',
        'Medicamentos e insumos farmacêuticos',
        'Mobiliário hospitalar e clínico',
        'Equipamentos de proteção individual (EPIs)',
        'Sistemas de monitoramento e segurança'
      ],
      educacao: [
        'Material escolar e didático',
        'Equipamentos de informática e audiovisual',
        'Mobiliário escolar e administrativo',
        'Materiais de limpeza e manutenção',
        'Equipamentos esportivos e recreativos',
        'Serviços de alimentação escolar'
      ],
      industria: [
        'Matérias-primas e insumos de produção',
        'Equipamentos industriais e máquinas',
        'Ferramentas e equipamentos de manutenção',
        'Equipamentos de segurança do trabalho',
        'Sistemas de automação e controle',
        'Serviços de logística e transporte'
      ],
      alimentacao: [
        'Ingredientes e insumos alimentares',
        'Equipamentos de cozinha industrial',
        'Embalagens e descartáveis',
        'Produtos de limpeza para cozinha',
        'Equipamentos de refrigeração',
        'Uniformes e equipamentos de segurança'
      ],
      escritorio: [
        'Material de escritório e papelaria',
        'Equipamentos de informática',
        'Mobiliário corporativo',
        'Serviços de telecomunicações',
        'Material de limpeza para escritórios',
        'Equipamentos de segurança patrimonial'
      ],
      geral: [
        'Materiais e insumos diversos',
        'Equipamentos e ferramentas',
        'Serviços de manutenção',
        'Material de limpeza',
        'Equipamentos de segurança',
        'Mobiliário e decoração'
      ]
    };

    const categories = sectorCategories[clientInfo.sector] || sectorCategories.geral;

    // Construir histórico da conversa
    const messages = [
      {
        role: 'system',
        content: `Você é um assistente comprador especializado em criar RFQs (Request for Quote) para empresas no Brasil.

INFORMAÇÕES DO CLIENTE:
- Nome: ${clientInfo.name}
- Tipo: ${clientInfo.type}
- Setor: ${clientInfo.sector}

OBJETIVO: Coletar informações específicas para gerar uma cotação profissional e completa para o setor ${clientInfo.sector}.

PROCESSO:
1. Identifique a CATEGORIA do que o cliente precisa (use as categorias adequadas para o setor)
2. Colete ESPECIFICAÇÕES técnicas detalhadas
3. Determine QUANTIDADES precisas  
4. Estabeleça PRAZO de entrega
5. Identifique ORÇAMENTO aproximado
6. Quando tiver informações suficientes, gere a RFQ

SEMPRE:
- Faça UMA pergunta focada por vez
- Seja específico e técnico quando necessário
- Quando listar opções ou exemplos, SEMPRE inclua sugestões específicas no final da resposta
- Use seu conhecimento sobre produtos brasileiros e padrões de mercado para o setor ${clientInfo.sector}
- Adapte sua linguagem ao contexto (${clientInfo.type === 'condominio' ? 'condomínio' : 'empresa'})

FORMATO DE SUGESTÕES:
Quando der exemplos ou opções, termine sua resposta com:
[SUGESTÕES: "Opção 1", "Opção 2", "Opção 3", "Opção 4"]

Exemplos de como usar:
- Se perguntou sobre tipos de detergente: [SUGESTÕES: "Detergente neutro", "Detergente alcalino", "Detergente ácido", "Detergente enzimático"]
- Se perguntou sobre quantidades: [SUGESTÕES: "1-10 unidades", "11-50 unidades", "51-100 unidades", "Mais de 100 unidades"]
- Se perguntou sobre prazo: [SUGESTÕES: "Até 7 dias", "15 dias", "30 dias", "Sem pressa"]

CATEGORIAS PARA ESTE SETOR (${clientInfo.sector}):
${categories.map((cat: string) => `- ${cat}`).join('\n')}

ESPECIFICAÇÕES IMPORTANTES:
- Marcas preferenciais ou genéricas
- Certificações necessárias (Inmetro, ISO, ANVISA, etc.)
- Dimensões, capacidades, potências
- Cores, modelos, versões específicas
- Compatibilidades técnicas
- Normas específicas do setor

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

    // Extrair sugestões da resposta da IA
    let suggestions: string[] = [];
    let cleanResponse = aiResponse;
    
    // Procurar por sugestões no formato [SUGESTÕES: "item1", "item2", ...]
    const suggestionsMatch = aiResponse.match(/\[SUGESTÕES:\s*([^\]]+)\]/);
    if (suggestionsMatch) {
      try {
        // Extrair as sugestões entre aspas
        const suggestionsText = suggestionsMatch[1];
        const matches = suggestionsText.match(/"([^"]+)"/g);
        if (matches) {
          suggestions = matches.map((match: string) => match.slice(1, -1)); // Remove as aspas
        }
        // Remove a linha de sugestões da resposta
        cleanResponse = aiResponse.replace(/\[SUGESTÕES:[^\]]+\]/, '').trim();
      } catch (error) {
        console.error('Erro ao extrair sugestões:', error);
        // Fallback para sugestões automáticas
        suggestions = extractSuggestions(aiResponse, message, clientInfo.sector);
      }
    } else {
      // Se não há sugestões explícitas, usar as automáticas
      suggestions = extractSuggestions(aiResponse, message, clientInfo.sector);
    }
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

    // Extrair sugestões do texto da IA (fallback)
    // const suggestions = extractSuggestions(aiResponse, message, clientInfo.sector);

    return new Response(JSON.stringify({
      response: cleanResponse,
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

function extractSuggestions(aiResponse: string, userMessage: string, clientSector: string = 'geral'): string[] {
  const suggestions: string[] = [];
  
  // Sugestões contextuais baseadas na mensagem do usuário
  const lowerMessage = userMessage.toLowerCase();
  const lowerResponse = aiResponse.toLowerCase();

  // Definir sugestões por setor
  const sectorSuggestions: Record<string, { categories: string[]; maintenance: string[]; cleaning: string[] }> = {
    condominio: {
      categories: ['Material de limpeza', 'Manutenção predial', 'Equipamentos de segurança', 'Serviços de jardinagem'],
      maintenance: ['Manutenção elétrica', 'Manutenção hidráulica', 'Pintura', 'Reparos gerais'],
      cleaning: ['Produtos de limpeza', 'Equipamentos de limpeza', 'Materiais descartáveis', 'Serviços de limpeza']
    },
    saude: {
      categories: ['Equipamentos médicos', 'Material hospitalar', 'Medicamentos', 'EPIs médicos'],
      maintenance: ['Manutenção de equipamentos', 'Calibração de aparelhos', 'Limpeza hospitalar', 'Desinfecção'],
      cleaning: ['Desinfetantes hospitalares', 'Material estéril', 'Equipamentos de limpeza', 'EPIs de limpeza']
    },
    educacao: {
      categories: ['Material escolar', 'Equipamentos de informática', 'Mobiliário escolar', 'Material didático'],
      maintenance: ['Manutenção de equipamentos', 'Reparos prediais', 'Limpeza escolar', 'Jardinagem'],
      cleaning: ['Material de limpeza escolar', 'Produtos de higiene', 'Equipamentos de limpeza', 'Descartáveis']
    },
    industria: {
      categories: ['Matérias-primas', 'Equipamentos industriais', 'Ferramentas', 'EPIs industriais'],
      maintenance: ['Manutenção industrial', 'Peças de reposição', 'Lubrificantes', 'Ferramentas especiais'],
      cleaning: ['Produtos industriais', 'Desengraxantes', 'Solventes', 'Equipamentos especiais']
    },
    alimentacao: {
      categories: ['Ingredientes', 'Equipamentos de cozinha', 'Embalagens', 'Produtos de higiene'],
      maintenance: ['Manutenção de equipamentos', 'Peças para cozinha', 'Limpeza industrial', 'Calibração'],
      cleaning: ['Sanitizantes', 'Detergentes alimentares', 'Material de higiene', 'Descartáveis']
    },
    escritorio: {
      categories: ['Material de escritório', 'Equipamentos de informática', 'Mobiliário', 'Telecomunicações'],
      maintenance: ['Manutenção de TI', 'Suporte técnico', 'Limpeza corporativa', 'Reformas'],
      cleaning: ['Produtos de limpeza', 'Material de higiene', 'Equipamentos de limpeza', 'Descartáveis']
    },
    geral: {
      categories: ['Materiais diversos', 'Equipamentos', 'Serviços', 'Manutenção geral'],
      maintenance: ['Manutenção geral', 'Reparos diversos', 'Limpeza', 'Conservação'],
      cleaning: ['Produtos de limpeza', 'Material de higiene', 'Equipamentos', 'Serviços de limpeza']
    }
  };

  const sectorData = sectorSuggestions[clientSector] || sectorSuggestions.geral;

  // Se está perguntando sobre categoria
  if (lowerResponse.includes('categoria') || lowerResponse.includes('tipo de')) {
    suggestions.push(...sectorData.categories);
  }
  
  // Se está perguntando sobre quantidade
  else if (lowerResponse.includes('quantidade') || lowerResponse.includes('quantos')) {
    suggestions.push('Pequena quantidade', 'Quantidade média', 'Grande quantidade', 'Não sei ainda');
  }
  
  // Se está perguntando sobre prazo
  else if (lowerResponse.includes('prazo') || lowerResponse.includes('quando')) {
    suggestions.push('Urgente (até 7 dias)', 'Moderado (15 dias)', 'Flexível (30 dias)', 'Não tenho pressa');
  }
  
  // Se está perguntando sobre orçamento
  else if (lowerResponse.includes('orçamento') || lowerResponse.includes('valor')) {
    suggestions.push('Até R$ 1.000', 'R$ 1.000 - R$ 5.000', 'R$ 5.000 - R$ 20.000', 'Acima de R$ 20.000');
  }

  // Sugestões específicas por contexto
  else if (lowerMessage.includes('limpeza') || lowerResponse.includes('limpeza')) {
    suggestions.push(...sectorData.cleaning);
  }

  else if (lowerMessage.includes('manutenção') || lowerResponse.includes('manutenção')) {
    suggestions.push(...sectorData.maintenance);
  }

  // Sugestões gerais se não há contexto específico
  else if (suggestions.length === 0) {
    if (lowerResponse.includes('?')) {
      suggestions.push('Sim', 'Não', 'Preciso de mais detalhes', 'Tenho outras necessidades');
    } else {
      suggestions.push(...sectorData.categories);
    }
  }

  return suggestions.slice(0, 4); // Limitar a 4 sugestões
}