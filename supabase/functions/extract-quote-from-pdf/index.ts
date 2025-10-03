import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Preparar prompt para processar o PDF
    const systemPrompt = `Você é um assistente especializado em extrair dados de propostas comerciais em PDF.

Extraia APENAS:
1. Valor total da proposta (totalAmount) - em formato numérico, sem símbolos de moeda
2. Observações/notas relevantes (notes) - prazo de entrega, condições de pagamento, validade da proposta, etc.

Retorne APENAS o JSON com esta estrutura EXATA (sem markdown, sem explicações):
{
  "totalAmount": "1234.56",
  "notes": "Prazo: 10 dias úteis. Pagamento: 30 dias. Validade: 15 dias."
}

Se não encontrar valor total, use null. Se não houver observações relevantes, use string vazia.
IMPORTANTE: Retorne APENAS o objeto JSON, nada mais.`

    // Chamar Lovable AI para extrair dados do PDF
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
            role: 'user',
            content: [
              {
                type: 'text',
                text: systemPrompt
              },
              {
                type: 'text',
                text: '\n\nAnalise esta proposta comercial em PDF e extraia os dados solicitados:'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        temperature: 0.1,
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

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          totalAmount: extractedData.totalAmount || null,
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
