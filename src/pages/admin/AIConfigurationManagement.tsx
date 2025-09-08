import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAIConfiguration } from '@/hooks/useAIConfiguration';
import { Bot, Settings, MessageSquare, TrendingUp, Shield, Database, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AIConfigurationManagement() {
  const { toast } = useToast();
  const {
    settings,
    prompts,
    trainingData,
    isLoading,
    updateSettings,
    createPrompt,
    updatePrompt,
    addTrainingData
  } = useAIConfiguration();

  const [activeSettings, setActiveSettings] = useState({
    enabled: true,
    autoAnalysis: true,
    autoNegotiation: false,
    maxDiscountPercent: 15,
    minNegotiationAmount: 1000,
    aggressiveness: 'moderate',
    negotiationProvider: 'openai',
    marketAnalysisProvider: 'perplexity',
    openaiModel: 'gpt-5-2025-08-07'
  });
  const [analysisPrompt, setAnalysisPrompt] = useState('');
  const [negotiationPrompt, setNegotiationPrompt] = useState('');

  // Carregar configurações do Supabase quando disponível
  React.useEffect(() => {
    if (settings.length > 0) {
      const generalConfig = settings.find(s => s.setting_key === 'general_config');
      if (generalConfig && generalConfig.setting_value) {
        setActiveSettings(generalConfig.setting_value);
      }
    }
  }, [settings]);

  // Carregar prompts do Supabase quando disponível
  React.useEffect(() => {
    if (prompts.length > 0) {
      const ap = prompts.find(p => p.prompt_type === 'analysis');
      const np = prompts.find(p => p.prompt_type === 'negotiation');
      setAnalysisPrompt(ap?.prompt_content || '');
      setNegotiationPrompt(np?.prompt_content || '');
    }
  }, [prompts]);

  const handleSaveSettings = async () => {
    try {
      await updateSettings('general', activeSettings);
      toast({
        title: 'Configurações salvas',
        description: 'As configurações da IA foram atualizadas com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar configurações.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bot className="h-8 w-8 text-primary" />
            Configuração do Negociador IA
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure parâmetros, prompts e treinamento do sistema de negociação automatizada
          </p>
        </div>
        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
          IA Ativa
        </Badge>
      </div>

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
          <TabsTrigger value="prompts" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Prompts
          </TabsTrigger>
          <TabsTrigger value="training" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Treinamento
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Configurações Gerais */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Configurações de IA */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Configurações de IA
                </CardTitle>
                <CardDescription>
                  Configure qual IA usar para cada funcionalidade
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Negociação */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">IA para Negociação</Label>
                  <Select
                    value={activeSettings.negotiationProvider || 'openai'}
                    onValueChange={(value) => 
                      setActiveSettings(prev => ({ ...prev, negotiationProvider: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4" />
                          OpenAI (Recomendado para conversação)
                        </div>
                      </SelectItem>
                      <SelectItem value="perplexity">
                        <div className="flex items-center gap-2">
                          <Search className="h-4 w-4" />
                          Perplexity (Melhor para análise de mercado)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    OpenAI é melhor para conversação e estratégias. Perplexity é melhor para análise de mercado em tempo real.
                  </p>
                </div>

                {/* Análise de Mercado */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">IA para Análise de Mercado</Label>
                  <Select
                    value={activeSettings.marketAnalysisProvider || 'perplexity'}
                    onValueChange={(value) => 
                      setActiveSettings(prev => ({ ...prev, marketAnalysisProvider: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="perplexity">
                        <div className="flex items-center gap-2">
                          <Search className="h-4 w-4" />
                          Perplexity (Recomendado - dados atualizados)
                        </div>
                      </SelectItem>
                      <SelectItem value="openai">
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4" />
                          OpenAI
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Perplexity tem acesso a dados de mercado atualizados e é melhor para análise de preços.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Modelo OpenAI</Label>
                  <Select
                    value={activeSettings.openaiModel || 'gpt-5-2025-08-07'}
                    onValueChange={(value) => 
                      setActiveSettings(prev => ({ ...prev, openaiModel: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-5-2025-08-07">GPT-5 (Recomendado)</SelectItem>
                      <SelectItem value="gpt-4.1-2025-04-14">GPT-4.1</SelectItem>
                      <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                      <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Configurações Básicas */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Sistema de IA Habilitado</Label>
                    <p className="text-sm text-muted-foreground">Ativar/desativar negociações automáticas</p>
                  </div>
                  <Switch 
                    checked={activeSettings.enabled}
                    onCheckedChange={(checked) => 
                      setActiveSettings(prev => ({ ...prev, enabled: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Análise Automática</Label>
                    <p className="text-sm text-muted-foreground">Analisar cotações automaticamente</p>
                  </div>
                  <Switch 
                    checked={activeSettings.autoAnalysis}
                    onCheckedChange={(checked) => 
                      setActiveSettings(prev => ({ ...prev, autoAnalysis: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Negociação Automática</Label>
                    <p className="text-sm text-muted-foreground">Negociar sem aprovação prévia</p>
                  </div>
                  <Switch 
                    checked={activeSettings.autoNegotiation}
                    onCheckedChange={(checked) => 
                      setActiveSettings(prev => ({ ...prev, autoNegotiation: checked }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Parâmetros de Negociação */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Parâmetros de Negociação
                </CardTitle>
                <CardDescription>
                  Limites e estratégias da IA
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="maxDiscount">Desconto Máximo (%)</Label>
                  <Input
                    id="maxDiscount"
                    type="number"
                    min="1"
                    max="50"
                    value={activeSettings.maxDiscountPercent}
                    onChange={(e) => 
                      setActiveSettings(prev => ({ 
                        ...prev, 
                        maxDiscountPercent: parseInt(e.target.value) || 15 
                      }))
                    }
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Máximo desconto que a IA pode solicitar
                  </p>
                </div>

                <div>
                  <Label htmlFor="minAmount">Valor Mínimo para Negociação (R$)</Label>
                  <Input
                    id="minAmount"
                    type="number"
                    min="0"
                    value={activeSettings.minNegotiationAmount}
                    onChange={(e) => 
                      setActiveSettings(prev => ({ 
                        ...prev, 
                        minNegotiationAmount: parseInt(e.target.value) || 1000 
                      }))
                    }
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Valor mínimo para ativar negociação automática
                  </p>
                </div>

                <div>
                  <Label htmlFor="aggressiveness">Estilo de Negociação</Label>
                  <select
                    id="aggressiveness"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={activeSettings.aggressiveness}
                    onChange={(e) => 
                      setActiveSettings(prev => ({ ...prev, aggressiveness: e.target.value }))
                    }
                  >
                    <option value="conservative">Conservadora</option>
                    <option value="moderate">Moderada</option>
                    <option value="aggressive">Agressiva</option>
                  </select>
                  <p className="text-sm text-muted-foreground mt-1">
                    Define o tom e abordagem da IA
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveSettings} className="min-w-32">
              Salvar Configurações
            </Button>
          </div>
        </TabsContent>

        {/* Prompts da IA */}
        <TabsContent value="prompts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Prompts do Sistema</CardTitle>
              <CardDescription>
                Configure as instruções e prompts utilizados pela IA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="analysisPrompt">Prompt de Análise</Label>
                <Textarea
                  id="analysisPrompt"
                  placeholder="Instrução para análise de cotações..."
                  className="min-h-32"
                  value={analysisPrompt}
                  onChange={(e) => setAnalysisPrompt(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="negotiationPrompt">Prompt de Negociação</Label>
                <Textarea
                  id="negotiationPrompt"
                  placeholder="Instrução para negociação..."
                  className="min-h-32"
                  value={negotiationPrompt}
                  onChange={(e) => setNegotiationPrompt(e.target.value)}
                />
              </div>

              <Button onClick={async () => {
                try {
                  // Atualizar ou criar prompts
                  const analysis = prompts.find(p => p.prompt_type === 'analysis');
                  const negotiation = prompts.find(p => p.prompt_type === 'negotiation');
                  if (analysis) await updatePrompt(analysis.id, { prompt_content: analysisPrompt });
                  else await createPrompt({ prompt_type: 'analysis', prompt_name: 'Análise de Cotações', prompt_content: analysisPrompt, is_default: true, active: true });
                  if (negotiation) await updatePrompt(negotiation.id, { prompt_content: negotiationPrompt });
                  else await createPrompt({ prompt_type: 'negotiation', prompt_name: 'Negociação Comercial', prompt_content: negotiationPrompt, is_default: true, active: true });
                  toast({ title: 'Prompts salvos', description: 'Prompts atualizados com sucesso.' });
                } catch (e) {
                  toast({ title: 'Erro ao salvar', description: 'Não foi possível salvar os prompts.', variant: 'destructive' });
                }
              }}>Salvar Prompts</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dados de Treinamento */}
        <TabsContent value="training" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados de Treinamento</CardTitle>
              <CardDescription>
                Exemplos e casos de sucesso para melhorar a IA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Dados de Treinamento</h3>
                <p className="text-muted-foreground mb-4">
                  Esta seção permitirá adicionar exemplos de negociações bem-sucedidas
                </p>
                <Button disabled>
                  Em Desenvolvimento
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Negociações Hoje</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">23</div>
                <p className="text-xs text-muted-foreground">+12% vs ontem</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">87%</div>
                <p className="text-xs text-muted-foreground">+5% vs mês anterior</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Economia Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ 45.2k</div>
                <p className="text-xs text-muted-foreground">Este mês</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Relatórios Detalhados</CardTitle>
              <CardDescription>
                Analytics completas das negociações da IA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Analytics Avançadas</h3>
                <p className="text-muted-foreground mb-4">
                  Relatórios detalhados e insights sobre performance da IA
                </p>
                <Button disabled>
                  Em Desenvolvimento
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}