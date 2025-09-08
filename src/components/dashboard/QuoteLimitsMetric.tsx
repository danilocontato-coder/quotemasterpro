import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FileText, AlertTriangle, TrendingUp, Infinity } from 'lucide-react';
import { useSupabaseSubscriptionGuard } from '@/hooks/useSupabaseSubscriptionGuard';
import { useAuth } from '@/contexts/AuthContext';

interface QuoteLimitsMetricProps {
  showUpgradeButton?: boolean;
  compact?: boolean;
}

export const QuoteLimitsMetric: React.FC<QuoteLimitsMetricProps> = ({ 
  showUpgradeButton = true,
  compact = false 
}) => {
  const { user } = useAuth();
  const { 
    currentUsage, 
    getUsagePercentage, 
    isNearLimit, 
    userPlan,
    checkLimit,
    isLoading: usageLoading
  } = useSupabaseSubscriptionGuard();

  // Always call all hooks first - no early returns before this
  const quotesResult = React.useMemo(() => checkLimit('CREATE_QUOTE', 0), [checkLimit]);
  const percentage = React.useMemo(() => getUsagePercentage('CREATE_QUOTE'), [getUsagePercentage]);

  // Now we can have early returns after all hooks are called
  if (!user) {
    return null;
  }

  if (usageLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-sm">Carregando limites...</span>
          </div>
          <div className="space-y-2">
            <div className="h-2 bg-muted rounded animate-pulse" />
            <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!userPlan) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-sm">Cotações</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Plano não encontrado. Verifique sua assinatura.
          </div>
        </CardContent>
      </Card>
    );
  }
  const isUnlimited = quotesResult.limit === -1;
  const nearLimit = percentage >= 80;
  const remaining = isUnlimited ? Number.POSITIVE_INFINITY : Math.max(0, quotesResult.limit - quotesResult.currentUsage);

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const formatLimit = (limit: number) => {
    return limit === -1 ? 'Ilimitado' : limit.toString();
  };

  if (compact) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-sm">Cotações</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {userPlan?.display_name || userPlan?.name || 'Plano Desconhecido'}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {quotesResult.currentUsage}/{formatLimit(quotesResult.limit)}
              </span>
              {isUnlimited && (
                <Infinity className="h-4 w-4 text-green-600" />
              )}
            </div>
            
            {!isUnlimited && (
              <div className="space-y-1">
                <Progress 
                  value={percentage} 
                  className="h-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{percentage}% usado</span>
                  {nearLimit && (
                    <span className="text-yellow-600 font-medium">
                      Próximo do limite
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {nearLimit && showUpgradeButton && (
            <Alert className="mt-3">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Você está próximo do limite de cotações mensais
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Uso de Cotações Mensais
          </div>
          <Badge variant="outline">
            {userPlan?.display_name || userPlan?.name || 'Plano Desconhecido'}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {nearLimit && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Você está próximo do limite de cotações do seu plano atual.
              {showUpgradeButton && " Considere fazer upgrade para continuar criando cotações sem restrições."}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">Cotações este mês</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {quotesResult.currentUsage}
              </span>
              <span className="text-muted-foreground">
                / {formatLimit(quotesResult.limit)}
              </span>
              {isUnlimited && (
                <Infinity className="h-5 w-5 text-green-600" />
              )}
            </div>
          </div>
          
          {!isUnlimited && (
            <div className="space-y-2">
              <Progress 
                value={percentage} 
                className="h-3"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{percentage}% do limite utilizado</span>
                <span>{remaining} restantes</span>
              </div>
            </div>
          )}
        </div>

        {nearLimit && showUpgradeButton && (
          <div className="pt-4 border-t">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.location.href = '/admin/plans'}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Ver Planos e Fazer Upgrade
            </Button>
          </div>
        )}

        {!nearLimit && !isUnlimited && quotesResult.currentUsage > 0 && remaining > 0 && (
          <div className="text-sm text-muted-foreground text-center pt-2 border-t">
            Você ainda tem {remaining} cotações disponíveis este mês
          </div>
        )}

        {!isUnlimited && remaining === 0 && (
          <div className="text-sm text-red-600 text-center pt-2 border-t font-medium">
            Limite de cotações do plano atingido neste mês
          </div>
        )}
      </CardContent>
    </Card>
  );
};