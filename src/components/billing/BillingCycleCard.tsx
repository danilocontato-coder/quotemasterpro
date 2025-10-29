import React from 'react';
import { Calendar, Clock, AlertTriangle, CheckCircle, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useBillingCycle } from '@/hooks/useBillingCycle';
import { Skeleton } from '@/components/ui/skeleton';

export function BillingCycleCard({ compact = false }: { compact?: boolean }) {
  const { cycleInfo, isLoading } = useBillingCycle();

  console.log('🎨 [BillingCycleCard] Renderizando:', { 
    hasInfo: !!cycleInfo, 
    isLoading,
    anchorDay: cycleInfo?.billingAnchorDay 
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!cycleInfo) {
    return null;
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const getStatusBadge = () => {
    switch (cycleInfo.subscriptionStatus) {
      case 'active':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Ativo</Badge>;
      case 'past_due':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Pagamento Atrasado</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspenso</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelado</Badge>;
    }
  };

  const daysInCycle = cycleInfo.billingCycle === 'monthly' ? 30 : 365;
  const daysPassed = daysInCycle - cycleInfo.daysUntilRenewal;
  const progressPercentage = Math.round((daysPassed / daysInCycle) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Ciclo de Cobrança
          </span>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {cycleInfo.isNearRenewal && cycleInfo.subscriptionStatus === 'active' && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Sua assinatura será renovada em <strong>{cycleInfo.daysUntilRenewal} dia(s)</strong>
            </AlertDescription>
          </Alert>
        )}

        {cycleInfo.subscriptionStatus === 'past_due' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Ação necessária:</strong> Seu pagamento está atrasado. Regularize para evitar suspensão.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Período Atual</span>
            <span className="font-medium">
              {formatDate(cycleInfo.currentPeriodStart)} até {formatDate(cycleInfo.currentPeriodEnd)}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Próxima Renovação</span>
            <span className="font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              {formatDate(cycleInfo.nextBillingDate)}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Dia de Ancoramento</span>
            <Badge variant="outline">Dia {cycleInfo.billingAnchorDay}</Badge>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Ciclo</span>
            <Badge variant="secondary">
              {cycleInfo.billingCycle === 'monthly' ? 'Mensal' : 'Anual'}
            </Badge>
          </div>
        </div>

        {!compact && (
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progresso do ciclo</span>
              <span>{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {cycleInfo.daysUntilRenewal} dia(s) restantes
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
