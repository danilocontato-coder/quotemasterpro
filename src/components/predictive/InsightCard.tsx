import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Target,
  ArrowRight
} from 'lucide-react';

interface InsightCardProps {
  type: 'cost_saving' | 'efficiency' | 'risk_alert' | 'trend' | 'recommendation';
  title: string;
  message: string;
  impact: 'high' | 'medium' | 'low';
  action: string;
  value?: number;
  confidence: number;
}

export const InsightCard: React.FC<InsightCardProps> = ({
  type,
  title,
  message,
  impact,
  action,
  value,
  confidence
}) => {
  const getIcon = () => {
    switch (type) {
      case 'cost_saving':
        return <TrendingDown className="h-5 w-5 text-green-600" />;
      case 'efficiency':
        return <Target className="h-5 w-5 text-blue-600" />;
      case 'risk_alert':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'trend':
        return <TrendingUp className="h-5 w-5 text-purple-600" />;
      case 'recommendation':
        return <Lightbulb className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getImpactColor = () => {
    switch (impact) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'cost_saving':
        return 'Economia';
      case 'efficiency':
        return 'Eficiência';
      case 'risk_alert':
        return 'Alerta';
      case 'trend':
        return 'Tendência';
      case 'recommendation':
        return 'Recomendação';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getIcon()}
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <Badge variant={getImpactColor()}>
            {impact === 'high' ? 'Alto Impacto' : impact === 'medium' ? 'Médio Impacto' : 'Baixo Impacto'}
          </Badge>
        </div>
        <Badge variant="outline" className="w-fit mt-2">
          {getTypeLabel()}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{message}</p>

        {value !== undefined && (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <TrendingDown className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-xs text-muted-foreground">Economia Estimada</p>
              <p className="text-lg font-bold text-green-600">
                R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        )}

        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Ação Recomendada</p>
          <p className="text-sm font-medium">{action}</p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${confidence * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {Math.round(confidence * 100)}% confiança
            </span>
          </div>
          <Button size="sm" variant="ghost">
            Ver Detalhes <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
