import { useAISettings } from '@/hooks/useAISettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Bot, Search, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function AIProviderSelector() {
  const { settings, isLoading, updateSettings } = useAISettings();

  if (isLoading) {
    return <div className="p-4">Carregando configurações...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuração de Provedores de IA
        </CardTitle>
        <CardDescription>
          Configure qual IA usar para negociação e análise de mercado
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status atual */}
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Bot className="h-3 w-3" />
              Negociação: {settings?.negotiation_provider === 'openai' ? 'OpenAI' : 'Perplexity'}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Search className="h-3 w-3" />
              Análise: {settings?.market_analysis_provider === 'perplexity' ? 'Perplexity' : 'OpenAI'}
            </Badge>
          </div>
        </div>

        {/* Configuração de Negociação */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">IA para Negociação</Label>
          <Select
            value={settings?.negotiation_provider || 'openai'}
            onValueChange={(value) => updateSettings({ negotiation_provider: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  <div>
                    <div className="font-medium">OpenAI</div>
                    <div className="text-xs text-muted-foreground">Melhor para conversação e estratégias</div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="perplexity">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  <div>
                    <div className="font-medium">Perplexity</div>
                    <div className="text-xs text-muted-foreground">Acesso a dados atualizados do mercado</div>
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Configuração de Análise de Mercado */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">IA para Análise de Mercado</Label>
          <Select
            value={settings?.market_analysis_provider || 'perplexity'}
            onValueChange={(value) => updateSettings({ market_analysis_provider: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="perplexity">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  <div>
                    <div className="font-medium">Perplexity (Recomendado)</div>
                    <div className="text-xs text-muted-foreground">Dados de mercado em tempo real</div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="openai">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  <div>
                    <div className="font-medium">OpenAI</div>
                    <div className="text-xs text-muted-foreground">Análise baseada em conhecimento estático</div>
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Modelo OpenAI */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Modelo OpenAI</Label>
          <Select
            value={settings?.openai_model || 'gpt-5-2025-08-07'}
            onValueChange={(value) => updateSettings({ openai_model: value })}
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

        {/* Recomendações */}
        <div className="space-y-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-900">💡 Recomendações</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>OpenAI</strong>: Excelente para conversação e estratégias de negociação</li>
            <li>• <strong>Perplexity</strong>: Melhor para análise de preços com dados atualizados</li>
            <li>• <strong>Abordagem híbrida</strong>: OpenAI para negociar + Perplexity para analisar mercado</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}