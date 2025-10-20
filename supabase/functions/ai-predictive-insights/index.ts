import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuoteAnalysis {
  totalQuotes: number;
  avgValue: number;
  topCategories: string[];
  avgApprovalTime: number;
  supplierPerformance: {
    supplierId: string;
    avgPrice: number;
    onTimeDelivery: number;
  }[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId, historicalData } = await req.json();
    console.log('🤖 [AI-INSIGHTS] Gerando insights para:', clientId);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    // Preparar prompt contextual com dados históricos
    const prompt = `
Você é um analista financeiro especializado em gestão de compras e cotações.

Analise os seguintes dados históricos de cotações:

${JSON.stringify(historicalData, null, 2)}

Forneça 5 insights acionáveis no seguinte formato JSON:
{
  "insights": [
    {
      "type": "cost_saving" | "efficiency" | "risk_alert" | "trend" | "recommendation",
      "title": "Título curto e impactante",
      "message": "Descrição clara do insight",
      "impact": "high" | "medium" | "low",
      "action": "Ação específica recomendada",
      "value": número com valor monetário estimado (se aplicável),
      "confidence": número entre 0 e 1
    }
  ],
  "predictions": [
    {
      "category": "Categoria do produto/serviço",
      "predictedDemand": "texto descrevendo demanda futura",
      "suggestedAction": "ação recomendada",
      "timeframe": "prazo em dias"
    }
  ],
  "summary": {
    "totalSavingsOpportunity": número,
    "riskScore": número entre 0 e 100,
    "efficiencyScore": número entre 0 e 100
  }
}

Foque em insights práticos que gerem economia real, reduzam riscos ou melhorem eficiência.
`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: 'Você é um especialista em análise de dados de compras e cotações, focado em gerar insights acionáveis que economizem dinheiro e reduzam riscos.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_insights",
            description: "Gera insights preditivos sobre dados de cotações",
            parameters: {
              type: "object",
              properties: {
                insights: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string", enum: ["cost_saving", "efficiency", "risk_alert", "trend", "recommendation"] },
                      title: { type: "string" },
                      message: { type: "string" },
                      impact: { type: "string", enum: ["high", "medium", "low"] },
                      action: { type: "string" },
                      value: { type: "number" },
                      confidence: { type: "number" }
                    },
                    required: ["type", "title", "message", "impact", "action", "confidence"]
                  }
                },
                predictions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      category: { type: "string" },
                      predictedDemand: { type: "string" },
                      suggestedAction: { type: "string" },
                      timeframe: { type: "string" }
                    },
                    required: ["category", "predictedDemand", "suggestedAction", "timeframe"]
                  }
                },
                summary: {
                  type: "object",
                  properties: {
                    totalSavingsOpportunity: { type: "number" },
                    riskScore: { type: "number" },
                    efficiencyScore: { type: "number" }
                  },
                  required: ["totalSavingsOpportunity", "riskScore", "efficiencyScore"]
                }
              },
              required: ["insights", "predictions", "summary"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_insights" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [AI-INSIGHTS] Erro na API:', response.status, errorText);
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    console.log('🔍 [AI-INSIGHTS] Resposta da API:', JSON.stringify(data, null, 2));
    
    const toolCall = data.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('Nenhum tool call retornado pela IA');
    }
    
    const aiResponse = JSON.parse(toolCall.function.arguments);
    console.log('✅ [AI-INSIGHTS] Insights gerados com sucesso');

    return new Response(
      JSON.stringify({
        success: true,
        data: aiResponse,
        generatedAt: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('💥 [AI-INSIGHTS] Erro:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
