import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log('📧 Generating email content with AI:', payload);

    const defaultBranding = {
      company_name: 'Cotiz',
      logo_url: '',
      primary_color: '#003366',
      secondary_color: '#F5F5F5',
      accent_color: '#0066CC',
      footer_text: 'Enviado por Cotiz'
    };
    
    const branding = { ...defaultBranding, ...(payload.branding || {}) };
    
    // 1. Gerar conteúdo textual com Lovable AI usando structured output
    const textResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em e-mail marketing B2B para a plataforma Cotiz. 
            Crie e-mails profissionais, persuasivos e otimizados para conversão.
            Evite palavras que acionam filtros de spam (grátis, urgente, clique aqui, 100% garantido).
            Use HTML semântico e responsivo (max-width: 600px).
            Inclua sempre um link de descadastro no rodapé.`
          },
          {
            role: 'user',
            content: `Crie um e-mail marketing profissional em HTML com as seguintes características:
- Objetivo: ${payload.objective || 'engajamento'}
- Tom: ${payload.tone || 'profissional'}
- Público: ${payload.target_audience || 'clientes B2B'}
- Pontos principais: ${(payload.key_points || []).join(', ')}
- Voz da marca: ${payload.brand_voice || 'profissional e confiável'}

IMPORTANTE - BRANDING:
- Nome da empresa: ${branding.company_name}
- Logo URL: ${branding.logo_url}
- Cor primária: ${branding.primary_color}
- Cor secundária: ${branding.secondary_color}
- Cor de destaque: ${branding.accent_color}
- Texto do rodapé: ${branding.footer_text}

O e-mail DEVE incluir:
1. CABEÇALHO com logo centralizada (se logo_url fornecida, usar: <img src="${branding.logo_url}" alt="${branding.company_name}" style="max-width:200px;height:auto;margin:0 auto;display:block;">)
2. Corpo usando as cores do branding fornecidas
3. RODAPÉ com: "${branding.footer_text}" e link {{unsubscribe_url}} para descadastro

${payload.generate_variants ? 'Gere 3 variações de assunto para teste A/B.' : 'Gere 1 assunto otimizado.'}`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_email_content',
              description: 'Gera conteúdo completo de e-mail marketing em HTML',
              parameters: {
                type: 'object',
                properties: {
                  subject_lines: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Lista de assuntos para teste A/B (1-3 variações)'
                  },
                  preview_text: {
                    type: 'string',
                    description: 'Texto do pre-header atraente e curto'
                  },
                  html_body: {
                    type: 'string',
                    description: 'HTML completo e responsivo com inline styles (max-width: 600px)'
                  },
                  plain_text_body: {
                    type: 'string',
                    description: 'Versão texto puro limpa e formatada'
                  },
                  suggested_cta: {
                    type: 'object',
                    properties: {
                      text: { type: 'string', description: 'Texto do botão CTA' },
                      url: { type: 'string', description: 'URL para o CTA' }
                    },
                    required: ['text', 'url']
                  }
                },
                required: ['subject_lines', 'preview_text', 'html_body', 'plain_text_body', 'suggested_cta'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'generate_email_content' } }
      })
    });

    if (!textResponse.ok) {
      const errorText = await textResponse.text();
      console.error('❌ AI API error:', errorText);
      throw new Error(`AI API error: ${errorText}`);
    }

    const textData = await textResponse.json();
    console.log('✅ AI response received');
    
    // Extrair conteúdo estruturado da tool call
    const toolCall = textData.choices[0].message.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'generate_email_content') {
      console.error('❌ No valid tool call in response');
      throw new Error('AI did not return structured content');
    }
    
    const content = JSON.parse(toolCall.function.arguments);
    
    // 2. Gerar imagens se solicitado (Nano Banana - google/gemini-2.5-flash-image-preview)
    let images = [];
    if (payload.include_images && payload.key_points && payload.key_points.length > 0) {
      console.log('🎨 Generating images with AI...');
      
      try {
        const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-image-preview',
            messages: [{
              role: 'user',
              content: `Crie uma imagem profissional para e-mail marketing B2B sobre: ${payload.key_points[0]}. Estilo corporativo, limpo, moderno.`
            }],
            modalities: ["image", "text"]
          })
        });
        
        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          images = imageData.choices[0].message.images || [];
          console.log(`✅ Generated ${images.length} image(s)`);
        }
      } catch (imgError) {
        console.error('⚠️ Image generation failed (non-blocking):', imgError);
      }
    }
    
    // 3. Calcular spam score estimado
    const spamScore = calculateSpamScore(content.html_body, content.subject_lines[0]);
    
    return new Response(JSON.stringify({
      success: true,
      content: {
        ...content,
        images,
        metadata: {
          model: 'google/gemini-2.5-flash',
          tokens_used: textData.usage?.total_tokens || 0,
          spam_score_estimate: spamScore,
          generated_at: new Date().toISOString()
        }
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error in generate-email-content:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Função auxiliar para calcular spam score (0-100, menor é melhor)
function calculateSpamScore(htmlBody: string, subject: string): number {
  let score = 0;
  const text = (htmlBody + ' ' + subject).toLowerCase();
  
  // Palavras de spam comuns
  const spamWords = [
    'grátis', 'free', 'gratuito', 'urgente', 'urgent', 'clique aqui', 'click here',
    '100%', 'garantido', 'guaranteed', 'dinheiro', 'money', 'ganhe', 'earn',
    'compre agora', 'buy now', 'oferta limitada', 'limited offer'
  ];
  
  spamWords.forEach(word => {
    if (text.includes(word)) score += 10;
  });
  
  // Excesso de maiúsculas
  const upperCount = (htmlBody.match(/[A-Z]/g) || []).length;
  const totalCount = htmlBody.length;
  if (upperCount / totalCount > 0.3) score += 15;
  
  // Excesso de pontos de exclamação
  const exclamationCount = (text.match(/!/g) || []).length;
  if (exclamationCount > 3) score += 10;
  
  // Falta de texto alternativo em imagens
  if (htmlBody.includes('<img') && !htmlBody.includes('alt=')) score += 5;
  
  return Math.min(score, 100);
}