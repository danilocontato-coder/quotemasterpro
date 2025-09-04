import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { base64Content, filename } = await req.json();

    if (!base64Content) {
      throw new Error('Base64 content is required');
    }

    console.log('Processing PDF extraction for:', filename);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em extração de dados de propostas comerciais em PDF. 
            Extraia as seguintes informações da proposta:
            - Nome do fornecedor/empresa
            - CNPJ (se disponível)
            - Contato (telefone/email)
            - Itens da proposta com: descrição, marca (se disponível), quantidade, valor unitário, valor total
            - Prazo de entrega
            - Condições de pagamento
            - Validade da proposta
            - Observações adicionais

            Retorne APENAS um JSON válido no seguinte formato:
            {
              "supplierName": "Nome da empresa",
              "cnpj": "CNPJ se disponível",
              "contact": {
                "email": "email@exemplo.com",
                "phone": "+55 11 99999-9999"
              },
              "items": [
                {
                  "description": "Descrição do produto/serviço",
                  "brand": "Marca se disponível",
                  "quantity": 1,
                  "unitPrice": 100.00,
                  "totalPrice": 100.00
                }
              ],
              "deliveryTime": "Prazo em dias ou texto",
              "paymentTerms": "Condições de pagamento",
              "validUntil": "Data de validade",
              "notes": "Observações adicionais",
              "totalProposal": 100.00
            }`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Por favor, extraia os dados desta proposta comercial:'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64Content}`
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const extractedContent = data.choices[0].message.content;

    console.log('Extracted content:', extractedContent);

    // Parse the JSON response
    let extractedData;
    try {
      extractedData = JSON.parse(extractedContent);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', extractedContent);
      throw new Error('Failed to parse extracted data as JSON');
    }

    return new Response(JSON.stringify({
      success: true,
      data: extractedData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in extract-pdf-data function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});