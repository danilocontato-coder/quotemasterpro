import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getDocument } from "https://esm.sh/pdfjs-serverless";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper de fallback com regex para extrair itens quando IA falhar
function extractItemsFallback(pdfText: string): Array<{ description: string; quantity: number }> {
  const lines = pdfText.split(/\r?\n/).flatMap(l => l.split('•'));
  const blacklist = /(R\$|TOTAL|SUBTOTAL|VALOR|PRE[ÇC]O|DESCONTO|PAGAMENTO)/i;
  const items: { description: string; quantity: number }[] = [];
  const seen = new Map<string, number>();

  for (const raw of lines) {
    let line = raw.replace(/\s+/g, ' ').trim();
    if (!line || line.length < 3 || blacklist.test(line)) continue;

    let description = '';
    let quantity = 1;

    // Padrão 1: "Descrição - 2 un" ou "Descrição 2 unidades"
    let m = line.match(/^(.+?)\s*[-–:•]?\s*(\d+)\s*(x|un|unid|unidade|unidades|pcs|pe[çc]as|pz|kg|l|lt|m|m2|m³|cx|par|rolo)?\s*$/i);
    
    // Padrão 2: "2x Descrição" ou "2 un Descrição"
    if (!m) {
      m = line.match(/^(\d+)\s*(x|un|unid|unidade|unidades)?\s*[-–:•]?\s*(.+)$/i);
      if (m && m[3]) {
        quantity = parseInt(m[1], 10);
        description = m[3].trim();
      }
    } else if (m && m[1] && m[2]) {
      description = m[1].trim();
      quantity = parseInt(m[2], 10);
    }

    if (!description || !Number.isFinite(quantity) || quantity <= 0 || quantity > 10000) continue;
    
    // Deduplicar por descrição (case-insensitive)
    const key = description.toLowerCase();
    const existingQty = seen.get(key);
    if (existingQty) {
      seen.set(key, existingQty + quantity);
    } else {
      seen.set(key, quantity);
    }
  }

  // Converter Map para array
  seen.forEach((qty, desc) => {
    items.push({ description: desc, quantity: qty });
  });

  console.log(`🤖 [EXTRACT-PDF] Fallback extracted ${items.length} items`);
  return items.slice(0, 100);
}

