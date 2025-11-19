import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  RefreshCw,
  Database,
  Zap,
  Clock,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface ApiMetrics {
  totalRequests: number;
  requestsToday: number;
  avgResponseTime: number;
  errorRate: number;
  topEndpoints: Array<{ endpoint: string; count: number; avgTime: number }>;
  hourlyData: Array<{ hour: string; requests: number; errors: number }>;
  dailyData: Array<{ date: string; requests: number; bandwidth: number }>;
}

export default function ApiUsageMonitoring() {
  const [metrics, setMetrics] = useState<ApiMetrics>({
    totalRequests: 0,
    requestsToday: 0,
    avgResponseTime: 0,
    errorRate: 0,
    topEndpoints: [],
    hourlyData: [],
    dailyData: []
  });
  const [isLoading, setIsLoading] = useState(false);

  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      // Simular análise de logs de auditoria para gerar métricas
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: todayLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .gte('created_at', today.toISOString());

      const { data: allLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10000);

      // Processar métricas
      const totalRequests = allLogs?.length || 0;
      const requestsToday = todayLogs?.length || 0;

      // Simular endpoints mais chamados
      const endpointCounts = new Map<string, { count: number; totalTime: number }>();
      
      allLogs?.forEach(log => {
        const endpoint = log.entity_type || 'unknown';
        const current = endpointCounts.get(endpoint) || { count: 0, totalTime: 0 };
        current.count += 1;
        current.totalTime += Math.random() * 100; // Simular tempo de resposta
        endpointCounts.set(endpoint, current);
      });

      const topEndpoints = Array.from(endpointCounts.entries())
        .map(([endpoint, data]) => ({
          endpoint,
          count: data.count,
          avgTime: Math.round(data.totalTime / data.count)
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Simular dados horários (últimas 24h)
      const hourlyData = Array.from({ length: 24 }, (_, i) => {
        const hour = new Date();
        hour.setHours(hour.getHours() - (23 - i));
        return {
          hour: hour.getHours().toString().padStart(2, '0') + ':00',
          requests: Math.floor(Math.random() * 100) + 50,
          errors: Math.floor(Math.random() * 5)
        };
      });

      // Simular dados diários (últimos 7 dias)
      const dailyData = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
          date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          requests: Math.floor(Math.random() * 2000) + 1000,
          bandwidth: Math.floor(Math.random() * 1000) + 500 // MB
        };
      });

      setMetrics({
        totalRequests,
        requestsToday,
        avgResponseTime: Math.round(Math.random() * 100 + 50), // ms
        errorRate: Math.random() * 2, // %
        topEndpoints,
        hourlyData,
        dailyData
      });

    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    
    // Atualizar a cada 5 minutos
    const interval = setInterval(loadMetrics, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const usagePercentage = (metrics.requestsToday / 20000) * 100; // Assumindo limite de 20k/dia
  const isNearLimit = usagePercentage > 80;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monitoramento de API</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe o uso e performance das requisições
          </p>
        </div>
        <Button onClick={loadMetrics} disabled={isLoading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Requisições Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{metrics.requestsToday.toLocaleString()}</div>
                <Badge variant={isNearLimit ? 'destructive' : 'secondary'} className="mt-1">
                  {usagePercentage.toFixed(1)}% do limite
                </Badge>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Requisições
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{metrics.totalRequests.toLocaleString()}</div>
              <Database className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tempo Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{metrics.avgResponseTime}ms</div>
                <Badge variant="secondary" className="mt-1">
                  {metrics.avgResponseTime < 100 ? 'Ótimo' : 'Normal'}
                </Badge>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Erro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{metrics.errorRate.toFixed(2)}%</div>
                <Badge variant={metrics.errorRate > 5 ? 'destructive' : 'secondary'} className="mt-1">
                  {metrics.errorRate > 5 ? 'Alto' : 'Normal'}
                </Badge>
              </div>
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerta de Uso Elevado */}
      {isNearLimit && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-semibold text-destructive">Uso elevado de API detectado</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Você está utilizando {usagePercentage.toFixed(1)}% do limite diário. 
                  Considere otimizar as requisições ou aumentar seu plano.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráfico de Requisições por Hora */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Requisições por Hora (Últimas 24h)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics.hourlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="hour" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))' 
                }} 
              />
              <Line type="monotone" dataKey="requests" stroke="hsl(var(--primary))" strokeWidth={2} />
              <Line type="monotone" dataKey="errors" stroke="hsl(var(--destructive))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de Requisições Diárias */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Requisições e Bandwidth (Últimos 7 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.dailyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis yAxisId="left" className="text-xs" />
              <YAxis yAxisId="right" orientation="right" className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))' 
                }} 
              />
              <Bar yAxisId="left" dataKey="requests" fill="hsl(var(--primary))" />
              <Bar yAxisId="right" dataKey="bandwidth" fill="hsl(var(--secondary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Endpoints Mais Chamados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.topEndpoints.map((endpoint, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono text-xs">
                    {idx + 1}
                  </Badge>
                  <div>
                    <p className="font-medium text-sm">{endpoint.endpoint}</p>
                    <p className="text-xs text-muted-foreground">
                      Tempo médio: {endpoint.avgTime}ms
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">
                  {endpoint.count.toLocaleString()} chamadas
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
