import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';

interface HistoricalData {
  totalQuotes: number;
  avgQuoteValue: number;
  statusDistribution: Record<string, number>;
  productAnalysis: Record<string, { count: number; totalValue: number }>;
  supplierPerformance: Record<string, { ratings: number[]; avgRating: number }>;
  timeAnalysis: {
    avgResponseTime: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId, historicalData } = await req.json() as {
      clientId: string;
      historicalData: HistoricalData;
    };

    if (!clientId || !historicalData) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'clientId e historicalData são obrigatórios' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('🤖 [AI-INSIGHTS] Gerando insights para cliente:', clientId);
    console.log('📊 [AI-INSIGHTS] Dados históricos:', {
      totalQuotes: historicalData.totalQuotes,
      avgQuoteValue: historicalData.avgQuoteValue
    });

    // Análise baseada em dados históricos
    const insights: any[] = [];
    const predictions: any[] = [];
    let totalSavingsOpportunity = 0;

    // Insight 1: Análise de volume de cotações
    if (historicalData.totalQuotes > 0) {
      const approvedCount = historicalData.statusDistribution?.approved || 0;
      const rejectedCount = historicalData.statusDistribution?.rejected || 0;
      const approvalRate = (approvedCount / historicalData.totalQuotes) * 100;

      if (approvalRate < 50) {
        insights.push({
          type: 'risk_alert',
          title: 'Taxa de Aprovação Baixa',
          message: `Apenas ${approvalRate.toFixed(1)}% das cotações foram aprovadas. Revise critérios de aprovação.`,
          impact: 'high',
          action: 'Analisar motivos de rejeição',
          confidence: 0.85
        });
      } else if (approvalRate > 80) {
        insights.push({
          type: 'efficiency',
          title: 'Excelente Taxa de Aprovação',
          message: `${approvalRate.toFixed(1)}% das cotações foram aprovadas. Continue com os critérios atuais.`,
          impact: 'medium',
          action: 'Manter processos atuais',
          confidence: 0.9
        });
      }
    }

    // Insight 2: Análise de produtos mais cotados
    if (historicalData.productAnalysis && Object.keys(historicalData.productAnalysis).length > 0) {
      const productEntries = Object.entries(historicalData.productAnalysis)
        .sort((a, b) => b[1].totalValue - a[1].totalValue);

      if (productEntries.length > 0) {
        const topProduct = productEntries[0];
        const savingsOpportunity = topProduct[1].totalValue * 0.12; // 12% de economia estimada
        totalSavingsOpportunity += savingsOpportunity;

        insights.push({
          type: 'cost_saving',
          title: 'Oportunidade de Economia em Produto',
          message: `"${topProduct[0]}" representa R$ ${topProduct[1].totalValue.toLocaleString('pt-BR')} em cotações. Negocie contratos de longo prazo.`,
          impact: 'high',
          action: 'Negociar contrato anual',
          value: savingsOpportunity,
          confidence: 0.78
        });

        // Predição de demanda para top 3 produtos
        productEntries.slice(0, 3).forEach(([productName, data]) => {
          const avgMonthly = data.count / 6; // 6 meses de histórico
          const predicted = Math.ceil(avgMonthly * 1.15); // 15% de crescimento estimado

          predictions.push({
            category: productName,
            predictedDemand: `${predicted} unidades/mês`,
            suggestedAction: `Manter estoque de ${Math.ceil(predicted * 1.5)} unidades`,
            timeframe: 'Próximos 30 dias'
          });
        });
      }
    }

    // Insight 3: Análise de performance de fornecedores
    if (historicalData.supplierPerformance && Object.keys(historicalData.supplierPerformance).length > 0) {
      const performanceEntries = Object.entries(historicalData.supplierPerformance);
      
      performanceEntries.forEach(([supplierId, data]) => {
        const avgRating = data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length;
        
        if (avgRating < 3) {
          insights.push({
            type: 'risk_alert',
            title: 'Fornecedor com Baixa Avaliação',
            message: `Fornecedor tem avaliação média de ${avgRating.toFixed(1)}/5. Considere alternativas.`,
            impact: 'high',
            action: 'Buscar novos fornecedores',
            confidence: 0.92
          });
        }
      });
    }

    // Insight 4: Análise de tempo de resposta
    if (historicalData.timeAnalysis?.avgResponseTime) {
      const avgDays = historicalData.timeAnalysis.avgResponseTime / (1000 * 60 * 60 * 24);
      
      if (avgDays > 5) {
        insights.push({
          type: 'efficiency',
          title: 'Tempo de Resposta Alto',
          message: `Tempo médio de resposta é ${avgDays.toFixed(1)} dias. Defina prazos mais curtos.`,
          impact: 'medium',
          action: 'Reduzir prazo de resposta para 3 dias',
          confidence: 0.88
        });
      } else if (avgDays < 2) {
        insights.push({
          type: 'efficiency',
          title: 'Excelente Tempo de Resposta',
          message: `Tempo médio de resposta é ${avgDays.toFixed(1)} dias. Fornecedores estão respondendo rapidamente.`,
          impact: 'low',
          action: 'Manter prazos atuais',
          confidence: 0.95
        });
      }
    }

    // Insight 5: Tendência de gastos
    if (historicalData.avgQuoteValue > 0) {
      const estimatedMonthlySpend = (historicalData.totalQuotes / 6) * historicalData.avgQuoteValue;
      
      insights.push({
        type: 'trend',
        title: 'Projeção de Gastos',
        message: `Com base no histórico, gastos mensais estimados: R$ ${estimatedMonthlySpend.toLocaleString('pt-BR')}`,
        impact: 'medium',
        action: 'Monitorar orçamento',
        value: estimatedMonthlySpend,
        confidence: 0.82
      });
    }

    // Insight 6: Recomendação geral
    if (historicalData.totalQuotes < 10) {
      insights.push({
        type: 'recommendation',
        title: 'Dados Limitados',
        message: 'Com mais cotações, poderemos fornecer insights mais precisos e personalizados.',
        impact: 'low',
        action: 'Continue usando o sistema',
        confidence: 1.0
      });
    }

    // Calcular scores
    const riskScore = Math.max(0, Math.min(100, 
      80 - (insights.filter(i => i.type === 'risk_alert').length * 15)
    ));

    const efficiencyScore = Math.min(100,
      60 + (insights.filter(i => i.type === 'efficiency' && i.impact === 'low').length * 10)
    );

    const responseData = {
      success: true,
      data: {
        insights: insights.slice(0, 6), // Máximo 6 insights
        predictions: predictions.slice(0, 5), // Máximo 5 predições
        summary: {
          totalSavingsOpportunity,
          riskScore,
          efficiencyScore
        },
        generatedAt: new Date().toISOString()
      }
    };

    console.log('✅ [AI-INSIGHTS] Insights gerados com sucesso');

    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ [AI-INSIGHTS] Erro:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});