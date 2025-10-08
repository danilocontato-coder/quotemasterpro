import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, FileText, TrendingUp, Users, Briefcase, Calendar } from 'lucide-react';

interface ConsolidatedMetricsProps {
  totalCondominios: number;
  totalCotacoes: number;
  economiaTotal: number;
  fornecedoresUnicos: number;
  usuariosTotais: number;
  cotacoesMesAtual: number;
  isLoading?: boolean;
}

export function ConsolidatedMetrics({
  totalCondominios,
  totalCotacoes,
  economiaTotal,
  fornecedoresUnicos,
  usuariosTotais,
  cotacoesMesAtual,
  isLoading = false
}: ConsolidatedMetricsProps) {
  
  console.log('📊 ConsolidatedMetrics: Renderizando métricas consolidadas', {
    totalCondominios,
    totalCotacoes,
    cotacoesMesAtual
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const metrics = [
    {
      title: 'Condomínios Vinculados',
      value: totalCondominios,
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Total de condomínios gerenciados'
    },
    {
      title: 'Cotações Totais',
      value: totalCotacoes,
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: 'Todas as cotações criadas'
    },
    {
      title: 'Cotações (Mês Atual)',
      value: cotacoesMesAtual,
      icon: Calendar,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Cotações criadas este mês'
    },
    {
      title: 'Economia Total',
      value: formatCurrency(economiaTotal),
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      description: 'Economia obtida em negociações'
    },
    {
      title: 'Fornecedores Únicos',
      value: fornecedoresUnicos,
      icon: Briefcase,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      description: 'Fornecedores diferentes utilizados'
    },
    {
      title: 'Usuários Ativos',
      value: usuariosTotais,
      icon: Users,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      description: 'Total de usuários ativos'
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                  <Icon className={`h-4 w-4 ${metric.color}`} />
                </div>
                {metric.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
