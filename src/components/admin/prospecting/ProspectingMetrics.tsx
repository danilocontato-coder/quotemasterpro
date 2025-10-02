import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OptimizedMetricCard } from '@/components/ui/optimized-metrics';
import { TrendingUp, Users, Building2, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export function ProspectingMetrics() {
  const [metrics, setMetrics] = useState({
    totalLeads: 0,
    newThisMonth: 0,
    conversionRate: 0,
    potentialRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const { data: leads, error } = await supabase
        .from('ai_leads')
        .select('*');

      if (error) throw error;

      const now = new Date();
      const thisMonth = leads?.filter(l => 
        new Date(l.created_at).getMonth() === now.getMonth()
      ).length || 0;

      const converted = leads?.filter(l => l.status === 'converted').length || 0;
      const conversionRate = leads && leads.length > 0 
        ? ((converted / leads.length) * 100).toFixed(1)
        : 0;

      const potentialRevenue = leads?.reduce((sum, lead) => {
        const insights = lead.ai_insights as any;
        const revenue = insights?.potential_revenue_monthly || 0;
        return sum + revenue;
      }, 0) || 0;

      setMetrics({
        totalLeads: leads?.length || 0,
        newThisMonth: thisMonth,
        conversionRate: Number(conversionRate),
        potentialRevenue
      });
    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <OptimizedMetricCard
        title="Total de Leads"
        value={metrics.totalLeads}
        icon={<Users className="h-4 w-4" />}
        change={{ value: metrics.newThisMonth, type: 'increase' }}
      />
      
      <OptimizedMetricCard
        title="Novos este Mês"
        value={metrics.newThisMonth}
        icon={<TrendingUp className="h-4 w-4" />}
      />
      
      <OptimizedMetricCard
        title="Taxa de Conversão"
        value={`${metrics.conversionRate}%`}
        icon={<Building2 className="h-4 w-4" />}
      />
      
      <OptimizedMetricCard
        title="Receita Potencial"
        value={`R$ ${(metrics.potentialRevenue / 1000).toFixed(1)}k`}
        icon={<DollarSign className="h-4 w-4" />}
      />
    </div>
  );
}
