import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSuperAdminAnalytics = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [revenueData, setRevenueData] = useState<Array<{
    month: string;
    revenue: number;
    subscriptions: number;
  }>>([]);

  const [quotesStatusData, setQuotesStatusData] = useState<Array<{
    status: string;
    count: number;
    color: string;
  }>>([]);

  const [topClientsData, setTopClientsData] = useState<Array<{
    name: string;
    quotes: number;
    revenue: number;
  }>>([]);

  const [activityHeatmap, setActivityHeatmap] = useState<Array<{
    hour: string;
    activities: number;
  }>>([]);

  const [conversionFunnel, setConversionFunnel] = useState<Array<{
    name: string;
    count: number;
    percentage: number;
  }>>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);

        // 1. Buscar dados de receita mensal dos últimos 6 meses
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        // Mock data de receita (em produção, buscar do banco)
        const mockRevenueData = [
          { month: 'Mai', revenue: 45000, subscriptions: 23 },
          { month: 'Jun', revenue: 52000, subscriptions: 28 },
          { month: 'Jul', revenue: 58000, subscriptions: 32 },
          { month: 'Ago', revenue: 61000, subscriptions: 35 },
          { month: 'Set', revenue: 67000, subscriptions: 38 },
          { month: 'Out', revenue: 75000, subscriptions: 42 },
        ];
        setRevenueData(mockRevenueData);

        // 2. Buscar status das cotações
        const { data: quotes } = await supabase
          .from('quotes')
          .select('status');

        const statusMap = new Map<string, number>();
        quotes?.forEach(q => {
          statusMap.set(q.status, (statusMap.get(q.status) || 0) + 1);
        });

        const statusColors: Record<string, string> = {
          'draft': '#9CA3AF',
          'sent': '#3B82F6',
          'receiving': '#F59E0B',
          'received': '#8B5CF6',
          'approved': '#10B981',
          'rejected': '#EF4444',
          'completed': '#059669',
          'cancelled': '#6B7280',
        };

        const statusLabels: Record<string, string> = {
          'draft': 'Rascunho',
          'sent': 'Enviada',
          'receiving': 'Recebendo',
          'received': 'Recebida',
          'approved': 'Aprovada',
          'rejected': 'Rejeitada',
          'completed': 'Concluída',
          'cancelled': 'Cancelada',
        };

        const quotesStatus = Array.from(statusMap.entries()).map(([status, count]) => ({
          status: statusLabels[status] || status,
          count,
          color: statusColors[status] || '#6B7280'
        }));
        setQuotesStatusData(quotesStatus);

        // 3. Top 5 clientes
        const { data: topClients } = await supabase
          .from('clients')
          .select(`
            name,
            id
          `)
          .eq('status', 'active')
          .limit(10);

        if (topClients) {
          const clientsWithStats = await Promise.all(
            topClients.map(async (client) => {
              const { count: quotesCount } = await supabase
                .from('quotes')
                .select('*', { count: 'exact', head: true })
                .eq('client_id', client.id);

              const { data: payments } = await supabase
                .from('payments')
                .select('amount')
                .eq('client_id', client.id)
                .eq('status', 'completed');

              const revenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

              return {
                name: client.name.length > 20 ? client.name.substring(0, 20) + '...' : client.name,
                quotes: quotesCount || 0,
                revenue
              };
            })
          );

          const topFive = clientsWithStats
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
          
          setTopClientsData(topFive);
        }

        // 4. Heatmap de atividade por hora (últimas 24h)
        const hoursData = Array.from({ length: 24 }, (_, i) => ({
          hour: `${i}h`,
          activities: Math.floor(Math.random() * 100) // Mock - em produção buscar do audit_logs
        }));
        setActivityHeatmap(hoursData);

        // 5. Funil de conversão
        const totalQuotes = quotes?.length || 0;
        const sentQuotes = quotes?.filter(q => ['sent', 'receiving', 'received', 'approved', 'completed'].includes(q.status)).length || 0;
        const receivedQuotes = quotes?.filter(q => ['received', 'approved', 'completed'].includes(q.status)).length || 0;
        const approvedQuotes = quotes?.filter(q => ['approved', 'completed'].includes(q.status)).length || 0;
        const completedQuotes = quotes?.filter(q => q.status === 'completed').length || 0;

        setConversionFunnel([
          { name: 'Criadas', count: totalQuotes, percentage: 100 },
          { name: 'Enviadas', count: sentQuotes, percentage: (sentQuotes / totalQuotes) * 100 },
          { name: 'Recebidas', count: receivedQuotes, percentage: (receivedQuotes / totalQuotes) * 100 },
          { name: 'Aprovadas', count: approvedQuotes, percentage: (approvedQuotes / totalQuotes) * 100 },
          { name: 'Concluídas', count: completedQuotes, percentage: (completedQuotes / totalQuotes) * 100 },
        ]);

      } catch (err) {
        console.error('Erro ao buscar analytics:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  return {
    revenueData,
    quotesStatusData,
    topClientsData,
    activityHeatmap,
    conversionFunnel,
    isLoading,
    error
  };
};
