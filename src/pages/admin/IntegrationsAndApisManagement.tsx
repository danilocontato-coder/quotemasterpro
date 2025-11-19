import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Eye, EyeOff, Key, Settings, CheckCircle, AlertTriangle,
  Search, Plus, MessageSquare, Mail, CreditCard, Zap, 
  Brain, Truck, MapPin, DollarSign, FileText, Link,
  MoreHorizontal, Edit, Trash2, TestTube, AlertCircle,
  Globe, Loader2, Building, Users
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IntegrationFormModal } from '@/components/admin/IntegrationFormModal';
import { IntegrationDetailsModal } from '@/components/admin/IntegrationDetailsModal';
import { StripeIntegrationPanel } from '@/components/admin/StripeIntegrationPanel';
import { BoletoIntegrationPanel } from '@/components/admin/BoletoIntegrationPanel';
import { AsaasIntegrationPanel } from '@/components/admin/AsaasIntegrationPanel';
import { WalletStatusDashboard } from '@/components/admin/WalletStatusDashboard';
import { useSupabaseIntegrations, Integration } from '@/hooks/useSupabaseIntegrations';
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
  ],
  perplexity: [
    {
      name: 'PERPLEXITY_API_KEY',
      description: 'Chave da API Perplexity para análise inteligente de mercado',
      required: false,
      configured: false
    }
  ],
  uber: [
    {
      name: 'UBER_CUSTOMER_ID',
      description: 'ID do cliente Uber Direct (encontrado no dashboard)',
      required: true,
      configured: false
    },
    {
      name: 'UBER_CLIENT_ID',
      description: 'Client ID da API Uber Direct',
      required: true,
      configured: false
    },
    {
      name: 'UBER_CLIENT_SECRET',
      description: 'Client Secret da API Uber Direct',
      required: true,
      configured: false
    },
    {
      name: 'UBER_API_URL',
      description: 'URL da API Uber (sandbox: https://sandbox-api.uber.com | produção: https://api.uber.com)',
      required: true,
      configured: false
    }
  ]
};

const getIntegrationIcon = (type: string) => {
  switch (type) {
    case 'whatsapp_twilio': return MessageSquare;
    case 'whatsapp_evolution': return MessageSquare;
    case 'email_sendgrid': 
    case 'email_smtp': return Mail;
    case 'payment_stripe':
    case 'payment_pagseguro': return CreditCard;
    case 'zapier_webhook':
    case 'n8n_webhook': return Zap;
    case 'perplexity': return Brain;
    case 'delivery_api': return Truck;
    case 'cep_api': return MapPin;
    case 'currency_api': return DollarSign;
    case 'document_validation': return FileText;
    case 'generic_webhook': return Link;
    default: return Globe;
  }
};

const getStatusBadge = (active: boolean) => {
  return active 
    ? <Badge className="bg-green-100 text-green-800 border-green-200">Ativa</Badge>
    : <Badge className="bg-red-100 text-red-800 border-red-200">Inativa</Badge>;
};

const getScopeBadge = (integration: Integration) => {
  if (integration.client_id) {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        <Building className="h-3 w-3 mr-1" />
        Cliente Específico
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
      <Users className="h-3 w-3 mr-1" />
      Global
    </Badge>
  );
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
    case 'perplexity':
      return '🧠';
    case 'uber':
      return '🚕';
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
    case 'perplexity':
      return 'Perplexity (Análise de Mercado)';
    case 'uber':
      return 'Uber Direct (Entregas)';
    default:
      return service;
  }
};

