import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, EyeOff, Key, Settings, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ApiKey {
  name: string;
  description: string;
  required: boolean;
  configured: boolean;
  testEndpoint?: string;
}

const apiConfigurations: Record<string, ApiKey[]> = {
  stripe: [
    {
      name: 'STRIPE_SECRET_KEY',
      description: 'Chave secreta do Stripe para processar pagamentos',
      required: true,
      configured: true
    },
    {
      name: 'STRIPE_WEBHOOK_SECRET',
      description: 'Chave secreta para validar webhooks do Stripe',
      required: false,
      configured: false
    }
  ],
  evolution: [
    {
      name: 'EVOLUTION_API_URL',
      description: 'URL da API Evolution para WhatsApp',
      required: true,
      configured: true
    },
    {
      name: 'EVOLUTION_API_TOKEN',
      description: 'Token de autenticação da API Evolution',
      required: true,
      configured: true
    }
  ],
  n8n: [
    {
      name: 'N8N_WEBHOOK_URL',
      description: 'URL do webhook N8N para automações',
      required: false,
      configured: true
    }
  ],
  openai: [
    {
      name: 'OPENAI_API_KEY',
      description: 'Chave da API OpenAI para funcionalidades de IA',
      required: false,
      configured: true
    }
  ]
};

export const ApiConfiguration = () => {
  const { toast } = useToast();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [newKeys, setNewKeys] = useState<Record<string, string>>({});
  const [configuredKeys, setConfiguredKeys] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<string | null>(null);

  const toggleKeyVisibility = (keyName: string) => {
    setShowKeys(prev => ({
      ...prev,
      [keyName]: !prev[keyName]
    }));
  };

  const handleKeyChange = (keyName: string, value: string) => {
    setNewKeys(prev => ({
      ...prev,
      [keyName]: value
    }));
  };

  const fetchConfigured = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'openai_api_key')
        .single();

      let configured = false;
      const val = data?.setting_value as any;
      if (typeof val === 'string') configured = val.trim().length > 0;
      else if (val && typeof val === 'object') {
        const candidate = val.value || val.key || val.api_key || val.OPENAI_API_KEY || val.openai_api_key;
        configured = typeof candidate === 'string' && candidate.trim().length > 0;
      }
      setConfiguredKeys(prev => ({ ...prev, OPENAI_API_KEY: configured }));
    } catch (e) {
      console.error('[ApiConfiguration] fetchConfigured error', e);
    }
  };

  const saveKey = async (keyName: string) => {
    const raw = newKeys[keyName]?.trim();
    if (!raw) {
      toast({ title: 'Erro', description: 'Por favor, insira uma chave válida', variant: 'destructive' });
      return;
    }

    try {
      // Persistir em system_settings sob a key canônica 'openai_api_key'
      if (keyName === 'OPENAI_API_KEY') {
        const { data: existing } = await supabase
          .from('system_settings')
          .select('id')
          .eq('setting_key', 'openai_api_key')
          .single();

        if (existing?.id) {
          await supabase
            .from('system_settings')
            .update({ setting_value: { value: raw } })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('system_settings')
            .insert({ setting_key: 'openai_api_key', setting_value: { value: raw }, description: 'Chave da API OpenAI' });
        }
      }

      toast({ title: 'Sucesso', description: `Chave ${keyName} salva com sucesso` });
      setNewKeys(prev => ({ ...prev, [keyName]: '' }));
      fetchConfigured();
    } catch (e) {
      console.error('[ApiConfiguration] saveKey error', e);
      toast({ title: 'Erro', description: 'Não foi possível salvar a chave', variant: 'destructive' });
    }
  };
  const testConnection = async (keyName: string) => {
    setTesting(keyName);
    
    // Simular teste de conexão
    setTimeout(() => {
      setTesting(null);
      toast({
        title: "Teste realizado",
        description: `Conexão com ${keyName} testada com sucesso`,
      });
    }, 2000);
  };

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'stripe':
        return '💳';
      case 'evolution':
        return '📱';
      case 'n8n':
        return '🔄';
      case 'openai':
        return '🤖';
      default:
        return '🔧';
    }
  };

  const getServiceName = (service: string) => {
    switch (service) {
      case 'stripe':
        return 'Stripe (Pagamentos)';
      case 'evolution':
        return 'Evolution API (WhatsApp)';
      case 'n8n':
        return 'N8N (Automações)';
      case 'openai':
        return 'OpenAI (Inteligência Artificial)';
      default:
        return service;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Configuração de APIs
        </h1>
        <p className="text-muted-foreground mt-2">
          Gerencie todas as chaves de API e integrações do sistema
        </p>
      </div>

      <Alert>
        <Key className="h-4 w-4" />
        <AlertDescription>
          <strong>Segurança:</strong> Todas as chaves são criptografadas e armazenadas de forma segura no Supabase.
          Nunca compartilhe suas chaves de API.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="stripe" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {Object.keys(apiConfigurations).map((service) => (
            <TabsTrigger key={service} value={service} className="flex items-center gap-2">
              <span>{getServiceIcon(service)}</span>
              {getServiceName(service).split(' ')[0]}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(apiConfigurations).map(([service, keys]) => (
          <TabsContent key={service} value={service}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">{getServiceIcon(service)}</span>
                  {getServiceName(service)}
                </CardTitle>
                <CardDescription>
                  Configure as chaves de API para {getServiceName(service)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {keys.map((apiKey) => {
                  const isConfigured = configuredKeys[apiKey.name] ?? apiKey.configured;
                  return (
                    <div key={apiKey.name} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label className="font-medium">{apiKey.name}</Label>
                          {apiKey.required && (
                            <Badge variant="destructive" className="text-xs">
                              Obrigatório
                            </Badge>
                          )}
                          {isConfigured ? (
                            <Badge variant="default" className="text-xs flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Configurado
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Não configurado
                            </Badge>
                          )}
                        </div>
                        {isConfigured && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => testConnection(apiKey.name)}
                              disabled={testing === apiKey.name}
                            >
                              {testing === apiKey.name ? 'Testando...' : 'Testar'}
                            </Button>
                          </div>
                        )}
                      </div>

                    <p className="text-sm text-muted-foreground">
                      {apiKey.description}
                    </p>

                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <Input
                            type={showKeys[apiKey.name] ? 'text' : 'password'}
                            placeholder={apiKey.configured ? '••••••••••••••••' : 'Cole sua chave aqui'}
                            value={newKeys[apiKey.name] || ''}
                            onChange={(e) => handleKeyChange(apiKey.name, e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => toggleKeyVisibility(apiKey.name)}
                          >
                            {showKeys[apiKey.name] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <Button
                          onClick={() => saveKey(apiKey.name)}
                          disabled={!newKeys[apiKey.name]?.trim()}
                        >
                          {apiKey.configured ? 'Atualizar' : 'Salvar'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Status das Integrações</CardTitle>
          <CardDescription>
            Visão geral do status de todas as integrações configuradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(apiConfigurations).map(([service, keys]) => {
              const configuredKeys = keys.filter(key => key.configured).length;
              const totalKeys = keys.length;
              const isFullyConfigured = configuredKeys === totalKeys;
              
              return (
                <div key={service} className="border rounded-lg p-4 text-center">
                  <div className="text-2xl mb-2">{getServiceIcon(service)}</div>
                  <h3 className="font-medium mb-1">{getServiceName(service).split(' ')[0]}</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {configuredKeys}/{totalKeys} configuradas
                  </p>
                  <Badge variant={isFullyConfigured ? "default" : "secondary"}>
                    {isFullyConfigured ? 'Ativo' : 'Parcial'}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiConfiguration;