import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Conectar ao Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar chave da API do OpenAI das configurações do sistema (superadmin)
    const { data: aiSettings, error: settingsError } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'openai_api_key')
      .single();

    if (settingsError || !aiSettings?.setting_value) {
      console.error('OpenAI API key not found in settings:', settingsError);
      throw new Error('OpenAI API key not configured in system settings');
    }

    const openAIApiKey = typeof aiSettings.setting_value === 'string' 
      ? aiSettings.setting_value 
      : aiSettings.setting_value.value || aiSettings.setting_value;

    const { base64Content, filename } = await req.json();

    if (!base64Content) {
      throw new Error('Base64 content is required');
    }

    console.log('Processing PDF extraction for:', filename);

    // Simplified PDF handling - just use filename and base for analysis
    const pdfText = `PDF Document uploaded: ${filename}. Manual content analysis needed.`;

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
            content: `Você é um especialista em extração de dados de propostas comerciais. 
            Analise o conteúdo fornecido e extraia as seguintes informações da proposta:
            - Nome do fornecedor/empresa
            - CNPJ (se disponível)
            - Informações de contato (telefone/email)
            - Itens da proposta com: descrição, marca (se disponível), quantidade, valor unitário, valor total
            - Prazo de entrega
            - Condições de pagamento
            - Validade da proposta
            - Observações adicionais

            Se não conseguir extrair alguma informação específica, use valores padrão ou deixe vazio.
            
            Retorne APENAS um JSON válido no seguinte formato:
            {
              "supplierName": "Nome da empresa ou vazio",
              "cnpj": "CNPJ se disponível ou vazio",
              "contact": {
                "email": "email@exemplo.com ou vazio",
                "phone": "+55 11 99999-9999 ou vazio"
              },
              "items": [
                {
                  "description": "Descrição do produto/serviço",
                  "brand": "Marca se disponível ou vazio",
                  "quantity": 1,
                  "unitPrice": 0,
                  "totalPrice": 0
                }
              ],
              "deliveryTime": "Prazo em dias ou texto ou vazio",
              "paymentTerms": "Condições de pagamento ou vazio",
              "validUntil": "Data de validade YYYY-MM-DD ou vazio",
              "notes": "Observações adicionais ou vazio",
              "totalProposal": 0
            }`
          },
          {
            role: 'user',
            content: `Por favor, extraia os dados desta proposta comercial do PDF. 
            
            Conteúdo do documento: ${pdfText}
            
            Se o PDF não pôde ser processado adequadamente, crie uma estrutura básica com campos vazios para que o usuário possa preencher manualmente.`
          }
        ],
        max_completion_tokens: 2000
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
      quote: extractedData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in extract-pdf-data function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error?.message || 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});