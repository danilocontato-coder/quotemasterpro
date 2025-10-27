import React from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Brain, AlertCircle } from 'lucide-react';
import { usePredictiveInsights } from '@/hooks/usePredictiveInsights';
import { InsightCard } from '@/components/predictive/InsightCard';
import { PredictionCard } from '@/components/predictive/PredictionCard';
import { SummaryMetrics } from '@/components/predictive/SummaryMetrics';
import { Alert, AlertDescription } from '@/components/ui/alert';

const PredictiveDashboard = () => {
  const { data, isLoading, error, refetch } = usePredictiveInsights();

  // Estado vazio elegante (sem clientId ou role sem acesso)
  if (!data && !isLoading && !error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-primary rounded-lg">
            <Brain className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Dashboard Preditivo</h1>
            <p className="text-muted-foreground">
              Insights gerados por IA baseados em dados históricos
            </p>
          </div>
        </div>
        <Alert>
          <Brain className="h-4 w-4" />
          <AlertDescription>
            Os insights preditivos estão disponíveis apenas para usuários vinculados a clientes.
            Entre em contato com o administrador para vincular sua conta.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Erro ao carregar insights: {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary rounded-lg">
            <Brain className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Dashboard Preditivo</h1>
            <p className="text-muted-foreground">
              Insights gerados por IA baseados em dados históricos
            </p>
          </div>
        </div>
        <Button onClick={refetch} disabled={isLoading} variant="outline">
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar Análise
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      ) : data ? (
        <>
          {/* Summary Metrics */}
          <SummaryMetrics
            totalSavingsOpportunity={data.summary.totalSavingsOpportunity}
            riskScore={data.summary.riskScore}
            efficiencyScore={data.summary.efficiencyScore}
          />

          {/* Insights Section */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Insights Inteligentes</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {data.insights.map((insight, index) => (
                <InsightCard key={index} {...insight} />
              ))}
            </div>
          </div>

          {/* Predictions Section */}
          {data.predictions && data.predictions.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Predições de Demanda</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.predictions.map((prediction, index) => (
                  <PredictionCard key={index} {...prediction} />
                ))}
              </div>
            </div>
          )}

          {/* Generated timestamp */}
          <div className="text-center pt-6 border-t">
            <p className="text-sm text-muted-foreground">
              Última atualização: {new Date(data.generatedAt).toLocaleString('pt-BR')}
            </p>
          </div>
        </>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Nenhum insight disponível. Clique em "Atualizar Análise" para gerar.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default PredictiveDashboard;