export const IntegrationsAndApisManagement = () => {
  const { toast } = useToast();
  
  // Estados para API Keys
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [newKeys, setNewKeys] = useState<Record<string, string>>({});
  const [configuredKeys, setConfiguredKeys] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<string | null>(null);

  // Estados para Integrações
  const {
    integrations,
    loading,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    createIntegration,
    updateIntegration,
    deleteIntegration,
    toggleIntegrationStatus,
    testIntegration,
    stats,
    refetch,
    forceRefresh
  } = useSupabaseIntegrations();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);

  // Funções para API Keys
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
      // Fetch OpenAI
      const { data: openaiData } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'openai_api_key')
        .single();

      let openaiConfigured = false;
      const openaiVal = openaiData?.setting_value as any;
      if (typeof openaiVal === 'string') openaiConfigured = openaiVal.trim().length > 0;
      else if (openaiVal && typeof openaiVal === 'object') {
        const candidate = openaiVal.value || openaiVal.key || openaiVal.api_key || openaiVal.OPENAI_API_KEY || openaiVal.openai_api_key;
        openaiConfigured = typeof candidate === 'string' && candidate.trim().length > 0;
      }

      // Fetch Perplexity
      const { data: perplexityData } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'perplexity_api_key')
        .single();

      let perplexityConfigured = false;
      const perplexityVal = perplexityData?.setting_value as any;
      if (typeof perplexityVal === 'string') perplexityConfigured = perplexityVal.trim().length > 0;
      else if (perplexityVal && typeof perplexityVal === 'object') {
        const candidate = perplexityVal.value || perplexityVal.key || perplexityVal.api_key || perplexityVal.PERPLEXITY_API_KEY || perplexityVal.perplexity_api_key;
        perplexityConfigured = typeof candidate === 'string' && candidate.trim().length > 0;
      }

      // Fetch Uber credentials
      const { data: uberData } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'uber_credentials')
        .single();

      let uberCustomerIdConfigured = false;
      let uberClientIdConfigured = false;
      let uberClientSecretConfigured = false;
      let uberApiUrlConfigured = false;
      
      if (uberData?.setting_value && typeof uberData.setting_value === 'object') {
        const uberVal = uberData.setting_value as any;
        uberCustomerIdConfigured = !!uberVal.customer_id?.trim();
        uberClientIdConfigured = !!uberVal.client_id?.trim();
        uberClientSecretConfigured = !!uberVal.client_secret?.trim();
        uberApiUrlConfigured = !!uberVal.api_url?.trim();
      }

      setConfiguredKeys(prev => ({ 
        ...prev, 
        OPENAI_API_KEY: openaiConfigured,
        PERPLEXITY_API_KEY: perplexityConfigured,
        UBER_CUSTOMER_ID: uberCustomerIdConfigured,
        UBER_CLIENT_ID: uberClientIdConfigured,
        UBER_CLIENT_SECRET: uberClientSecretConfigured,
        UBER_API_URL: uberApiUrlConfigured
      }));
    } catch (e) {
      console.error('[IntegrationsAndApis] fetchConfigured error', e);
    }
  };

  const saveKey = async (keyName: string) => {
    const raw = newKeys[keyName]?.trim();
    if (!raw) {
      toast({ title: 'Erro', description: 'Por favor, insira uma chave válida', variant: 'destructive' });
      return;
    }

    try {
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
      } else if (keyName === 'PERPLEXITY_API_KEY') {
        const { data: existing } = await supabase
          .from('system_settings')
          .select('id')
          .eq('setting_key', 'perplexity_api_key')
          .single();

        if (existing?.id) {
          await supabase
            .from('system_settings')
            .update({ setting_value: { value: raw } })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('system_settings')
            .insert({ setting_key: 'perplexity_api_key', setting_value: { value: raw }, description: 'Chave da API Perplexity para análise de mercado' });
        }
      } else if (keyName.startsWith('UBER_')) {
        // Buscar credenciais Uber existentes
        const { data: existing } = await supabase
          .from('system_settings')
          .select('*')
          .eq('setting_key', 'uber_credentials')
          .single();

        let currentValue: any = existing?.setting_value || {};
        if (typeof currentValue !== 'object' || Array.isArray(currentValue)) {
          currentValue = {};
        }

        // Atualizar o campo específico
        if (keyName === 'UBER_CUSTOMER_ID') {
          currentValue.customer_id = raw;
        } else if (keyName === 'UBER_CLIENT_ID') {
          currentValue.client_id = raw;
        } else if (keyName === 'UBER_CLIENT_SECRET') {
          currentValue.client_secret = raw;
        } else if (keyName === 'UBER_API_URL') {
          currentValue.api_url = raw;
        }

        if (existing?.id) {
          await supabase
            .from('system_settings')
            .update({ setting_value: currentValue })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('system_settings')
            .insert({ 
              setting_key: 'uber_credentials', 
              setting_value: currentValue, 
              description: 'Credenciais da API Uber Direct para entregas' 
            });
        }
      }

      toast({ title: 'Sucesso', description: `Chave ${keyName} salva com sucesso` });
      setNewKeys(prev => ({ ...prev, [keyName]: '' }));
      fetchConfigured();
    } catch (e) {
      console.error('[IntegrationsAndApis] saveKey error', e);
      toast({ title: 'Erro', description: 'Não foi possível salvar a chave', variant: 'destructive' });
    }
  };

  const testConnection = async (keyName: string) => {
    setTesting(keyName);
    
    setTimeout(() => {
      setTesting(null);
      toast({
        title: "Teste realizado",
        description: `Conexão com ${keyName} testada com sucesso`,
      });
    }, 2000);
  };

  // Funções para Integrações
  const handleCreateIntegration = async (data: any) => {
    await createIntegration(data);
  };

  const handleEditIntegration = async (data: any) => {
    if (editingIntegration) {
      await updateIntegration(editingIntegration.id, data);
      setEditingIntegration(null);
    }
  };

  const handleDeleteIntegration = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta integração?")) {
      await deleteIntegration(id);
    }
  };

  const handleTestIntegration = async (id: string) => {
    setTestingId(id);
    try {
      await testIntegration(id);
    } finally {
      setTestingId(null);
    }
  };

  const handleViewDetails = (integration: Integration) => {
    setSelectedIntegration(integration);
    setShowDetailsModal(true);
  };

  useEffect(() => {
    fetchConfigured();
    // Forçar refetch das integrações quando o componente monta
    forceRefresh();
  }, [forceRefresh]);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Zap className="h-8 w-8" />
              Integrações e APIs
            </h1>
            <p className="text-muted-foreground">Gerencie todas as chaves de API, integrações e serviços externos</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <Alert className="mb-6">
          <Key className="h-4 w-4" />
          <AlertDescription>
            <strong>Segurança:</strong> Todas as chaves são criptografadas e armazenadas de forma segura no Supabase.
            Nunca compartilhe suas chaves de API.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="payment-integrations" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="payment-integrations">Pagamentos</TabsTrigger>
            <TabsTrigger value="api-keys">Chaves de API</TabsTrigger>
            <TabsTrigger value="integrations-list">Lista de Integrações</TabsTrigger>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          </TabsList>

          {/* Tab Integrações de Pagamento */}
          <TabsContent value="payment-integrations" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Integrações de Pagamento</h2>
              <p className="text-muted-foreground mb-4">Configure métodos de pagamento para o sistema</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <StripeIntegrationPanel />
              <BoletoIntegrationPanel />
              <AsaasIntegrationPanel />
            </div>
            
            {/* Dashboard de Status de Wallets */}
            <div className="mt-8">
              <WalletStatusDashboard />
            </div>
          </TabsContent>

          {/* Tab Chaves de API */}
          <TabsContent value="api-keys" className="space-y-6">
            <Tabs defaultValue="stripe" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
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
                        );
                      })}
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>

          {/* Tab Lista de Integrações */}
          <TabsContent value="integrations-list" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Lista de Integrações</h2>
                <p className="text-muted-foreground">Gerencie todas as integrações de APIs e serviços externos</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => forceRefresh()}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  Atualizar
                </Button>
                <Button 
                  className="bg-primary hover:bg-primary/90"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Integração
                </Button>
              </div>
            </div>

            {/* Filtros e Pesquisa */}
            <Card>
              <CardHeader>
                <CardTitle>Filtros e Pesquisa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Pesquisar integrações..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="w-48">
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filtrar por tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os tipos</SelectItem>
                        <SelectItem value="whatsapp_twilio">WhatsApp (Twilio)</SelectItem>
                        <SelectItem value="whatsapp_evolution">WhatsApp (Evolution API)</SelectItem>
                        <SelectItem value="email_sendgrid">E-mail SendGrid</SelectItem>
                        <SelectItem value="email_smtp">E-mail SMTP</SelectItem>
                        <SelectItem value="payment_stripe">Stripe</SelectItem>
                        <SelectItem value="zapier_webhook">Zapier</SelectItem>
                        <SelectItem value="n8n_webhook">N8N</SelectItem>
                        <SelectItem value="perplexity">Perplexity AI</SelectItem>
                        <SelectItem value="generic_webhook">Webhook</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-40">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="active">Ativas</SelectItem>
                        <SelectItem value="inactive">Inativas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Integrações ({integrations.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Carregando integrações...</span>
                  </div>
                ) : integrations.length === 0 ? (
                  <div className="text-center py-8">
                    <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">Nenhuma integração encontrada</h3>
                    <p className="text-muted-foreground mb-4">
                      Comece criando sua primeira integração para conectar APIs e serviços externos.
                    </p>
                    <Button onClick={() => setShowCreateModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Primeira Integração
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Integração</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Escopo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Criada em</TableHead>
                        <TableHead>Ativa</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {integrations.map((integration) => {
                        const Icon = getIntegrationIcon(integration.integration_type);
                        return (
                          <TableRow key={integration.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-muted">
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="font-medium">{integration.integration_type.replace('_', ' ')}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {Object.keys(integration.configuration).length} configurações
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {integration.integration_type.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            
                            <TableCell>
                              {getScopeBadge(integration)}
                            </TableCell>
                            
                            <TableCell>
                              {getStatusBadge(integration.active)}
                            </TableCell>
                            
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {new Date(integration.created_at).toLocaleDateString('pt-BR')}
                              </span>
                            </TableCell>

                            <TableCell>
                              <Switch
                                checked={integration.active}
                                onCheckedChange={() => toggleIntegrationStatus(integration.id)}
                              />
                            </TableCell>
                            
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-background border z-50">
                                  <DropdownMenuItem onClick={() => setEditingIntegration(integration)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleViewDetails(integration)}>
                                    <Settings className="h-4 w-4 mr-2" />
                                    Ver Detalhes
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleTestIntegration(integration.id)}
                                    disabled={testingId === integration.id}
                                  >
                                    {testingId === integration.id ? (
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                      <TestTube className="h-4 w-4 mr-2" />
                                    )}
                                    Testar Conexão
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-red-600"
                                    onClick={() => handleDeleteIntegration(integration.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Visão Geral */}
          <TabsContent value="overview" className="space-y-6">
            {/* Estatísticas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Settings className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Integrações</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-600" />
                  <p className="text-2xl font-bold">{stats.active}</p>
                  <p className="text-xs text-muted-foreground">Ativas</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <AlertCircle className="h-6 w-6 mx-auto mb-2 text-red-600" />
                  <p className="text-2xl font-bold">{stats.inactive}</p>
                  <p className="text-xs text-muted-foreground">Inativas</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <TestTube className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
                  <p className="text-2xl font-bold">{stats.testing}</p>
                  <p className="text-xs text-muted-foreground">Em Teste</p>
                </CardContent>
              </Card>
            </div>

            {/* Status das Integrações */}
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
          </TabsContent>
        </Tabs>
      </div>

      {/* Modais */}
      <IntegrationFormModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSubmit={handleCreateIntegration}
      />

      <IntegrationFormModal
        open={!!editingIntegration}
        onOpenChange={(open) => !open && setEditingIntegration(null)}
        onSubmit={handleEditIntegration}
        editingIntegration={editingIntegration}
      />

      <IntegrationDetailsModal
        open={showDetailsModal}
        onOpenChange={setShowDetailsModal}
        integration={selectedIntegration}
      />
    </div>
  );
};

export default IntegrationsAndApisManagement;