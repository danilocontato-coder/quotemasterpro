/**
 * Token Monitoring Card Component
 * 
 * Displays real-time metrics and activity for the quote token system.
 * Shows token usage, expiration alerts, and recent activity.
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link2, AlertTriangle, CheckCircle, Clock, TrendingUp, ExternalLink } from 'lucide-react';
import { useQuoteTokensMonitoring } from '@/hooks/useQuoteTokensMonitoring';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function TokenMonitoringCard() {
  const { metrics, recentActivity, isLoading, error, refetch } = useQuoteTokensMonitoring();

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50/50">
        <CardHeader>
          <CardTitle className="text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Erro ao Carregar Tokens
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
          <Button onClick={refetch} variant="outline" size="sm" className="mt-4">
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
          <Link2 className="h-5 w-5" />
          Sistema de Tokens de Cotação
        </CardTitle>
        <CardDescription>
          Monitoramento de links compartilháveis e acesso de fornecedores
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Métricas Principais */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            <>
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </>
          ) : (
            <>
              {/* Total Tokens */}
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Total</span>
                  <Link2 className="h-4 w-4 text-purple-500" />
                </div>
                <div className="text-2xl font-bold text-foreground">{metrics.total_tokens}</div>
                <p className="text-xs text-muted-foreground mt-1">Tokens criados</p>
              </div>

              {/* Tokens Ativos */}
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Ativos</span>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-foreground">{metrics.active_tokens}</div>
                <p className="text-xs text-muted-foreground mt-1">Válidos e não usados</p>
              </div>

              {/* Taxa de Uso */}
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Taxa de Uso</span>
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {metrics.usage_rate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.used_tokens} acessados
                </p>
              </div>

              {/* Alertas */}
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Alertas</span>
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {metrics.expired_unused + metrics.expiring_soon}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.expired_unused} expirados, {metrics.expiring_soon} expirando
                </p>
              </div>
            </>
          )}
        </div>

        {/* Atividade Recente */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Atividade Recente
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {isLoading ? (
              <>
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </>
            ) : recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum token criado ainda</p>
              </div>
            ) : (
              recentActivity.map((activity) => {
                const isExpired = new Date(activity.expires_at) < new Date();
                const isUsed = activity.used_at !== null;
                
                return (
                  <div 
                    key={activity.short_code}
                    className="bg-white dark:bg-gray-900 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {activity.quote_title}
                          </p>
                          <Badge 
                            variant={isExpired ? "destructive" : isUsed ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {isExpired ? "Expirado" : isUsed ? "Usado" : "Ativo"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {activity.supplier_name && (
                            <span className="truncate">{activity.supplier_name}</span>
                          )}
                          <span>•</span>
                          <span>
                            {formatDistanceToNow(new Date(activity.created_at), { 
                              addSuffix: true,
                              locale: ptBR 
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                            {activity.short_code}
                          </code>
                          <span className="text-xs text-muted-foreground">
                            {activity.access_count} acessos
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-shrink-0"
                        onClick={() => window.open(`/s/${activity.short_code}`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            {metrics.created_today} tokens criados hoje
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={refetch}
          >
            Atualizar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
