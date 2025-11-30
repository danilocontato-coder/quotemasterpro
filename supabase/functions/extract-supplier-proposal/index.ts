import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractedItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface ExtractionResult {
  success: boolean;
  items: ExtractedItem[];
  shipping_cost?: number;
  delivery_days?: number;
  warranty_months?: number;
  payment_terms?: string;
  notes?: string;
  total_amount?: number;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64, fileName } = await req.json();

    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ success: false, error: 'PDF base64 é obrigatório' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('📄 [EXTRACT-SUPPLIER-PROPOSAL] Iniciando extração:', { fileName });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('❌ [EXTRACT-SUPPLIER-PROPOSAL] LOVABLE_API_KEY não configurada');
      return new Response(
        JSON.stringify({ success: false, error: 'Configuração de IA não encontrada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const systemPrompt = `Você é um especialista em extrair dados de propostas comerciais e orçamentos de fornecedores brasileiros.

Analise o PDF fornecido e extraia as seguintes informações:

1. **Itens da proposta**: Para cada produto/serviço encontrado, extraia:
   - product_name: Nome do produto/serviço
   - quantity: Quantidade (número inteiro, padrão 1 se não especificado)
   - unit_price: Preço unitário em reais (número decimal)
   - total: Valor total do item (quantidade × preço unitário)

2. **Informações gerais**:
   - shipping_cost: Custo de frete/entrega em reais (0 se grátis ou não especificado)
   - delivery_days: Prazo de entrega em dias úteis (número inteiro)
   - warranty_months: Garantia em meses (número inteiro, padrão 12)
   - payment_terms: Condições de pagamento (ex: "30 dias", "à vista", "30/60/90")
   - notes: Observações importantes encontradas
   - total_amount: Valor total da proposta em reais

REGRAS IMPORTANTES:
- Valores monetários devem estar em formato numérico (ex: 1234.56, não "R$ 1.234,56")
- Se um valor não for encontrado, omita o campo ou use o padrão indicado
- Priorize extrair TODOS os itens listados, mesmo que parcialmente
- Converta valores no formato brasileiro (1.234,56) para decimal (1234.56)
- Se houver tabela de itens, extraia linha por linha
- Identifique se o documento é uma proposta comercial, orçamento, cotação ou nota fiscal

Responda SOMENTE com um objeto JSON válido, sem markdown ou texto adicional.`;

    const userPrompt = `Extraia os dados desta proposta comercial/orçamento em PDF (base64):

Arquivo: ${fileName || 'proposta.pdf'}

Conteúdo (base64): ${pdfBase64.substring(0, 100)}... [truncado para log]

Retorne um JSON com a estrutura:
{
  "items": [
    { "product_name": "...", "quantity": 1, "unit_price": 100.00, "total": 100.00 }
  ],
  "shipping_cost": 0,
  "delivery_days": 7,
  "warranty_months": 12,
  "payment_terms": "30 dias",
  "notes": "...",
  "total_amount": 100.00
}`;

    console.log('🤖 [EXTRACT-SUPPLIER-PROPOSAL] Chamando Lovable AI...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: userPrompt },
              { 
                type: 'image_url', 
                image_url: { 
                  url: `data:application/pdf;base64,${pdfBase64}` 
                } 
              }
            ]
          }
        ],
        max_tokens: 4096,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ [EXTRACT-SUPPLIER-PROPOSAL] Erro na API:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao processar PDF com IA' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      console.error('❌ [EXTRACT-SUPPLIER-PROPOSAL] Resposta vazia da IA');
      return new Response(
        JSON.stringify({ success: false, error: 'Não foi possível extrair dados do PDF' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('📝 [EXTRACT-SUPPLIER-PROPOSAL] Resposta da IA:', content.substring(0, 500));

    // Parse JSON da resposta
    let extractedData: any;
    try {
      // Remover possíveis marcadores de código markdown
      const cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      extractedData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('❌ [EXTRACT-SUPPLIER-PROPOSAL] Erro ao fazer parse do JSON:', parseError);
      console.log('📝 Conteúdo recebido:', content);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Não foi possível interpretar os dados extraídos',
          raw_content: content.substring(0, 500)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Validar e normalizar dados
    const result: ExtractionResult = {
      success: true,
      items: [],
      shipping_cost: extractedData.shipping_cost || 0,
      delivery_days: extractedData.delivery_days || undefined,
      warranty_months: extractedData.warranty_months || 12,
      payment_terms: extractedData.payment_terms || undefined,
      notes: extractedData.notes || undefined,
      total_amount: extractedData.total_amount || undefined,
    };

    // Processar itens
    if (Array.isArray(extractedData.items)) {
      result.items = extractedData.items.map((item: any) => ({
        product_name: String(item.product_name || item.name || 'Item').trim(),
        quantity: parseInt(item.quantity) || 1,
        unit_price: parseFloat(item.unit_price || item.price) || 0,
        total: parseFloat(item.total) || (parseFloat(item.unit_price || item.price) || 0) * (parseInt(item.quantity) || 1),
      }));
    }

    // Calcular total se não fornecido
    if (!result.total_amount && result.items.length > 0) {
      result.total_amount = result.items.reduce((sum, item) => sum + item.total, 0) + (result.shipping_cost || 0);
    }

    console.log('✅ [EXTRACT-SUPPLIER-PROPOSAL] Extração concluída:', {
      itemsCount: result.items.length,
      total_amount: result.total_amount,
      shipping_cost: result.shipping_cost,
      delivery_days: result.delivery_days
    });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [EXTRACT-SUPPLIER-PROPOSAL] Erro geral:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Erro interno ao processar PDF' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
