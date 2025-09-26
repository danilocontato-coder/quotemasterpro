import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, AlertCircle, Save } from 'lucide-react';

export const AIQuoteFeatureToggle = () => {
  const { toast } = useToast();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    checkFeatureStatus();
    checkApiKey();
  }, []);

  const checkFeatureStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'ai_quote_generation_enabled')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking AI quote feature status:', error);
        return;
      }

      if (data?.setting_value) {
        const settingValue = data.setting_value;
        let enabled = false;
        
        if (typeof settingValue === 'boolean') {
          enabled = settingValue;
        } else if (typeof settingValue === 'string') {
          enabled = settingValue === 'true';
        } else if (settingValue && typeof settingValue === 'object' && 'value' in settingValue) {
          enabled = settingValue.value === true || settingValue.value === 'true';
        }
        
        setIsEnabled(enabled);
      }
    } catch (error) {
      console.error('Error checking AI quote feature:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkApiKey = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_negotiation_settings')
        .select('setting_value')
        .eq('setting_key', 'openai_api_key')
        .eq('active', true)
        .single();

      setHasApiKey(!!data?.setting_value);
    } catch (error) {
      console.error('Error checking API key:', error);
      setHasApiKey(false);
    }
  };

  const handleToggle = async (enabled: boolean) => {
    if (enabled && !hasApiKey) {
      toast({
        title: 'API Key Necessária',
        description: 'Configure a chave da API do OpenAI primeiro nas configurações de IA.',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'ai_quote_generation_enabled',
          setting_value: enabled,
          description: 'Habilita ou desabilita a funcionalidade de criação de cotações com IA'
        });

      if (error) throw error;

      setIsEnabled(enabled);
      toast({
        title: enabled ? 'Funcionalidade Ativada' : 'Funcionalidade Desativada',
        description: `A criação de cotações com IA foi ${enabled ? 'ativada' : 'desativada'} com sucesso.`,
      });
    } catch (error) {
      console.error('Error updating AI quote feature:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a configuração.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-8 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Criação de Cotações com IA
        </CardTitle>
        <CardDescription>
          Permite que usuários gerem cotações automaticamente usando inteligência artificial
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasApiKey && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Configure a chave da API do OpenAI nas configurações de IA antes de ativar esta funcionalidade.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="ai-feature-toggle" className="text-base">
              Funcionalidade Ativa
            </Label>
            <div className="text-sm text-muted-foreground">
              {isEnabled ? 'Usuários podem gerar cotações com IA' : 'Funcionalidade desabilitada'}
            </div>
          </div>
          <Switch
            id="ai-feature-toggle"
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={isSaving || (!hasApiKey && !isEnabled)}
          />
        </div>

        <div className="pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            <p><strong>Como funciona:</strong></p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Usuários descrevem suas necessidades</li>
              <li>A IA gera uma cotação estruturada automaticamente</li>
              <li>Os dados são pré-preenchidos no formulário de criação</li>
              <li>Funcionalidade pode ser desativada a qualquer momento</li>
            </ul>
          </div>
        </div>

        {hasApiKey && (
          <div className="flex items-center gap-2 text-sm">
            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
            <span className="text-muted-foreground">API do OpenAI configurada</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};