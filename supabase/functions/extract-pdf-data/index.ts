import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as pdfjsLib from 'npm:pdfjs-dist@4.0.379';
import { corsHeaders } from '../_shared/cors.ts';

// Desativar worker do pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { base64Content, filename } = await req.json();

    if (!base64Content) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Base64 content is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing PDF extraction for:', filename);
    console.log('Base64 content length:', base64Content.length);

    // Decodificar base64 para Uint8Array
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    console.log('Decoded bytes length:', bytes.length);

    // Verificar assinatura mágica do PDF (%PDF)
    const pdfSignature = String.fromCharCode(...bytes.slice(0, 4));
    if (!pdfSignature.startsWith('%PDF')) {
      console.error('Invalid PDF signature:', pdfSignature);
      return new Response(JSON.stringify({
        success: false,
        error: 'unsupported_media_type'
      }), {
        status: 415,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Valid PDF detected, extracting text...');

    // Extrair texto do PDF usando pdf.js
    let extractedText = '';
    try {
      const loadingTask = pdfjsLib.getDocument({ data: bytes, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true });
      const pdf = await loadingTask.promise;
      const maxPages = Math.min(pdf.numPages, 10); // Limitar a 10 páginas

      console.log(`PDF has ${pdf.numPages} pages, processing first ${maxPages}...`);

      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        extractedText += pageText + '\n';

        // Limitar texto acumulado a ~100k chars
        if (extractedText.length > 100000) {
          extractedText = extractedText.substring(0, 100000);
          console.log('Text limit reached, stopping extraction');
          break;
        }
      }

      // Normalizar espaços
      extractedText = extractedText.replace(/\s+/g, ' ').trim();
      console.log('Extracted text length:', extractedText.length);

      // Se não houver texto significativo
      if (extractedText.length < 50) {
        console.log('No significant text found in PDF');
        return new Response(JSON.stringify({
          success: true,
          quote: {
            supplierName: '',
            cnpj: '',
            contact: { email: '', phone: '' },
            items: [],
            deliveryTime: '',
            paymentTerms: '',
            validUntil: '',
            notes: 'PDF sem texto extraível',
            totalProposal: 0
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

    } catch (pdfError) {
      console.error('PDF extraction error:', pdfError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to extract text from PDF'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Chamar Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({
        success: false,
        error: 'AI service not configured'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `Você é um especialista em extração de dados de propostas comerciais. 
Analise o texto fornecido e extraia as seguintes informações da proposta:
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
}`;

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
          { role: 'user', content: `Segue o texto integral da proposta extraído do PDF:\n\n${extractedText}` }
        ]
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({
          success: false,
          error: 'rate_limit_exceeded'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({
          success: false,
          error: 'credits_exhausted'
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: false,
        error: 'AI gateway error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const extractedContent = aiData.choices?.[0]?.message?.content;

    if (!extractedContent) {
      console.error('No content in AI response');
      return new Response(JSON.stringify({
        success: false,
        error: 'No content extracted from AI'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('AI extracted content length:', extractedContent.length);

    // Parse the JSON response
    let extractedData;
    try {
      // Limpar possíveis markdown wrappers
      const cleanContent = extractedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extractedData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', extractedContent);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to parse AI response as JSON'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Successfully extracted data, items count:', extractedData.items?.length || 0);

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