import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Globe, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export default function DomainSettings() {
  const [baseUrl, setBaseUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentSettings();
  }, []);

  const fetchCurrentSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'base_url')
        .single();

      if (error) {
        console.error('Erro ao buscar configurações:', error);
        // Se não encontrar, usar URL atual como padrão
        setBaseUrl(window.location.origin);
      } else {
        // Remover aspas do JSON se necessário
        const value = typeof data.setting_value === 'string' 
          ? data.setting_value.replace(/"/g, '') 
          : String(data.setting_value || '').replace(/"/g, '');
        setBaseUrl(value);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      setBaseUrl(window.location.origin);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!baseUrl) {
      toast({
        title: "Erro",
        description: "URL base é obrigatória",
        variant: "destructive"
      });
      return;
    }

    // Validar formato da URL
    try {
      new URL(baseUrl);
    } catch {
      toast({
        title: "Erro",
        description: "Formato de URL inválido",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'base_url',
          setting_value: JSON.stringify(baseUrl),
          description: 'Base URL da aplicação para geração de links'
        }, {
          onConflict: 'setting_key'
        });

      if (error) {
        console.error('Erro ao salvar configurações:', error);
        toast({
          title: "Erro",
          description: "Não foi possível salvar as configurações",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Sucesso",
          description: "Configurações salvas com sucesso",
        });
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: "Erro interno ao salvar configurações",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetToCurrentDomain = () => {
    setBaseUrl(window.location.origin);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Configurações de Domínio</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-1/4"></div>
              <div className="h-10 bg-muted rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configurações de Domínio</h1>
          <p className="text-muted-foreground">
            Configure o domínio base para geração de links para fornecedores
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            URL Base da Aplicação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="baseUrl">URL Base</Label>
            <Input
              id="baseUrl"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://seu-dominio.com"
              disabled={isSaving}
            />
            <p className="text-sm text-muted-foreground">
              Esta URL será usada para gerar links de acesso aos fornecedores
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <h4 className="font-medium">Importante</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Esta URL deve ser acessível publicamente</li>
                  <li>• Links já enviados continuarão usando a URL antiga</li>
                  <li>• Teste sempre após alterar para garantir funcionamento</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <h4 className="font-medium text-green-800">Como funciona</h4>
                <p className="text-sm text-green-700">
                  Os links gerados para fornecedores terão o formato: <br />
                  <code className="bg-green-100 px-1 rounded text-xs">
                    {baseUrl}/s/[código-curto]
                  </code>
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={saveSettings}
              disabled={isSaving}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
            
            <Button
              variant="outline"
              onClick={resetToCurrentDomain}
              disabled={isSaving}
            >
              Usar Domínio Atual
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}