// Helper para extrair texto do PDF usando pdfjs-serverless
async function extractTextFromPDF(base64PDF: string): Promise<string> {
  try {
    // Normalizar Base64 (remover prefixo e corrigir padding)
    let base64 = base64PDF.includes(',') ? base64PDF.split(',')[1] : base64PDF;
    base64 = base64.replace(/-/g, '+').replace(/_/g, '/').replace(/\s+/g, '');
    const pad = base64.length % 4;
    if (pad) base64 += '='.repeat(4 - pad);

    // Decodificar base64 com segurança
    const binary = atob(base64);
    const pdfData = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) pdfData[i] = binary.charCodeAt(i);
    
    // Carregar PDF com pdfjs-serverless
    console.log('🤖 [EXTRACT-PDF] Loading PDF with pdfjs-serverless...');
    const pdf = await getDocument(pdfData).promise;
    
    let fullText = '';
    
    // Extrair texto de cada página (máximo 10 páginas)
    const maxPages = Math.min(pdf.numPages, 10);
    console.log(`🤖 [EXTRACT-PDF] Processing ${maxPages} pages...`);
    
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
      
      // Limitar tamanho total do texto
      if (fullText.length > 100000) break;
    }
    
    const trimmedText = fullText.trim();
    
    if (!trimmedText || trimmedText.length < 10) {
      console.error('🤖 [EXTRACT-PDF] PDF não contém texto legível');
      throw new Error('PDF não contém texto legível');
    }
    
    console.log(`🤖 [EXTRACT-PDF] Successfully extracted ${trimmedText.length} characters`);
    return trimmedText;
  } catch (error) {
    console.error('🤖 [EXTRACT-PDF] Error extracting text from PDF:', error);
    throw new Error('Não foi possível extrair texto do PDF');
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { pdfBase64, fileName } = await req.json()
    
    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ success: false, error: 'PDF base64 is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured')
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🤖 [EXTRACT-PDF] Processing PDF:', fileName)

    // Extrair texto do PDF
    console.log('🤖 [EXTRACT-PDF] Extracting text from PDF...')
    const pdfText = await extractTextFromPDF(pdfBase64)
    
    if (!pdfText || pdfText.length < 10) {
      return new Response(
        JSON.stringify({ success: false, error: 'PDF não contém texto legível' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🤖 [EXTRACT-PDF] Extracted text length:', pdfText.length, 'chars')

    // Preparar prompt para processar o texto extraído
    const systemPrompt = `Você é um assistente especializado em extrair dados de propostas comerciais.

Extraia APENAS:
1. Lista de itens (items) - cada item deve conter:
   - description: nome/descrição do produto/serviço (texto limpo, sem preços)
   - quantity: quantidade (número inteiro positivo)
2. Observações relevantes (notes) - prazo de entrega, condições de pagamento, validade da proposta

EXEMPLOS de formatos válidos em português:
- "Leitor Facial - 2 un" → {"description": "Leitor Facial", "quantity": 2}
- "4x Câmera IP" → {"description": "Câmera IP", "quantity": 4}
- "Motor PPA 1 unidade" → {"description": "Motor PPA", "quantity": 1}
- "Instalação completa" → {"description": "Instalação completa", "quantity": 1}

REGRAS IMPORTANTES:
- IGNORE linhas com "R$", "Total", "Subtotal", "Preço", "Valor", "Desconto"
- Quantidades devem ser números inteiros (1, 2, 3, ...), não decimais
- Se quantidade não for mencionada, assuma 1
- Não invente itens que não estão no documento

Retorne APENAS o JSON com esta estrutura EXATA (sem markdown, sem explicações, sem blocos de código):
{
  "items": [
    {
      "description": "Nome do produto/serviço",
      "quantity": 2
    }
  ],
  "notes": "Prazo: 10 dias úteis. Pagamento: 30 dias. Validade: 15 dias."
}

Se não encontrar itens, retorne array vazio. Se não houver observações, use string vazia.
IMPORTANTE: Retorne APENAS o objeto JSON puro, nada mais.`

    // Chamar Lovable AI para analisar o texto
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Analise esta proposta comercial e extraia os dados solicitados:\n\n${pdfText.slice(0, 8000)}`
          }
        ],
        max_tokens: 1000
      })
    })

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text()
      console.error('🤖 [EXTRACT-PDF] AI Gateway error:', aiResponse.status, errorText)
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Créditos insuficientes para processar o PDF.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao processar PDF com IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const aiData = await aiResponse.json()
    const content = aiData.choices?.[0]?.message?.content

    if (!content) {
      console.error('🤖 [EXTRACT-PDF] No content in AI response')
      return new Response(
        JSON.stringify({ success: false, error: 'Nenhum dado extraído do PDF' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🤖 [EXTRACT-PDF] AI raw response:', content)

    // Tentar parsear JSON da resposta
    let extractedData
    try {
      // Remover markdown code blocks se existirem
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      extractedData = JSON.parse(cleanContent)
    } catch (parseError) {
      console.error('🤖 [EXTRACT-PDF] Failed to parse AI response:', parseError)
      return new Response(
        JSON.stringify({ success: false, error: 'Formato de resposta da IA inválido' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🤖 [EXTRACT-PDF] Extracted data:', extractedData)

    // Validar e filtrar itens extraídos pela IA
    let finalItems = Array.isArray(extractedData.items) 
      ? extractedData.items.filter((i: any) => 
          i?.description && 
          typeof i.description === 'string' &&
          Number.isFinite(+i.quantity) && 
          +i.quantity > 0
        ).map((i: any) => ({
          description: String(i.description).trim(),
          quantity: Math.max(1, Math.floor(+i.quantity))
        }))
      : [];

    console.log(`🤖 [EXTRACT-PDF] AI extracted ${finalItems.length} valid items`);

    // Se IA não retornou itens, usar fallback com regex
    if (finalItems.length === 0) {
      console.log('🤖 [EXTRACT-PDF] Running fallback regex extraction...');
      finalItems = extractItemsFallback(pdfText);
      console.log(`🤖 [EXTRACT-PDF] Fallback result: ${finalItems.length} items`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          items: finalItems,
          notes: extractedData.notes || ''
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } }
    )

  } catch (error) {
    console.error('🤖 [EXTRACT-PDF] Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido ao processar PDF' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } }
    )
  }
})
