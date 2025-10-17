import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Trophy, 
  Plus, 
  Minus, 
  AlertTriangle, 
  Save,
  FileText,
  Bot,
  BarChart3,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface GamificationConfig {
  enabled: boolean;
  credits_per_rating: number;
  credits_per_detailed_rating: number;
  costs: {
    extra_quote: number;
    ai_analysis: number;
    advanced_report: number;
  };
  levels: {
    bronze: { min: number; max: number; multiplier: number; name: string };
    silver: { min: number; max: number; multiplier: number; name: string };
    gold: { min: number; max: number; multiplier: number; name: string };
    diamond: { min: number; multiplier: number; name: string };
  };
}

export function GamificationPanel() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<GamificationConfig>({
    enabled: true,
    credits_per_rating: 5,
    credits_per_detailed_rating: 10,
    costs: {
      extra_quote: 20,
      ai_analysis: 50,
      advanced_report: 30
    },
    levels: {
      bronze: { min: 0, max: 99, multiplier: 1.0, name: 'Bronze' },
      silver: { min: 100, max: 299, multiplier: 1.1, name: 'Prata' },
      gold: { min: 300, max: 599, multiplier: 1.25, name: 'Ouro' },
      diamond: { min: 600, multiplier: 1.5, name: 'Diamante' }
    }
  });
  const [stats, setStats] = useState({
    totalCredits: 0,
    ratingsWithCredits: 0,
    creditsSpent: 0,
    engagementRate: 0
  });
  const [manualEmail, setManualEmail] = useState('');
  const [manualAmount, setManualAmount] = useState('');

  // Carregar configuração atual
  useEffect(() => {
    loadConfig();
    loadStats();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'gamification_config')
        .single();

      if (error) throw error;
      if (data?.setting_value) {
        // Parse JSONB data from Supabase
        const configData = typeof data.setting_value === 'string' 
          ? JSON.parse(data.setting_value) 
          : data.setting_value;
        setConfig(configData as GamificationConfig);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    }
  };

  const loadStats = async () => {
    try {
      // Total de créditos distribuídos
      const { data: credits } = await supabase
        .from('user_credits')
        .select('total_earned')
        .throwOnError();

      const totalCredits = credits?.reduce((sum, c) => sum + c.total_earned, 0) || 0;

      // Avaliações com créditos (transações de rating_submitted)
      const { count: ratingsCount } = await supabase
        .from('credit_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('reason', 'rating_submitted');

      // Créditos gastos
      const { data: spentCredits } = await supabase
        .from('user_credits')
        .select('total_spent')
        .throwOnError();

      const creditsSpent = spentCredits?.reduce((sum, c) => sum + c.total_spent, 0) || 0;

      // Taxa de engajamento (% de usuários que têm créditos)
      const { count: usersWithCredits } = await supabase
        .from('user_credits')
        .select('*', { count: 'exact', head: true })
        .gt('total_earned', 0);

      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const engagementRate = totalUsers ? Math.round((usersWithCredits! / totalUsers!) * 100) : 0;

      setStats({
        totalCredits,
        ratingsWithCredits: ratingsCount || 0,
        creditsSpent,
        engagementRate
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleSaveConfig = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({
          setting_value: config as any, // Cast to any for JSONB compatibility
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'gamification_config');

      if (error) throw error;

      toast({
        title: "Configurações salvas",
        description: "Sistema de gamificação atualizado com sucesso.",
      });

      loadStats(); // Atualizar estatísticas
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualCredit = async (action: 'add' | 'remove') => {
    if (!manualEmail || !manualAmount) {
      toast({
        title: "Campos obrigatórios",
        description: "Informe o e-mail e a quantidade de créditos",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Buscar usuário por email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('email', manualEmail)
        .single();

      if (profileError || !profile) {
        throw new Error('Usuário não encontrado');
      }

      const amount = parseInt(manualAmount);
      const finalAmount = action === 'remove' ? -amount : amount;

      // Chamar função RPC para ajustar créditos
      const { error } = await supabase.rpc('admin_adjust_credits', {
        p_user_id: profile.id,
        p_amount: finalAmount,
        p_reason: `Ajuste manual pelo admin: ${action === 'add' ? 'adição' : 'remoção'}`
      });

      if (error) throw error;

      toast({
        title: "Créditos ajustados",
        description: `${amount} créditos ${action === 'add' ? 'adicionados' : 'removidos'} para ${profile.name}`,
      });

      setManualEmail('');
      setManualAmount('');
      loadStats();
    } catch (error: any) {
      toast({
        title: "Erro ao ajustar créditos",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetGamification = async () => {
    const confirmed = window.confirm(
      'ATENÇÃO: Isso irá deletar TODOS os créditos, conquistas e transações. Esta ação é IRREVERSÍVEL. Continuar?'
    );

    if (!confirmed) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('admin_reset_gamification');
      if (error) throw error;

      toast({
        title: "Sistema resetado",
        description: "Todos os dados de gamificação foram removidos.",
      });

      loadStats();
    } catch (error: any) {
      toast({
        title: "Erro ao resetar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuração Geral */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Sistema de Gamificação
          </CardTitle>
          <CardDescription>Controle completo do sistema de recompensas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Toggle Principal */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label className="text-base">Sistema Ativo</Label>
              <p className="text-sm text-muted-foreground">
                Habilitar sistema de créditos e conquistas
              </p>
            </div>
            <Switch 
              checked={config.enabled} 
              onCheckedChange={(checked) => setConfig({...config, enabled: checked})}
            />
          </div>

          {/* Configurações de Créditos */}
          <div className="space-y-4">
            <h3 className="font-semibold">Créditos por Ação</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Créditos por Avaliação</Label>
                <Input 
                  type="number" 
                  value={config.credits_per_rating}
                  onChange={(e) => setConfig({
                    ...config, 
                    credits_per_rating: parseInt(e.target.value) || 0
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Créditos ganhos ao avaliar um fornecedor
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Créditos por Avaliação Detalhada</Label>
                <Input 
                  type="number" 
                  value={config.credits_per_detailed_rating}
                  onChange={(e) => setConfig({
                    ...config, 
                    credits_per_detailed_rating: parseInt(e.target.value) || 0
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Avaliações com +50 caracteres de comentário
                </p>
              </div>
            </div>
          </div>

          <Button onClick={handleSaveConfig} disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </CardContent>
      </Card>

      {/* Conversão de Créditos */}
      <Card>
        <CardHeader>
          <CardTitle>Conversão de Créditos</CardTitle>
          <CardDescription>Defina quanto custam os recursos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cotação Extra */}
          <div className="flex items-center justify-between p-3 border rounded">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium">Cotação Extra</p>
                <p className="text-sm text-muted-foreground">
                  +1 cotação além do limite do plano
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input 
                type="number" 
                value={config.costs.extra_quote}
                onChange={(e) => setConfig({
                  ...config,
                  costs: { ...config.costs, extra_quote: parseInt(e.target.value) || 0 }
                })}
                className="w-20" 
              />
              <span className="text-sm text-muted-foreground">créditos</span>
            </div>
          </div>

          {/* Análise IA Premium */}
          <div className="flex items-center justify-between p-3 border rounded">
            <div className="flex items-center gap-3">
              <Bot className="h-5 w-5 text-purple-500" />
              <div>
                <p className="font-medium">Análise IA Premium</p>
                <p className="text-sm text-muted-foreground">
                  Análise detalhada com sugestões
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input 
                type="number" 
                value={config.costs.ai_analysis}
                onChange={(e) => setConfig({
                  ...config,
                  costs: { ...config.costs, ai_analysis: parseInt(e.target.value) || 0 }
                })}
                className="w-20" 
              />
              <span className="text-sm text-muted-foreground">créditos</span>
            </div>
          </div>

          {/* Relatório Avançado */}
          <div className="flex items-center justify-between p-3 border rounded">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Relatório Avançado</p>
                <p className="text-sm text-muted-foreground">
                  Exportação com insights detalhados
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input 
                type="number" 
                value={config.costs.advanced_report}
                onChange={(e) => setConfig({
                  ...config,
                  costs: { ...config.costs, advanced_report: parseInt(e.target.value) || 0 }
                })}
                className="w-20" 
              />
              <span className="text-sm text-muted-foreground">créditos</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sistema de Níveis */}
      <Card>
        <CardHeader>
          <CardTitle>Sistema de Níveis</CardTitle>
          <CardDescription>Configurar progressão de usuários</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Bronze */}
            <div className="p-4 border border-orange-300 rounded-lg bg-orange-50 dark:bg-orange-950">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-orange-500">Bronze</Badge>
                  <span className="text-sm">0-99 créditos ganhos</span>
                </div>
              </div>
              <div className="text-sm space-y-1">
                <p>• Multiplicador de limite: <strong>1.0x</strong></p>
                <p>• Benefício: Acesso básico ao sistema</p>
              </div>
            </div>

            {/* Prata */}
            <div className="p-4 border border-gray-400 rounded-lg bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-gray-500">Prata</Badge>
                  <span className="text-sm">100-299 créditos</span>
                </div>
              </div>
              <div className="text-sm space-y-1">
                <p>• Multiplicador de limite: <strong>1.1x</strong> (+10%)</p>
                <p>• Benefício: +10% nas cotações mensais</p>
              </div>
            </div>

            {/* Ouro */}
            <div className="p-4 border border-yellow-400 rounded-lg bg-yellow-50 dark:bg-yellow-950">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-yellow-500">Ouro</Badge>
                  <span className="text-sm">300-599 créditos</span>
                </div>
              </div>
              <div className="text-sm space-y-1">
                <p>• Multiplicador de limite: <strong>1.25x</strong> (+25%)</p>
                <p>• Benefício: +25% cotações + suporte prioritário</p>
              </div>
            </div>

            {/* Diamante */}
            <div className="p-4 border border-blue-400 rounded-lg bg-blue-50 dark:bg-blue-950">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-500">Diamante</Badge>
                  <span className="text-sm">600+ créditos</span>
                </div>
              </div>
              <div className="text-sm space-y-1">
                <p>• Multiplicador de limite: <strong>1.5x</strong> (+50%)</p>
                <p>• Benefício: +50% cotações + relatórios ilimitados</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <Card>
        <CardHeader>
          <CardTitle>Estatísticas do Sistema</CardTitle>
          <CardDescription>Métricas de engajamento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded">
              <p className="text-2xl font-bold">{stats.totalCredits}</p>
              <p className="text-sm text-muted-foreground">Créditos Distribuídos</p>
            </div>
            <div className="text-center p-4 border rounded">
              <p className="text-2xl font-bold">{stats.ratingsWithCredits}</p>
              <p className="text-sm text-muted-foreground">Avaliações com Créditos</p>
            </div>
            <div className="text-center p-4 border rounded">
              <p className="text-2xl font-bold">{stats.creditsSpent}</p>
              <p className="text-sm text-muted-foreground">Créditos Usados</p>
            </div>
            <div className="text-center p-4 border rounded">
              <p className="text-2xl font-bold">{stats.engagementRate}%</p>
              <p className="text-sm text-muted-foreground">Taxa de Engajamento</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gerenciamento Manual */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Manuais</CardTitle>
          <CardDescription>Gerenciar créditos e conquistas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Adicionar/Remover Créditos */}
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label>E-mail do Usuário</Label>
              <Input 
                placeholder="usuario@exemplo.com"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
              />
            </div>
            <div className="w-32 space-y-2">
              <Label>Créditos</Label>
              <Input 
                type="number" 
                placeholder="50"
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
              />
            </div>
            <Button 
              variant="outline"
              onClick={() => handleManualCredit('add')}
              disabled={isLoading}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
            <Button 
              variant="destructive"
              onClick={() => handleManualCredit('remove')}
              disabled={isLoading}
            >
              <Minus className="h-4 w-4 mr-2" />
              Remover
            </Button>
          </div>

          <Separator />

          {/* Resetar Sistema */}
          <div className="flex items-center justify-between p-4 border border-red-200 rounded bg-red-50 dark:bg-red-950">
            <div>
              <p className="font-medium text-red-900 dark:text-red-100">Resetar Gamificação</p>
              <p className="text-sm text-red-700 dark:text-red-300">
                Remove TODOS os créditos e conquistas. Ação irreversível!
              </p>
            </div>
            <Button 
              variant="destructive"
              onClick={handleResetGamification}
              disabled={isLoading}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Resetar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
