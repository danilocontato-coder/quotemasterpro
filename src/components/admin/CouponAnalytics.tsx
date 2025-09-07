import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, DollarSign, Target, Calendar, BarChart3, PieChart, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCoupons } from '@/hooks/useCoupons';
import { supabase } from '@/integrations/supabase/client';

interface CouponPerformanceData {
  coupon_id: string;
  code: string;
  name: string;
  total_uses: number;
  total_discount_given: number;
  total_revenue_impact: number;
  avg_discount_per_use: number;
  conversion_rate: number;
  last_used: string | null;
  users_reached: number;
}

interface TimeSeriesData {
  date: string;
  uses: number;
  discount_amount: number;
}

export const CouponAnalytics = () => {
  const { coupons, couponUsages } = useCoupons();
  const [performanceData, setPerformanceData] = useState<CouponPerformanceData[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedPeriod, coupons, couponUsages]);

  const loadAnalyticsData = async () => {
    try {
      setIsLoading(true);
      
      // Calcular dados de performance por cupom
      const performance = coupons.map(coupon => {
        const usages = couponUsages.filter(usage => usage.coupon_id === coupon.id);
        
        const totalUses = usages.length;
        const totalDiscountGiven = usages.reduce((sum, usage) => sum + usage.discount_amount, 0);
        const totalRevenueImpact = usages.reduce((sum, usage) => sum + usage.final_amount, 0);
        const avgDiscountPerUse = totalUses > 0 ? totalDiscountGiven / totalUses : 0;
        const usersReached = new Set(usages.map(usage => usage.user_id)).size;
        
        // Taxa de conversão estimada (baseada no uso vs limite)
        const conversionRate = coupon.usage_limit 
          ? (totalUses / coupon.usage_limit) * 100
          : (totalUses / Math.max(totalUses, 10)) * 100; // Estimativa se não há limite
          
        const lastUsed = usages.length > 0 
          ? Math.max(...usages.map(u => new Date(u.used_at).getTime()))
          : null;

        return {
          coupon_id: coupon.id,
          code: coupon.code,
          name: coupon.name,
          total_uses: totalUses,
          total_discount_given: totalDiscountGiven,
          total_revenue_impact: totalRevenueImpact,
          avg_discount_per_use: avgDiscountPerUse,
          conversion_rate: conversionRate,
          last_used: lastUsed ? new Date(lastUsed).toISOString() : null,
          users_reached: usersReached
        };
      });

      setPerformanceData(performance.sort((a, b) => b.total_uses - a.total_uses));

      // Calcular dados de série temporal
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(selectedPeriod));
      
      const timeSeries: { [key: string]: TimeSeriesData } = {};
      
      // Inicializar todos os dias no período
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        timeSeries[dateKey] = {
          date: dateKey,
          uses: 0,
          discount_amount: 0
        };
      }
      
      // Preencher com dados reais
      couponUsages.forEach(usage => {
        const usageDate = new Date(usage.used_at).toISOString().split('T')[0];
        if (timeSeries[usageDate]) {
          timeSeries[usageDate].uses += 1;
          timeSeries[usageDate].discount_amount += usage.discount_amount;
        }
      });
      
      setTimeSeriesData(Object.values(timeSeries).sort((a, b) => a.date.localeCompare(b.date)));
      
    } catch (error) {
      console.error('Erro ao carregar dados de análise:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportAnalyticsData = () => {
    const csvContent = [
      ['Código', 'Nome', 'Usos', 'Desconto Total', 'Impacto Receita', 'Usuários Alcançados', 'Taxa Conversão', 'Último Uso'],
      ...performanceData.map(data => [
        data.code,
        data.name,
        data.total_uses,
        `R$ ${data.total_discount_given.toFixed(2)}`,
        `R$ ${data.total_revenue_impact.toFixed(2)}`,
        data.users_reached,
        `${data.conversion_rate.toFixed(1)}%`,
        data.last_used ? new Date(data.last_used).toLocaleDateString('pt-BR') : 'Nunca'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-cupons-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Estatísticas gerais
  const totalUsesInPeriod = timeSeriesData.reduce((sum, data) => sum + data.uses, 0);
  const totalDiscountInPeriod = timeSeriesData.reduce((sum, data) => sum + data.discount_amount, 0);
  const averageUsesPerDay = totalUsesInPeriod / parseInt(selectedPeriod);
  const topPerformingCoupon = performanceData[0];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">Carregando análises...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com controles */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Analytics de Cupons</h2>
          <p className="text-muted-foreground">
            Análise detalhada de performance e impacto dos cupons
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportAnalyticsData} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* KPIs do período */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usos no Período</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsesInPeriod}</div>
            <p className="text-xs text-muted-foreground">
              Média: {averageUsesPerDay.toFixed(1)} por dia
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Desconto Concedido</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalDiscountInPeriod.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Nos últimos {selectedPeriod} dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cupom Top</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {topPerformingCoupon?.code || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {topPerformingCoupon?.total_uses || 0} usos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Únicos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(couponUsages.map(u => u.user_id)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Usuários que usaram cupons
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Performance por Cupom */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance por Cupom
          </CardTitle>
          <CardDescription>
            Análise detalhada de cada cupom criado
          </CardDescription>
        </CardHeader>
        <CardContent>
          {performanceData.length === 0 ? (
            <div className="text-center py-8">
              <PieChart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum dado disponível</h3>
              <p className="text-muted-foreground">
                Ainda não há cupons com uso registrado
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cupom</TableHead>
                  <TableHead>Usos</TableHead>
                  <TableHead>Desconto Total</TableHead>
                  <TableHead>Receita Impactada</TableHead>
                  <TableHead>Usuários Únicos</TableHead>
                  <TableHead>Taxa Conversão</TableHead>
                  <TableHead>Último Uso</TableHead>
                  <TableHead>Performance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performanceData.map((data, index) => (
                  <TableRow key={data.coupon_id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{data.code}</div>
                        <div className="text-sm text-muted-foreground">
                          {data.name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{data.total_uses}</div>
                      <div className="text-sm text-muted-foreground">
                        Média: R$ {data.avg_discount_per_use.toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-green-600">
                        R$ {data.total_discount_given.toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        R$ {data.total_revenue_impact.toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        {data.users_reached}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={data.conversion_rate > 50 ? "default" : 
                                data.conversion_rate > 25 ? "secondary" : "outline"}
                      >
                        {data.conversion_rate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {data.last_used ? (
                        <div className="text-sm">
                          {new Date(data.last_used).toLocaleDateString('pt-BR')}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Nunca</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <div className="text-sm font-medium">
                          #{index + 1}
                        </div>
                        {index === 0 && (
                          <Badge variant="default" className="text-xs">
                            Top
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Gráfico de Tendência (dados tabulares) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Tendência de Uso (Últimos {selectedPeriod} dias)
          </CardTitle>
          <CardDescription>
            Distribuição de uso de cupons ao longo do tempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Resumo por Semana</h4>
              <div className="space-y-2">
                {timeSeriesData
                  .filter((_, index) => index % 7 === 0)
                  .slice(-4)
                  .map((data, index) => {
                    const weekStart = new Date(data.date);
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekEnd.getDate() + 6);
                    
                    const weekUsages = timeSeriesData
                      .slice(index * 7, (index + 1) * 7)
                      .reduce((sum, d) => sum + d.uses, 0);
                    
                    const weekDiscount = timeSeriesData
                      .slice(index * 7, (index + 1) * 7)
                      .reduce((sum, d) => sum + d.discount_amount, 0);

                    return (
                      <div key={data.date} className="flex justify-between items-center p-3 border rounded">
                        <div>
                          <div className="font-medium">
                            {weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - {weekEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            R$ {weekDiscount.toFixed(2)} em descontos
                          </div>
                        </div>
                        <Badge variant="outline">
                          {weekUsages} usos
                        </Badge>
                      </div>
                    );
                  })}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-3">Dias com Maior Atividade</h4>
              <div className="space-y-2">
                {timeSeriesData
                  .sort((a, b) => b.uses - a.uses)
                  .slice(0, 5)
                  .map((data) => (
                    <div key={data.date} className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <div className="font-medium">
                          {new Date(data.date).toLocaleDateString('pt-BR', { 
                            weekday: 'short', 
                            day: '2-digit', 
                            month: '2-digit' 
                          })}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          R$ {data.discount_amount.toFixed(2)}
                        </div>
                      </div>
                      <Badge>
                        {data.uses} usos
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};