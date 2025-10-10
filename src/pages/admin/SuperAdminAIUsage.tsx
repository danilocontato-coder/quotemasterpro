import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSuperAdminAIUsage } from '@/hooks/useSuperAdminAIUsage';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { Bot, DollarSign, Activity, TrendingUp, Download, Filter, BarChart3, PieChart } from 'lucide-react';
import { LineChart, Line, PieChart as RechartsPie, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function SuperAdminAIUsage() {
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [clientId, setClientId] = useState<string>();
  const [provider, setProvider] = useState<string>();
  const [feature, setFeature] = useState<string>();

  const { data, isLoading, error } = useSuperAdminAIUsage({
    startDate,
    endDate,
    clientId,
    provider,
    feature
  });

  const handleQuickDateFilter = (months: number) => {
    const end = endOfMonth(new Date());
    const start = startOfMonth(subMonths(end, months - 1));
    setStartDate(start);
    setEndDate(end);
  };

  const exportToCSV = () => {
    if (!data?.tableData) return;

    const headers = ['Data', 'Cliente', 'Provider', 'Modelo', 'Feature', 'Tokens', 'Custo USD', 'RFQ ID'];
    const rows = data.tableData.map(row => [
      format(new Date(row.created_at), 'dd/MM/yyyy HH:mm'),
      row.client_name || 'N/A',
      row.provider,
      row.model,
      row.feature,
      row.total_tokens,
      row.cost_usd.toFixed(6),
      row.quote_id || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ai-usage-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="p-6">
            <p className="text-destructive">Erro ao carregar dados: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Consumo de IA</h1>
          <p className="text-muted-foreground mt-1">
            Monitoramento de uso de tokens e custos de IA por cliente
          </p>
        </div>
        <Button onClick={exportToCSV} disabled={!data?.tableData?.length}>
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Período Rápido</label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleQuickDateFilter(1)}>
                  Este Mês
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleQuickDateFilter(3)}>
                  3 Meses
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleQuickDateFilter(6)}>
                  6 Meses
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Data Início</label>
              <Input
                type="date"
                value={format(startDate, 'yyyy-MM-dd')}
                onChange={(e) => setStartDate(new Date(e.target.value))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Data Fim</label>
              <Input
                type="date"
                value={format(endDate, 'yyyy-MM-dd')}
                onChange={(e) => setEndDate(new Date(e.target.value))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Provider</label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="perplexity">Perplexity</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Feature</label>
              <Select value={feature} onValueChange={setFeature}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="quote_chat">Chat de Cotação</SelectItem>
                  <SelectItem value="quote_generator">Gerador de Cotação</SelectItem>
                  <SelectItem value="negotiation">Negociação IA</SelectItem>
                  <SelectItem value="market_analysis">Análise de Mercado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Resumo */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Tokens</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(data?.summary.totalTokens || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {data?.summary.totalRequests || 0} requisições
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${(data?.summary.totalCost || 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                USD estimado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Custo Médio/Req</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(((data?.summary.totalCost || 0) as number) / ((data?.summary.totalRequests || 1) as number)).toFixed(4)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                por requisição
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Cliente</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold truncate">
                {data?.summary.byClient[0]?.clientName || 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                ${(data?.summary.byClient[0]?.cost || 0).toFixed(2)} USD
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Linha - Tendência */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Tendência de Uso
            </CardTitle>
            <CardDescription>Tokens e custo ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data?.chartData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="tokens" stroke="#3b82f6" name="Tokens" />
                  <Line yAxisId="right" type="monotone" dataKey="cost" stroke="#10b981" name="Custo USD" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de Pizza - Por Provider */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Distribuição por Provider
            </CardTitle>
            <CardDescription>Custo por provedor de IA</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPie>
                  <Pie
                    data={Object.entries(data?.summary.byProvider || {}).map(([name, stats]) => ({
                      name,
                      value: stats.cost
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.keys(data?.summary.byProvider || {}).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                </RechartsPie>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Clientes */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Clientes por Custo</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Requisições</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Custo USD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.summary.byClient.slice(0, 10).map((client) => (
                  <TableRow key={client.clientId}>
                    <TableCell className="font-medium">{client.clientName}</TableCell>
                    <TableCell className="text-right">{client.requests}</TableCell>
                    <TableCell className="text-right">{client.tokens.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      ${client.cost.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Tabela Detalhada */}
      <Card>
        <CardHeader>
          <CardTitle>Requisições Recentes</CardTitle>
          <CardDescription>Últimas 100 requisições de IA</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Feature</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.tableData.slice(0, 100).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs">
                        {format(new Date(row.created_at), 'dd/MM HH:mm')}
                      </TableCell>
                      <TableCell className="text-sm">{row.client_name || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={row.provider === 'openai' ? 'default' : 'secondary'}>
                          {row.provider}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{row.model}</TableCell>
                      <TableCell className="text-xs">{row.feature}</TableCell>
                      <TableCell className="text-right">{row.total_tokens.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-green-600">
                        ${row.cost_usd.toFixed(6)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
