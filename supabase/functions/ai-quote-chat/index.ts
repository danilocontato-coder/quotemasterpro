import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// Importar função de análise de produtos
import { analyzeProduct } from './product-matcher.ts';
// Importar função de rastreamento de IA
import { trackAIUsage } from '../_shared/track-ai-usage.ts';

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
    // Obter o token JWT do header Authorization
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    // Criar cliente Supabase com service role para operações admin
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Criar cliente Supabase com token do usuário para autenticação
    const supabaseUserClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
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
    const { data: userData } = await supabaseUserClient.auth.getUser();
    const userId = userData?.user?.id;
    
    let clientInfo = { name: 'Cliente', type: 'empresa', sector: 'geral', client_id: null };
    let historyContext = null;
    
    if (userId) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('client_id')
        .eq('id', userId)
        .single();

      if (profile?.client_id) {
        clientInfo.client_id = profile.client_id;
        
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

        // Buscar histórico de RFQs do cliente para análise e aprendizado
        const { data: clientHistory } = await supabaseClient
          .from('quotes')
          .select(`
            id, title, description, created_at,
            quote_items(product_name, quantity),
            suppliers(name, specialties)
          `)
          .eq('client_id', profile.client_id)
          .order('created_at', { ascending: false })
          .limit(15);

        // Buscar fornecedores mais usados pelo cliente
        const { data: quoteSuppliers } = await supabaseClient
          .from('quotes')
          .select(`
            suppliers(id, name, specialties, rating)
          `)
          .eq('client_id', profile.client_id)
          .not('supplier_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(30);

        if (clientHistory && clientHistory.length > 0) {
          // Analisar padrões do histórico para personalização
          const allProducts = clientHistory.flatMap((q: any) => q.quote_items?.map((i: any) => i.product_name) || []);
          const allSuppliers = quoteSuppliers?.map((q: any) => q.suppliers).filter(Boolean) || [];
          
          // Produtos mais frequentes
          const productFreq: Record<string, number> = {};
          allProducts.forEach((product: string) => {
            if (product) {
              productFreq[product] = (productFreq[product] || 0) + 1;
            }
          });
          
          // Fornecedores preferenciais
          const supplierFreq: Record<string, number> = {};
          allSuppliers.forEach((supplier: any) => {
            if (supplier?.name) {
              supplierFreq[supplier.name] = (supplierFreq[supplier.name] || 0) + 1;
            }
          });

          historyContext = {
            totalRFQs: clientHistory.length,
            commonProducts: Object.entries(productFreq)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 8)
              .map(([product]) => product),
            preferredSuppliers: Object.entries(supplierFreq)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 5)
              .map(([supplier]) => supplier),
            recentRFQs: clientHistory.slice(0, 3).map((q: any) => ({
              title: q.title,
              description: q.description,
              itemsCount: q.quote_items?.length || 0
            })),
            avgItemsPerRFQ: Math.round(
              clientHistory.reduce((sum: number, q: any) => sum + (q.quote_items?.length || 0), 0) / clientHistory.length
            )
          };
        }
      }
    }

    // Buscar fornecedores disponíveis para contexto inteligente da IA
    let availableSuppliers = [];
    try {
      // Só buscar fornecedores se estivermos numa conversa ativa com o cliente
      if (clientInfo.client_id) {
        // Extrair categorias da mensagem do usuário para sugerir fornecedores
        const messageCategories = extractCategoriesFromMessage(message, clientInfo.sector);
        
        if (messageCategories.length > 0) {
          console.log(`🤖 Buscando fornecedores para categorias: ${messageCategories.join(', ')}`);
          
          // Buscar dados do cliente para localização
          const { data: clientData } = await supabaseClient
            .from('clients')
            .select('address')
            .eq('id', clientInfo.client_id)
            .single();

          // Extrair localização (simplificado)
          let clientState = 'SP';
          let clientCity = 'São Paulo';
          
          if (clientData?.address) {
            const addressStr = typeof clientData.address === 'string' 
              ? clientData.address 
              : JSON.stringify(clientData.address);
            
            const stateMatch = addressStr.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/i);
            if (stateMatch) clientState = stateMatch[0].toUpperCase();
          }

          const { data: supplierSuggestions } = await supabaseClient
            .rpc('suggest_suppliers_for_quote', {
              _client_region: 'Brasil',
              _client_state: clientState,
              _client_city: clientCity,
              _categories: messageCategories,
              _max_suppliers: 8
            });
          
          availableSuppliers = supplierSuggestions || [];
          console.log(`🎯 Encontrados ${availableSuppliers.length} fornecedores sugeridos pela IA`);
        }
      }
    } catch (error) {
      console.log('Erro ao buscar fornecedores para contexto:', error);
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

${availableSuppliers.length > 0 ? `
FORNECEDORES DISPONÍVEIS PARA SUGESTÃO:
${availableSuppliers.slice(0, 5).map((s: any) => `- ${s.name} ${s.is_certified ? '🏆' : ''} (${s.city}/${s.state}) - Score: ${s.match_score}`).join('\n')}

CONTEXTO INTELIGENTE: A IA já identificou fornecedores adequados para este tipo de solicitação. Quando chegar na parte de escolher fornecedores, você pode mencionar os sugeridos acima e permitir que o cliente escolha entre:
- "Enviar para os fornecedores sugeridos automaticamente"
- "Apenas locais" 
- "Apenas certificados (🏆)"
- "Deixar eu escolher depois"
` : ''}

${historyContext ? `
HISTÓRICO E APRENDIZADO PERSONALIZADO:
- Total de RFQs anteriores: ${historyContext.totalRFQs}
- Média de itens por RFQ: ${historyContext.avgItemsPerRFQ}

PRODUTOS FREQUENTES DO CLIENTE:
${historyContext.commonProducts.length > 0 ? historyContext.commonProducts.map((p: string) => `- ${p}`).join('\n') : '- Nenhum histórico ainda'}

FORNECEDORES PREFERENCIAIS:
${historyContext.preferredSuppliers.length > 0 ? historyContext.preferredSuppliers.map((s: string) => `- ${s}`).join('\n') : '- Nenhum histórico ainda'}

ÚLTIMAS RFQs PARA REFERÊNCIA:
${historyContext.recentRFQs.map((rfq: any, i: number) => `${i+1}. "${rfq.title}" (${rfq.itemsCount} itens)`).join('\n')}

PERSONALIZAÇÃO: Use essas informações para:
- Sugerir produtos similares aos já pedidos
- Recomendar quantidades baseadas no histórico
- Mencionar fornecedores preferenciais quando relevante
- Ajustar o tom baseado no padrão de compras
` : ''}

OBJETIVO: Coletar informações específicas para gerar uma cotação profissional e completa para o setor ${clientInfo.sector}.

PROCESSO OTIMIZADO:
1. Identifique RAPIDAMENTE a categoria principal do que precisa
2. Colete apenas as especificações ESSENCIAIS (não detalhe demais)
3. Defina quantidades aproximadas (pode ser estimativa)
4. Estabeleça prazo básico
5. Configure fornecedores (local/certificado, múltipla seleção)
6. Quando tiver o MÍNIMO necessário, GERE e ENVIE a RFQ automaticamente

DIRETRIZES PARA AGILIDADE:
- Seja DIRETO e OBJETIVO
- Aceite respostas aproximadas e estimativas
- Não insista em detalhes técnicos se o cliente não souber
- Use opções práticas e rápidas
- Mantenha o foco na VELOCIDADE da criação da RFQ
- Máximo 4-5 perguntas antes de gerar a cotação
${historyContext ? '- PRIORIZE sugestões baseadas no histórico do cliente' : ''}

FLUXO DE PERGUNTAS OBRIGATÓRIAS:
1. CATEGORIA/PRODUTO - "Que tipo de produto/serviço você precisa?"${historyContext && historyContext.commonProducts.length > 0 ? ` (Sugerir: ${historyContext.commonProducts.slice(0, 3).join(', ')})` : ''}
2. QUANTIDADE - "Quantidade aproximada?" (aceitar estimativas)
3. PRAZO - "Qual o prazo?" (sugerir opções rápidas)
4. FORNECEDORES - "Prefere fornecedores locais, certificados ou ambos?"${historyContext && historyContext.preferredSuppliers.length > 0 ? ` (Mencionar preferenciais: ${historyContext.preferredSuppliers.slice(0, 2).join(', ')})` : ''}
5. GERAR E ENVIAR - Criar RFQ automaticamente e enviar para fornecedores selecionados

SEMPRE:
- Faça UMA pergunta RÁPIDA e focada por vez
- Priorize VELOCIDADE sobre perfeição técnica
- Aceite estimativas e "aproximadamente"
- Quando listar opções, SEMPRE inclua sugestões específicas no final
- Use linguagem simples e direta
- Seja PROATIVO: sugira quantidades típicas, prazos padrão
- NÃO peça informações desnecessárias
${historyContext ? '- PERSONALIZE sugestões baseadas no histórico de compras' : ''}

EXEMPLOS DE PERGUNTAS RÁPIDAS:
- "Qual categoria? Ex: Limpeza, Equipamentos, Materiais..."
- "Quantidade aproximada? Ex: Pequena (até 50), Média (50-200), Grande (200+)"
- "Prazo desejado? Ex: Urgente (7 dias), Normal (15 dias), Flexível (30 dias)"
- "Tipo de fornecedor? Ex: Locais, Certificados, Ambos, Qualquer um"

PARA SELEÇÃO DE FORNECEDORES:
- Sempre pergunte sobre preferência de fornecedores após definir produto/quantidade/prazo
- Ofereça opções: "Locais da sua região", "Certificados", "Ambos", "Qualquer um"
- Para múltipla escolha de fornecedores específicos use: [FORNECEDORES: "nome1", "nome2", "nome3"]

FORMATO DE SUGESTÕES (OBRIGATÓRIO):
TODA resposta DEVE terminar com sugestões contextuais clicáveis baseadas na pergunta feita:
[SUGESTÕES: "Opção 1", "Opção 2", "Opção 3", "Opção 4"]

EXEMPLOS DE SUGESTÕES POR CONTEXTO:
- Primeira pergunta: [SUGESTÕES: "Materiais de limpeza", "Equipamentos", "Serviços", "Tenho uma lista"]
- Sobre quantidade: [SUGESTÕES: "Pequena quantidade", "Quantidade média", "Grande quantidade", "Não sei ainda"]
- Sobre prazo: [SUGESTÕES: "Urgente (até 7 dias)", "Normal (15 dias)", "Flexível (30 dias)", "Sem pressa"]
- Sobre fornecedores: [SUGESTÕES: "Apenas locais", "Apenas certificados", "Ambos (local + certificado)", "Qualquer um"]
- Confirmações: [SUGESTÕES: "Sim, está correto", "Não, preciso ajustar", "Adicionar mais itens", "Gerar cotação"]

IMPORTANTE: NUNCA responda sem incluir as sugestões no formato [SUGESTÕES: ...]!

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

IMPORTANTE: Quando tiver todas as informações, responda APENAS com GERAR_RFQ: seguido do JSON puro, SEM nenhum texto introdutório, explicação ou blocos de código markdown.

Exemplo correto:
GERAR_RFQ:
{"title":"Cotação XYZ","description":"Detalhes"}

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
  "considerations": ["Consideração técnica 1", "Prazo de entrega", "Local de entrega"],
  "categories": ["categoria1", "categoria2"],
  "supplierPreferences": {
    "onlyLocal": boolean,
    "onlyCertified": boolean,
    "autoSend": boolean
  },
  "requiresVisit": boolean,
  "visitDeadline": "YYYY-MM-DD"
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
        'Content-Type': 'application/json; charset=utf-8',
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

    // Rastrear uso de tokens
    if (data.usage && clientInfo.client_id) {
      trackAIUsage({
        supabaseUrl: Deno.env.get('SUPABASE_URL') || '',
        supabaseKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
        clientId: clientInfo.client_id,
        provider: 'openai',
        model: data.model || 'gpt-5-2025-08-07',
        feature: 'quote_chat',
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0,
        requestId: data.id,
        metadata: {
          conversation_id: conversationId,
          user_message_length: message.length
        }
      }).catch(err => console.error('[track-ai-usage] Erro ao rastrear:', err));
    }

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
          console.log('✅ Sugestões extraídas da IA:', suggestions);
        }
        // Remove a linha de sugestões da resposta
        cleanResponse = aiResponse.replace(/\[SUGESTÕES:[^\]]+\]/, '').trim();
      } catch (error) {
        console.error('Erro ao extrair sugestões:', error);
        // Fallback para sugestões automáticas
        suggestions = extractSuggestions(aiResponse, message, clientInfo.sector);
      }
    } else {
      console.log('⚠️ IA não incluiu sugestões no formato correto, usando fallback');
      // Se não há sugestões explícitas, usar as automáticas
      suggestions = extractSuggestions(aiResponse, message, clientInfo.sector);
    }
    if (aiResponse.includes('GERAR_RFQ:')) {
      // Extrair apenas a parte após GERAR_RFQ:
      let jsonPart = aiResponse.split('GERAR_RFQ:')[1].trim();
      
      // Limpar a resposta para não mostrar JSON ao usuário
      const textBeforeRFQ = aiResponse.split('GERAR_RFQ:')[0].trim();
      cleanResponse = textBeforeRFQ || 'Perfeito! Tenho todas as informações necessárias. Criando sua cotação agora... ⏳';
      
      // Remover blocos de código markdown se existirem
      if (jsonPart.startsWith('```json')) {
        jsonPart = jsonPart.replace(/```json\s*/, '').replace(/\s*```[\s\S]*$/, '');
      } else if (jsonPart.startsWith('```')) {
        jsonPart = jsonPart.replace(/```\s*/, '').replace(/\s*```[\s\S]*$/, '');
      }
      
      // Encontrar o JSON válido entre chaves
      const jsonStart = jsonPart.indexOf('{');
      const jsonEnd = jsonPart.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        jsonPart = jsonPart.substring(jsonStart, jsonEnd + 1);
      }
      
      console.log('🔍 JSON extraído da IA:', jsonPart.substring(0, 100) + '...');
      console.log('💬 Resposta limpa para usuário:', cleanResponse);
      
      try {
        const quoteData = JSON.parse(jsonPart);
        console.log('📝 Gerando RFQ no banco:', quoteData);
        
        // Buscar user info
        const { data: userData } = await supabaseUserClient.auth.getUser();
        const userId = userData?.user?.id;
        
        if (!userId) {
          throw new Error('Usuário não autenticado');
        }

        // Buscar client_id do usuário
        const { data: profile, error: profileError } = await supabaseClient
          .from('profiles')
          .select('client_id, name, role')
          .eq('id', userId)
          .single();

        if (profileError) {
          console.error('❌ Erro ao buscar perfil:', profileError);
          throw new Error(`Erro ao buscar perfil: ${profileError.message}`);
        }

        if (!profile?.client_id) {
          console.error('❌ Cliente não encontrado no perfil');
          throw new Error('Cliente não encontrado no perfil do usuário');
        }

        console.log('✅ Perfil encontrado:', { userId, clientId: profile.client_id, name: profile.name });

        // Buscar nome do cliente para usar na cotação
        const { data: clientData } = await supabaseClient
          .from('clients')
          .select('name')
          .eq('id', profile.client_id)
          .single();

        const clientDisplayName = clientData?.name || profile.name || 'Cliente';

        // Buscar dados do cliente para sugestão inteligente de fornecedores
        const { data: clientDetails } = await supabaseClient
          .from('clients')
          .select('name, address')
          .eq('id', profile.client_id)
          .single();

        // Buscar fornecedores com IA inteligente baseada nas categorias
        let selectedSuppliers: any[] = [];
        if (quoteData.supplierPreferences && quoteData.categories && quoteData.categories.length > 0) {
          console.log('🤖 Buscando fornecedores inteligentes com IA para categorias:', quoteData.categories);
          
          try {
            // Extrair informações de localização do cliente
            let clientRegion = 'Brasil';
            let clientState = 'SP';
            let clientCity = 'São Paulo';
            
            if (clientDetails?.address) {
              const addressStr = typeof clientDetails.address === 'string' 
                ? clientDetails.address 
                : JSON.stringify(clientDetails.address);
              
              // Tentar extrair estado e cidade do endereço
              const stateMatch = addressStr.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/i);
              if (stateMatch) clientState = stateMatch[0].toUpperCase();
              
              const cityRegex = /cidade[:\s]*([^,\n]+)|city[:\s]*([^,\n]+)|([^,\n]+)\s*-\s*[A-Z]{2}/i;
              const cityMatch = addressStr.match(cityRegex);
              if (cityMatch) {
                clientCity = (cityMatch[1] || cityMatch[2] || cityMatch[3] || '').trim();
              }
            }

            console.log(`📍 Cliente localizado em: ${clientCity}, ${clientState}, ${clientRegion}`);

            // Usar função RPC para sugestões inteligentes
            const { data: suggestedSuppliers, error: suggestError } = await supabaseClient
              .rpc('suggest_suppliers_for_quote', {
                _client_region: clientRegion,
                _client_state: clientState,
                _client_city: clientCity,
                _categories: quoteData.categories,
                _max_suppliers: 15
              });

            if (suggestError) {
              console.error('Erro na sugestão inteligente:', suggestError);
              // Fallback para busca simples
              const { data: fallbackSuppliers } = await supabaseClient
                .from('suppliers')
                .select('*')
                .eq('status', 'active')
                .overlaps('specialties', quoteData.categories)
                .limit(10);
              selectedSuppliers = (fallbackSuppliers || []).map((s: any) => ({
                ...s,
                supplier_id: s.id
              }));
            } else {
              console.log(`🎯 IA sugeriu ${suggestedSuppliers?.length || 0} fornecedores com score de compatibilidade`);
              
              // Aplicar filtros de preferência do usuário
              let filteredSuppliers = suggestedSuppliers || [];
              
              if (quoteData.supplierPreferences.onlyLocal) {
                filteredSuppliers = filteredSuppliers.filter((s: any) => 
                  s.visibility_scope === 'region' && s.state === clientState
                );
                console.log(`🏠 Filtro local: ${filteredSuppliers.length} fornecedores locais`);
              }
              
              if (quoteData.supplierPreferences.onlyCertified) {
                filteredSuppliers = filteredSuppliers.filter((s: any) => s.is_certified);
                console.log(`🏆 Filtro certificados: ${filteredSuppliers.length} fornecedores certificados`);
              }

              // Ordenar por score de compatibilidade e pegar os melhores
              selectedSuppliers = filteredSuppliers
                .sort((a: any, b: any) => (b.match_score || 0) - (a.match_score || 0))
                .slice(0, 10)
                .map((s: any) => ({
                  ...s,
                  id: s.supplier_id || s.id
                }));
              
              console.log(`✅ Selecionados ${selectedSuppliers.length} fornecedores com IA`);
              
              // Log dos fornecedores selecionados com seus scores
              selectedSuppliers.forEach((supplier: any, index: number) => {
                console.log(`  ${index + 1}. ${supplier.name} - Score: ${supplier.match_score}, Certificado: ${supplier.is_certified ? '🏆' : '❌'}, Região: ${supplier.city}/${supplier.state}`);
              });
            }
            
          } catch (error) {
            console.error('Erro na sugestão inteligente de fornecedores:', error);
            selectedSuppliers = [];
          }
        }

        // 🛡️ VALIDAÇÃO: Filtrar fornecedores válidos antes de criar cotação
        const validSelectedSuppliers = selectedSuppliers.filter((s: any) => 
          s && 
          s.id && 
          typeof s.id === 'string' && 
          s.id.length === 36 &&
          s.id !== 'undefined'
        );
        
        // Log de warning se houver fornecedores inválidos
        if (validSelectedSuppliers.length < selectedSuppliers.length) {
          const invalidSuppliers = selectedSuppliers.filter((s: any) => !validSelectedSuppliers.includes(s));
          console.warn('[AI-QUOTE-CHAT] ⚠️ Fornecedores inválidos detectados e removidos:', 
            invalidSuppliers.map((s: any) => ({ name: s?.name, id: s?.id }))
          );
        }
        
        // Se nenhum fornecedor válido, retornar erro
        if (validSelectedSuppliers.length === 0 && selectedSuppliers.length > 0) {
          console.error('[AI-QUOTE-CHAT] ❌ Nenhum fornecedor válido após validação');
          return new Response(JSON.stringify({
            error: 'Nenhum fornecedor válido foi selecionado pela IA. Por favor, tente novamente ou selecione manualmente.'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        console.log('✅ Fornecedores validados:', {
          original_count: selectedSuppliers.length,
          valid_count: validSelectedSuppliers.length
        });
        
        // Total inicia zerado - será calculado quando os fornecedores responderem
        const estimatedTotal = 0;

        // Inserir cotação
        console.log('📝 Inserindo cotação no banco...');
        console.log('🤖 [AI-QUOTE] Total calculado:', estimatedTotal);
        console.log('🤖 [AI-QUOTE] Items:', quoteData.items.map((i: any) => ({ 
          name: i.product_name, 
          qty: i.quantity, 
          unit: i.unit 
        })));
        
        const quotePayload = {
          title: quoteData.title,
          description: quoteData.description,
          client_id: profile.client_id,
          created_by: userId,
          status: 'draft', // Sempre criar como rascunho
          total: estimatedTotal, // ✅ Sempre 0.00 inicialmente
          deadline: quoteData.deadline_days ? 
            new Date(Date.now() + quoteData.deadline_days * 24 * 60 * 60 * 1000).toISOString() : 
            null,
          selected_supplier_ids: validSelectedSuppliers.map(s => s.id),
          suppliers_sent_count: validSelectedSuppliers.length,
          client_name: clientDisplayName,
          requires_visit: quoteData.requiresVisit || false,
          visit_deadline: quoteData.visitDeadline ? new Date(quoteData.visitDeadline).toISOString() : null
        };
        
        console.log('📋 Payload da cotação:', quotePayload);
        
        // Retry logic para prevenir erros de duplicate key
        let newQuote = null;
        let retryCount = 0;
        const MAX_RETRIES = 2;

        while (retryCount <= MAX_RETRIES) {
          const { data, error: quoteError } = await supabaseClient
            .from('quotes')
            .insert(quotePayload)
            .select()
            .single();

          if (!quoteError) {
            newQuote = data;
            break;
          }

          // Se for erro de duplicate key e ainda tem retries
          if (quoteError.code === '23505' && retryCount < MAX_RETRIES) {
            console.warn(`⚠️ Duplicate key detectado, tentativa ${retryCount + 1}/${MAX_RETRIES}`);
            retryCount++;
            // Aguardar 100ms antes de tentar novamente
            await new Promise(resolve => setTimeout(resolve, 100));
            continue;
          }

          // Qualquer outro erro ou esgotou retries
          console.error('❌ Erro ao inserir cotação:', quoteError);
          throw new Error(`Erro ao criar cotação: ${quoteError.message}`);
        }

        if (!newQuote) {
          throw new Error('Erro ao criar cotação após múltiplas tentativas');
        }

        console.log('✅ RFQ criada com sucesso:', {
          id: newQuote.id,
          title: newQuote.title,
          total: newQuote.total,
          items_count: newQuote.items_count || 0,
          suppliers_count: selectedSuppliers.length,
          requires_visit: newQuote.requires_visit
        });

        // Inserir itens da cotação
        if (quoteData.items?.length > 0) {
          console.log(`📋 Inserindo ${quoteData.items.length} itens...`);
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
            console.error('❌ Erro ao inserir itens:', itemsError);
            throw new Error(`Erro ao inserir itens: ${itemsError.message}`);
          } else {
            console.log('✅ Itens inseridos com sucesso');
          }
        }

        // Inserir fornecedores selecionados (já validados anteriormente)
        if (validSelectedSuppliers.length > 0) {
          const quoteSuppliers = validSelectedSuppliers.map(supplier => ({
            quote_id: newQuote.id,
            supplier_id: supplier.id
          }));

          const { error: suppliersError } = await supabaseClient
            .from('quote_suppliers')
            .insert(quoteSuppliers);

          if (suppliersError) {
            console.error('❌ Erro ao vincular fornecedores:', suppliersError);
            throw new Error(`Erro ao vincular fornecedores: ${suppliersError.message}`);
          } else {
            console.log(`✅ ${validSelectedSuppliers.length} fornecedores vinculados com sucesso`);
          }
        }

        // Definir mensagem sobre envio automático de fornecedores
        let autoSendMessage = '';
        if (validSelectedSuppliers.length > 0) {
          autoSendMessage = `\n\n📤 ${validSelectedSuppliers.length} fornecedor(es) vinculado(s)! Você pode enviar a RFQ quando estiver pronto.`;
        } else {
          autoSendMessage = '\n\n💡 Não se esqueça de adicionar fornecedores e enviar a RFQ.';
        }

        // Padronizar produtos no catálogo com detecção de similares
        console.log(`🔍 Iniciando padronização inteligente de ${quoteData.items?.length || 0} itens...`);
        const standardizedProducts = [];
        const productConflicts = [];
        
        // Buscar produtos existentes do cliente para comparação
        const { data: existingProducts } = await supabaseClient
          .from('products')
          .select('id, name, code, category')
          .eq('client_id', profile.client_id);
        
        console.log(`📦 Produtos existentes encontrados: ${existingProducts?.length || 0}`);
        
        if (quoteData.items?.length > 0) {
          for (const item of quoteData.items) {
            try {
              console.log(`📝 Analisando produto: ${item.product_name}`);
              
              // Analisar produto com IA de similaridade
              const analysis = analyzeProduct(item.product_name, existingProducts || []);
              console.log(`🤖 Análise do produto:`, {
                original: item.product_name,
                normalized: analysis.normalizedName,
                isService: analysis.isService,
                category: analysis.category,
                suggestions: analysis.suggestions.length,
                confidence: analysis.confidence
              });
              
              // Se há produtos similares com alta confiança, usar o existente
              if (analysis.suggestions.length > 0 && analysis.confidence > 0.85) {
                const bestMatch = analysis.suggestions[0];
                console.log(`✨ Usando produto existente similar: ${bestMatch.name} (${Math.round(bestMatch.similarity * 100)}% similar)`);
                standardizedProducts.push(`${item.product_name} → ${bestMatch.name}`);
                continue;
              }
              
              // Verificar se produto normalizado já existe (busca exata)
              const { data: exactMatch } = await supabaseClient
                .from('products')
                .select('id, name')
                .eq('name', analysis.normalizedName)
                .eq('client_id', profile.client_id)
                .maybeSingle();

              if (!exactMatch) {
                console.log(`➕ Criando novo produto: ${analysis.normalizedName}`);
                
                // Gerar código único para o produto
                let code = `${analysis.isService ? 'SERV' : 'PROD'}${Date.now().toString().slice(-6)}${Math.floor(Math.random()*1000).toString().padStart(3,'0')}`;
                
                // Criar produto com dados normalizados
                const { data: newProduct, error: insertError } = await supabaseClient
                  .from('products')
                  .insert({
                    code,
                    name: analysis.normalizedName,
                    description: item.description || `${analysis.isService ? 'Serviço' : 'Produto'} criado pela IA para RFQ #${newQuote.id}`,
                    category: analysis.category,
                    client_id: profile.client_id,
                    supplier_id: null, // Produto genérico do cliente
                    unit_price: null, // Será preenchido pelos fornecedores
                    stock_quantity: analysis.isService ? null : 0, // Serviços não têm estoque
                    status: 'active'
                  })
                  .select()
                  .single();

                if (insertError) {
                  console.error(`❌ Erro ao inserir produto ${analysis.normalizedName}:`, insertError);
                  productConflicts.push({
                    original: item.product_name,
                    error: insertError.message,
                    suggestions: analysis.suggestions
                  });
                } else if (newProduct) {
                  const productType = analysis.isService ? 'serviço' : 'produto';
                  if (item.product_name !== analysis.normalizedName) {
                    standardizedProducts.push(`${item.product_name} → ${analysis.normalizedName} (${productType})`);
                  } else {
                    standardizedProducts.push(`${analysis.normalizedName} (novo ${productType})`);
                  }
                  console.log(`✅ ${productType.charAt(0).toUpperCase() + productType.slice(1)} criado: ${newProduct.name} (ID: ${newProduct.id})`);
                }
              } else {
                console.log(`ℹ️ Produto normalizado já existe: ${analysis.normalizedName}`);
                if (item.product_name !== analysis.normalizedName) {
                  standardizedProducts.push(`${item.product_name} → ${analysis.normalizedName} (existente)`);
                }
              }
            } catch (productError) {
              console.warn(`⚠️ Erro ao analisar produto ${item.product_name}:`, productError);
              productConflicts.push({
                original: item.product_name,
                error: productError instanceof Error ? productError.message : 'Erro desconhecido',
                suggestions: []
              });
            }
          }
        }
        console.log(`📊 Padronização concluída. ${standardizedProducts.length} produtos processados, ${productConflicts.length} conflitos.`);

        // Mensagem de sucesso personalizada com detalhes da padronização
        let successMessage = `🎉 Perfeito! Criei sua RFQ #${newQuote.id} com ${quoteData.items.length} itens${selectedSuppliers.length > 0 ? ` e ${selectedSuppliers.length} fornecedores selecionados` : ''}.${autoSendMessage}`;
        
        if (standardizedProducts.length > 0) {
          successMessage += `\n\n📦 **Produtos processados:**\n${standardizedProducts.map(p => `• ${p}`).join('\n')}`;
          
          if (productConflicts.length > 0) {
            successMessage += `\n\n⚠️ **${productConflicts.length} produto(s) com conflito** - verifique no módulo de produtos.`;
          }
        }
        
        if (historyContext && historyContext.totalRFQs > 0) {
          successMessage += `\n\n🎯 **Aprendizado:** Esta é sua ${historyContext.totalRFQs + 1}ª RFQ - a IA melhorou a padronização baseada no seu histórico!`;
        }
        
        successMessage += `\n\n💡 **Dica:** Os produtos foram automaticamente normalizados e categorizados. Acesse o módulo Produtos para revisar.`;

        console.log('📤 Retornando ao usuário:', {
          rfqCreated: true,
          quoteId: newQuote.id,
          response_preview: cleanResponse.substring(0, 50) + '...',
          standardized_products: standardizedProducts.length
        });
        
        return new Response(JSON.stringify({
          response: cleanResponse,
          quote: null,
          quoteId: newQuote.id,
          rfqCreated: true,
          suppliers: selectedSuppliers,
          autoSent: selectedSuppliers.length > 0 && quoteData.supplierPreferences?.autoSend,
          standardizedProducts: standardizedProducts,
          productConflicts: productConflicts,
          suggestions: [],
          historyInsights: historyContext ? {
            totalPreviousRFQs: historyContext.totalRFQs,
            commonProducts: historyContext.commonProducts.slice(0, 3),
            preferredSuppliers: historyContext.preferredSuppliers.slice(0, 2)
          } : null
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
        });
      } catch (parseError) {
        console.error('❌ Erro ao gerar RFQ:', parseError);
        const errorMessage = parseError instanceof Error ? parseError.message : 'Erro desconhecido';
        return new Response(JSON.stringify({
          response: `Ocorreu um erro ao criar a RFQ: ${errorMessage}. Por favor, tente novamente ou entre em contato com o suporte.`,
          suggestions: ['Tentar novamente', 'Começar do zero', 'Falar com suporte']
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
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
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
    });

  } catch (error) {
    console.error('Error in ai-quote-chat:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ 
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
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

  // Se está perguntando sobre fornecedores
  else if (lowerResponse.includes('fornecedor') || lowerResponse.includes('supplier')) {
    suggestions.push('Apenas locais', 'Apenas certificados', 'Ambos (local + certificado)', 'Qualquer fornecedor');
  }
  
  // Se está perguntando sobre envio automático
  else if (lowerResponse.includes('enviar') || lowerResponse.includes('automático')) {
    suggestions.push('Sim, enviar automaticamente', 'Não, vou enviar depois', 'Revisar antes de enviar');
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

// Função para extrair categorias da mensagem do usuário
function extractCategoriesFromMessage(message: string, sector: string = 'geral'): string[] {
  const lowerMessage = message.toLowerCase();
  const categories: string[] = [];
  
  // Palavras-chave por setor
  const sectorKeywords: Record<string, Record<string, string[]>> = {
    condominio: {
      'Material de limpeza': ['limpeza', 'detergente', 'desinfetante', 'sabão', 'álcool', 'hipoclorito'],
      'Manutenção predial': ['manutenção', 'reparo', 'elétrica', 'hidráulica', 'pintura', 'reforma'],
      'Segurança': ['segurança', 'camera', 'alarme', 'porteiro', 'controle acesso', 'monitoramento'],
      'Jardinagem': ['jardim', 'planta', 'fertilizante', 'podador', 'grama', 'paisagismo'],
      'Equipamentos': ['equipamento', 'ferramenta', 'maquinário', 'aparelho', 'dispositivo']
    },
    saude: {
      'Equipamentos médicos': ['equipamento médico', 'aparelho', 'maca', 'estetoscópio', 'termômetro'],
      'Material hospitalar': ['material hospitalar', 'seringas', 'luvas', 'máscaras', 'gaze'],
      'Medicamentos': ['medicamento', 'remédio', 'farmácia', 'droga', 'comprimido'],
      'Limpeza hospitalar': ['limpeza hospitalar', 'desinfetante', 'álcool', 'esterilização']
    },
    geral: {
      'Material de escritório': ['papel', 'caneta', 'impressora', 'computador', 'móveis'],
      'Limpeza': ['limpeza', 'detergente', 'pano', 'vassoura', 'álcool'],
      'Manutenção': ['manutenção', 'reparo', 'conserto', 'ferramenta'],
      'Equipamentos': ['equipamento', 'aparelho', 'máquina', 'dispositivo']
    }
  };
  
  const keywords = sectorKeywords[sector] || sectorKeywords.geral;
  
  // Buscar categorias baseadas nas palavras-chave
  for (const [category, words] of Object.entries(keywords)) {
    if (words.some(word => lowerMessage.includes(word))) {
      categories.push(category);
    }
  }
  
  // Se não encontrou categorias específicas, tentar algumas genéricas
  if (categories.length === 0) {
    if (lowerMessage.includes('comprar') || lowerMessage.includes('preciso de') || lowerMessage.includes('cotação')) {
      categories.push('Materiais diversos');
    }
  }
  
  return categories;
}