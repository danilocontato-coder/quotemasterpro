import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

interface AIUsageFilters {
  startDate?: Date;
  endDate?: Date;
  clientId?: string;
  provider?: string;
  feature?: string;
}

interface AIUsageSummary {
  totalTokens: number;
  totalCost: number;
  totalRequests: number;
  byProvider: Record<string, { tokens: number; cost: number; requests: number }>;
  byFeature: Record<string, { tokens: number; cost: number; requests: number }>;
  byClient: Array<{ clientId: string; clientName: string; tokens: number; cost: number; requests: number }>;
}

interface ChartDataPoint {
  date: string;
  tokens: number;
  cost: number;
  requests: number;
}

interface TableRow {
  id: string;
  created_at: string;
  client_id: string;
  client_name?: string;
  provider: string;
  model: string;
  feature: string;
  total_tokens: number;
  cost_usd: number;
  quote_id?: string;
}

export function useSuperAdminAIUsage(filters: AIUsageFilters = {}) {
  const {
    startDate = startOfMonth(new Date()),
    endDate = endOfMonth(new Date()),
    clientId,
    provider,
    feature
  } = filters;

  return useQuery({
    queryKey: ['super-admin-ai-usage', startDate, endDate, clientId, provider, feature],
    queryFn: async () => {
      // Buscar dados brutos com joins
      let query = supabase
        .from('ai_token_usage')
        .select(`
          *,
          clients:client_id (
            name
          )
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }
      if (provider) {
        query = query.eq('provider', provider);
      }
      if (feature) {
        query = query.eq('feature', feature);
      }

      const { data: rawData, error } = await query;

      if (error) {
        console.error('[useSuperAdminAIUsage] Erro ao buscar dados:', error);
        throw error;
      }

      // Processar dados para summary
      const summary: AIUsageSummary = {
        totalTokens: 0,
        totalCost: 0,
        totalRequests: rawData?.length || 0,
        byProvider: {},
        byFeature: {},
        byClient: []
      };

      const clientMap = new Map<string, { clientName: string; tokens: number; cost: number; requests: number }>();
      const dailyMap = new Map<string, { tokens: number; cost: number; requests: number }>();

      rawData?.forEach((row: any) => {
        const tokens = row.total_tokens || 0;
        const cost = parseFloat(row.cost_usd) || 0;

        summary.totalTokens += tokens;
        summary.totalCost += cost;

        // Por provider
        if (!summary.byProvider[row.provider]) {
          summary.byProvider[row.provider] = { tokens: 0, cost: 0, requests: 0 };
        }
        summary.byProvider[row.provider].tokens += tokens;
        summary.byProvider[row.provider].cost += cost;
        summary.byProvider[row.provider].requests += 1;

        // Por feature
        if (!summary.byFeature[row.feature]) {
          summary.byFeature[row.feature] = { tokens: 0, cost: 0, requests: 0 };
        }
        summary.byFeature[row.feature].tokens += tokens;
        summary.byFeature[row.feature].cost += cost;
        summary.byFeature[row.feature].requests += 1;

        // Por cliente
        const clientName = row.clients?.name || 'Cliente Desconhecido';
        if (!clientMap.has(row.client_id)) {
          clientMap.set(row.client_id, { clientName, tokens: 0, cost: 0, requests: 0 });
        }
        const clientStats = clientMap.get(row.client_id)!;
        clientStats.tokens += tokens;
        clientStats.cost += cost;
        clientStats.requests += 1;

        // Por dia (para gráfico)
        const dateKey = format(new Date(row.created_at), 'yyyy-MM-dd');
        if (!dailyMap.has(dateKey)) {
          dailyMap.set(dateKey, { tokens: 0, cost: 0, requests: 0 });
        }
        const dailyStats = dailyMap.get(dateKey)!;
        dailyStats.tokens += tokens;
        dailyStats.cost += cost;
        dailyStats.requests += 1;
      });

      // Converter clientMap para array
      summary.byClient = Array.from(clientMap.entries())
        .map(([clientId, stats]) => ({
          clientId,
          clientName: stats.clientName,
          tokens: stats.tokens,
          cost: stats.cost,
          requests: stats.requests
        }))
        .sort((a, b) => b.cost - a.cost);

      // Converter dailyMap para array de chart data
      const chartData: ChartDataPoint[] = Array.from(dailyMap.entries())
        .map(([date, stats]) => ({
          date,
          tokens: stats.tokens,
          cost: stats.cost,
          requests: stats.requests
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Preparar dados da tabela
      const tableData: TableRow[] = rawData?.map((row: any) => ({
        id: row.id,
        created_at: row.created_at,
        client_id: row.client_id,
        client_name: row.clients?.name,
        provider: row.provider,
        model: row.model,
        feature: row.feature,
        total_tokens: row.total_tokens,
        cost_usd: parseFloat(row.cost_usd),
        quote_id: row.quote_id
      })) || [];

      return {
        summary,
        chartData,
        tableData
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}
