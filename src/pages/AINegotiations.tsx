import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAINegotiation } from '@/hooks/useAINegotiation';
import { AINegotiationCard } from '@/components/quotes/AINegotiationCard';
import { Brain, TrendingUp, DollarSign, MessageSquare } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function AINegotiations() {
  const { negotiations, isLoading } = useAINegotiation();

  // Estatísticas
  const stats = React.useMemo(() => {
    const totalNegotiations = negotiations.length;
    const completedNegotiations = negotiations.filter(n => n.status === 'completed' || n.status === 'approved').length;
    const totalSavings = negotiations.reduce((acc, n) => {
      const savings = n.negotiated_amount 
        ? n.original_amount - n.negotiated_amount
        : (n.ai_analysis?.potentialSavings || 0);
      return acc + savings;
    }, 0);
    const avgDiscount = negotiations.length > 0 
      ? negotiations.reduce((acc, n) => acc + (n.discount_percentage || 0), 0) / negotiations.length
      : 0;

    return {
      totalNegotiations,
      completedNegotiations,
      totalSavings,
      avgDiscount,
      successRate: totalNegotiations > 0 ? (completedNegotiations / totalNegotiations) * 100 : 0
    };
  }, [negotiations]);

  // Filtrar negociações por status
  const negotiationsByStatus = React.useMemo(() => {
    return {
      active: negotiations.filter(n => ['analyzing', 'negotiating'].includes(n.status)),
      pending: negotiations.filter(n => n.status === 'completed' && !n.human_approved),
      completed: negotiations.filter(n => ['approved', 'rejected'].includes(n.status)),
      all: negotiations
    };
  }, [negotiations]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <Brain className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Negociações IA</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Brain className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Negociações IA</h1>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Negociações</p>
                <p className="text-2xl font-bold">{stats.totalNegotiations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taxa de Sucesso</p>
                <p className="text-2xl font-bold text-green-600">{stats.successRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Economia Total</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.totalSavings)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Desconto Médio</p>
                <p className="text-2xl font-bold text-blue-600">{stats.avgDiscount.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Abas */}
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active" className="flex items-center gap-2">
            Ativas 
            {negotiationsByStatus.active.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {negotiationsByStatus.active.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            Aguardando Aprovação
            {negotiationsByStatus.pending.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {negotiationsByStatus.pending.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            Finalizadas
            {negotiationsByStatus.completed.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {negotiationsByStatus.completed.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">Todas</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {negotiationsByStatus.active.length > 0 ? (
            <div className="grid gap-4">
              {negotiationsByStatus.active.map((negotiation) => (
                <AINegotiationCard key={negotiation.id} negotiation={negotiation} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma negociação ativa</h3>
                <p className="text-muted-foreground">
                  As negociações aparecerão aqui quando as cotações receberem todas as propostas.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {negotiationsByStatus.pending.length > 0 ? (
            <div className="grid gap-4">
              {negotiationsByStatus.pending.map((negotiation) => (
                <AINegotiationCard key={negotiation.id} negotiation={negotiation} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma negociação pendente</h3>
                <p className="text-muted-foreground">
                  Negociações concluídas pela IA aparecerão aqui aguardando sua aprovação.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {negotiationsByStatus.completed.length > 0 ? (
            <div className="grid gap-4">
              {negotiationsByStatus.completed.map((negotiation) => (
                <AINegotiationCard key={negotiation.id} negotiation={negotiation} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma negociação finalizada</h3>
                <p className="text-muted-foreground">
                  Negociações aprovadas ou rejeitadas aparecerão aqui.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {negotiations.length > 0 ? (
            <div className="grid gap-4">
              {negotiations.map((negotiation) => (
                <AINegotiationCard key={negotiation.id} negotiation={negotiation} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma negociação encontrada</h3>
                <p className="text-muted-foreground">
                  Comece criando cotações para que a IA possa negociar automaticamente.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}