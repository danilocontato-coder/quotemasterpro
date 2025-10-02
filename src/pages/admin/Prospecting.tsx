import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  Target, 
  Users, 
  Building2, 
  Zap,
  Brain,
  MapPin,
  BarChart3,
  Sparkles
} from 'lucide-react';
import { ProspectingMetrics } from '@/components/admin/prospecting/ProspectingMetrics';
import { MarketInsights } from '@/components/admin/prospecting/MarketInsights';
import { LeadGenerator } from '@/components/admin/prospecting/LeadGenerator';
import { LeadsPipeline } from '@/components/admin/prospecting/LeadsPipeline';

export default function Prospecting() {
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [marketInsights, setMarketInsights] = useState<any>(null);

  const handleAnalyzeMarket = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-market-analysis');
      
      if (error) throw error;
      
      if (data?.success) {
        setMarketInsights(data.insights);
        toast({
          title: '✅ Análise Concluída',
          description: `${data.insights?.recommended_actions?.length || 0} ações recomendadas identificadas`,
        });
      }
    } catch (error: any) {
      console.error('Erro na análise:', error);
      toast({
        title: '❌ Erro na Análise',
        description: error.message || 'Não foi possível analisar o mercado',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            Prospecção Inteligente
          </h1>
          <p className="text-muted-foreground mt-2">
            Use IA para identificar e conquistar novos clientes e fornecedores
          </p>
        </div>
        
        <Button 
          onClick={handleAnalyzeMarket}
          disabled={isAnalyzing}
          className="gap-2"
          size="lg"
        >
          {isAnalyzing ? (
            <>
              <Sparkles className="h-4 w-4 animate-pulse" />
              Analisando...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              Analisar Mercado com IA
            </>
          )}
        </Button>
      </div>

      {/* Métricas Principais */}
      <ProspectingMetrics />

      {/* Tabs de Navegação */}
      <Tabs defaultValue="insights" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
          <TabsTrigger value="insights" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="generate" className="gap-2">
            <Target className="h-4 w-4" />
            Gerar Leads
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Pipeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4">
          <MarketInsights insights={marketInsights} isLoading={isAnalyzing} />
        </TabsContent>

        <TabsContent value="generate" className="space-y-4">
          <LeadGenerator />
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-4">
          <LeadsPipeline />
        </TabsContent>
      </Tabs>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taxa de Conversão</p>
                <p className="text-2xl font-bold">18.5%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Leads Ativos</p>
                <p className="text-2xl font-bold">47</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Regiões Cobertas</p>
                <p className="text-2xl font-bold">12</p>
              </div>
              <MapPin className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">ROI Campanhas</p>
                <p className="text-2xl font-bold">4.2x</p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
