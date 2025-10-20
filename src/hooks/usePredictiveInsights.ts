import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Insight {
  type: 'cost_saving' | 'efficiency' | 'risk_alert' | 'trend' | 'recommendation';
  title: string;
  message: string;
  impact: 'high' | 'medium' | 'low';
  action: string;
  value?: number;
  confidence: number;
}

interface Prediction {
  category: string;
  predictedDemand: string;
  suggestedAction: string;
  timeframe: string;
}

interface InsightsSummary {
  totalSavingsOpportunity: number;
  riskScore: number;
  efficiencyScore: number;
}

interface PredictiveInsightsData {
  insights: Insight[];
  predictions: Prediction[];
  summary: InsightsSummary;
  generatedAt: string;
}

export const usePredictiveInsights = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<PredictiveInsightsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistoricalData = async (clientId: string) => {
    console.log('📊 [PREDICTIVE-INSIGHTS] Buscando dados históricos');

    // Buscar cotações dos últimos 6 meses
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: quotes, error: quotesError } = await supabase
      .from('quotes')
      .select(`
        id,
        title,
        total,
        status,
        created_at,
        deadline,
        quote_items (
          id,
          product_name,
          quantity,
          unit_price,
          total
        ),
        quote_responses (
          id,
          quote_id,
          supplier_id,
          total_amount,
          delivery_days,
          created_at
        )
      `)
      .eq('client_id', clientId)
      .gte('created_at', sixMonthsAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(100);

    if (quotesError) {
      console.error('❌ [PREDICTIVE-INSIGHTS] Erro ao buscar cotações:', quotesError);
      throw quotesError;
    }

    // Buscar avaliações de fornecedores
    const { data: ratings, error: ratingsError } = await supabase
      .from('supplier_ratings')
      .select('*')
      .eq('client_id', clientId)
      .gte('created_at', sixMonthsAgo.toISOString());

    if (ratingsError) {
      console.error('❌ [PREDICTIVE-INSIGHTS] Erro ao buscar avaliações:', ratingsError);
      throw ratingsError;
    }

    // Processar dados para análise
    const processedData = {
      totalQuotes: quotes?.length || 0,
      avgQuoteValue: quotes?.reduce((sum, q) => sum + (Number(q.total) || 0), 0) / (quotes?.length || 1),
      statusDistribution: quotes?.reduce((acc, q) => {
        acc[q.status] = (acc[q.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      productAnalysis: quotes?.flatMap(q => q.quote_items || []).reduce((acc, item: any) => {
        const productName = item.product_name || 'Outros';
        if (!acc[productName]) {
          acc[productName] = { count: 0, totalValue: 0 };
        }
        acc[productName].count += 1;
        acc[productName].totalValue += Number(item.total) || 0;
        return acc;
      }, {} as Record<string, { count: number; totalValue: number }>),
      supplierPerformance: ratings?.reduce((acc, r) => {
        if (!acc[r.supplier_id]) {
          acc[r.supplier_id] = { ratings: [], avgRating: 0 };
        }
        acc[r.supplier_id].ratings.push(r.rating);
        return acc;
      }, {} as Record<string, { ratings: number[]; avgRating: number }>),
      timeAnalysis: {
        avgResponseTime: quotes?.flatMap(q => q.quote_responses || [])
          .map((r: any) => {
            const quoteDate = quotes.find(q => q.id === r.quote_id)?.created_at;
            if (!quoteDate) return 0;
            return new Date(r.created_at).getTime() - new Date(quoteDate).getTime();
          })
          .reduce((sum, time) => sum + time, 0) / (quotes?.flatMap(q => q.quote_responses || []).length || 1)
      }
    };

    console.log('✅ [PREDICTIVE-INSIGHTS] Dados processados:', processedData);
    return processedData;
  };

  const generateInsights = async () => {
    if (!user?.clientId) {
      const errorMsg = 'Você precisa estar vinculado a um condomínio para visualizar insights';
      console.error('❌ [PREDICTIVE-INSIGHTS] Client ID não encontrado:', { user });
      setError(errorMsg);
      toast({
        title: "Acesso Restrito",
        description: errorMsg,
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Buscar dados históricos
      const historicalData = await fetchHistoricalData(user.clientId);

      // Chamar edge function de IA
      console.log('🤖 [PREDICTIVE-INSIGHTS] Chamando IA para gerar insights');
      const { data: insightsData, error: functionError } = await supabase.functions.invoke(
        'ai-predictive-insights',
        {
          body: {
            clientId: user.clientId,
            historicalData
          }
        }
      );

      if (functionError) {
        console.error('❌ [PREDICTIVE-INSIGHTS] Erro na edge function:', functionError);
        throw new Error(functionError.message || 'Erro ao processar insights');
      }

      if (!insightsData?.success) {
        console.error('❌ [PREDICTIVE-INSIGHTS] Resposta inválida:', insightsData);
        throw new Error(insightsData?.error || 'Resposta inválida da IA');
      }

      console.log('✅ [PREDICTIVE-INSIGHTS] Insights recebidos:', insightsData);
      setData(insightsData.data);

      toast({
        title: "Insights gerados!",
        description: "Análise preditiva atualizada com sucesso.",
      });
    } catch (err: any) {
      console.error('💥 [PREDICTIVE-INSIGHTS] Erro ao gerar insights:', err);
      const errorMessage = err.message || 'Erro desconhecido ao gerar insights';
      setError(errorMessage);
      toast({
        title: "Erro ao gerar insights",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.clientId) {
      generateInsights();
    } else {
      console.log('⏸️ [PREDICTIVE-INSIGHTS] Aguardando clientId do usuário');
      setIsLoading(false);
    }
  }, [user?.clientId]);

  return {
    data,
    isLoading,
    error,
    refetch: generateInsights
  };
};
