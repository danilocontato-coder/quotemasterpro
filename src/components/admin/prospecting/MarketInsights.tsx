import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, TrendingUp, AlertTriangle, Lightbulb, Target } from 'lucide-react';

interface MarketInsightsProps {
  insights: any;
  isLoading: boolean;
}

export function MarketInsights({ insights, isLoading }: MarketInsightsProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!insights) {
    return (
      <Alert>
        <Lightbulb className="h-4 w-4" />
        <AlertDescription>
          Clique em "Analisar Mercado com IA" para gerar insights inteligentes sobre oportunidades de prospecção.
        </AlertDescription>
      </Alert>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgente': return 'destructive';
      case 'alta': return 'default';
      case 'media': return 'secondary';
      case 'baixa': return 'outline';
      default: return 'default';
    }
  };

  const getPotentialColor = (potential: string) => {
    switch (potential?.toLowerCase()) {
      case 'alto': return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'medio': return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
      case 'baixo': return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
      default: return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Regiões Prioritárias */}
      {insights.priority_regions && insights.priority_regions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Regiões Prioritárias
            </CardTitle>
            <CardDescription>
              Áreas com maior potencial de crescimento identificadas pela IA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.priority_regions.map((region: any, idx: number) => (
                <div 
                  key={idx} 
                  className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{region.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {region.reasoning}
                      </p>
                    </div>
                    <Badge className={getPotentialColor(region.potential)}>
                      {region.potential}
                    </Badge>
                  </div>
                  {region.estimated_revenue && (
                    <div className="flex items-center gap-2 mt-3 text-sm">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="font-medium">
                        Receita Estimada: R$ {region.estimated_revenue.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ações Recomendadas */}
      {insights.recommended_actions && insights.recommended_actions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Ações Recomendadas
            </CardTitle>
            <CardDescription>
              Próximos passos sugeridos pela IA para maximizar resultados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.recommended_actions.map((action: any, idx: number) => (
                <div 
                  key={idx}
                  className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={getPriorityColor(action.priority)}>
                        {action.priority}
                      </Badge>
                      {action.estimated_leads && (
                        <span className="text-sm text-muted-foreground">
                          ~{action.estimated_leads} leads esperados
                        </span>
                      )}
                    </div>
                    <p className="font-medium">{action.action}</p>
                    {action.expected_impact && (
                      <p className="text-sm text-muted-foreground mt-1">
                        💡 {action.expected_impact}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gaps de Fornecedores */}
      {insights.supplier_gaps && insights.supplier_gaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Gaps de Fornecedores
            </CardTitle>
            <CardDescription>
              Especialidades e regiões com demanda não atendida
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.supplier_gaps.map((gap: any, idx: number) => (
                <div 
                  key={idx}
                  className="p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{gap.specialty}</h3>
                    <Badge variant="outline">{gap.region}</Badge>
                  </div>
                  <div className="text-sm space-y-1">
                    <p className="text-muted-foreground">{gap.demand_level} demanda</p>
                    <p className="text-muted-foreground">
                      Oferta atual: {gap.current_supply} fornecedores
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Métricas Chave */}
      {insights.key_metrics && (
        <Card>
          <CardHeader>
            <CardTitle>Saúde do Mercado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6 text-center">
              {insights.key_metrics.market_health_score && (
                <div>
                  <p className="text-3xl font-bold text-primary">
                    {insights.key_metrics.market_health_score}/100
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Score de Saúde</p>
                </div>
              )}
              {insights.key_metrics.growth_potential && (
                <div>
                  <p className="text-3xl font-bold text-green-500">
                    {insights.key_metrics.growth_potential}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Potencial de Crescimento</p>
                </div>
              )}
              {insights.key_metrics.competitive_position && (
                <div>
                  <p className="text-3xl font-bold text-blue-500">
                    {insights.key_metrics.competitive_position}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Posição Competitiva</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
