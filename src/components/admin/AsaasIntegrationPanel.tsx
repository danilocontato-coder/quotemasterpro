import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle, Settings, DollarSign, Eye, EyeOff, AlertTriangle, FileText, Calendar, Copy, Key, RefreshCw } from 'lucide-react';
import { useAsaasIntegration } from '@/hooks/useAsaasIntegration';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TestWebhookSimulator } from './TestWebhookSimulator';

export function AsaasIntegrationPanel() {
  const { settings, updateSettings, testConnection, generateWebhookToken, isLoading } = useAsaasIntegration();
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showWebhookToken, setShowWebhookToken] = useState(false);
  const [webhookToken, setWebhookToken] = useState('');
  const [asaasConfig, setAsaasConfig] = useState(settings?.asaas_config || {
    api_key_configured: false,
    platform_commission_percentage: 5.0,
    auto_release_days: 7,
    split_enabled: true,
    environment: 'sandbox' as 'sandbox' | 'production'
  });
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (settings?.asaas_config) {
      setAsaasConfig(settings.asaas_config);
      setWebhookToken(settings.asaas_config.webhook_token || '');
    }
  }, [settings]);

  const handleSaveConfig = async () => {
    // Validar se todos os fornecedores têm bank_data antes de ativar split
    if (!asaasConfig.split_enabled && apiKey === '' && asaasConfig.api_key_configured) {
      // Usuário está tentando ativar split
      const { data: suppliers, error } = await supabase
        .from('suppliers')
        .select('id, name, document_number, asaas_wallet_id, bank_data, status')
        .eq('status', 'active');

      if (error) {
        toast.error('Erro ao verificar fornecedores');
        return;
      }

      const suppliersWithoutBankData = (suppliers || []).filter(s => {
        const bankData = s.bank_data as any;
        return !bankData?.bank_code || !bankData?.account_number || !s.asaas_wallet_id;
      });

      if (suppliersWithoutBankData.length > 0) {
        toast.error(
          `Não é possível ativar split. ${suppliersWithoutBankData.length} fornecedor(es) sem dados bancários completos.`,
          {
            description: 'Configure os dados bancários de todos os fornecedores antes de ativar o split.',
            duration: 5000,
          }
        );
        return;
      }
    }
    
    if (apiKey && apiKey.trim()) {
      // Salvar a chave da API primeiro
      try {
        await updateSettings({
          asaas_api_key: apiKey.trim(),
          asaas_config: {
            ...asaasConfig,
            api_key_configured: true
          }
        });
        setApiKey('');
        toast.success('Configurações do Asaas salvas com sucesso');
      } catch (error) {
        console.error('Error saving Asaas config:', error);
        toast.error('Erro ao salvar configurações do Asaas');
      }
    } else {
      // Apenas atualizar as configurações
      try {
        await updateSettings({
          asaas_config: asaasConfig
        });
        toast.success('Configurações do Asaas atualizadas com sucesso');
      } catch (error) {
        console.error('Error updating Asaas config:', error);
        toast.error('Erro ao atualizar configurações do Asaas');
      }
    }
  };

  const handleTestConnection = async () => {
    if (!asaasConfig.api_key_configured && !apiKey) {
      toast.error('Configure a chave da API antes de testar');
      return;
    }

    setIsTestingConnection(true);
    try {
      const result = await testConnection();
      if (result.success) {
        toast.success('Conexão com Asaas testada com sucesso');
      } else {
        toast.error('Erro ao testar conexão. Verifique a chave da API.');
      }
    } catch (error) {
      console.error('Error testing Asaas connection:', error);
      toast.error('Erro ao testar conexão com Asaas');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleGenerateWebhookToken = async () => {
    const newToken = generateWebhookToken();
    try {
      await updateSettings({ asaas_webhook_token: newToken });
      setWebhookToken(newToken);
      toast.success("Token gerado! Configure-o no painel Asaas agora.");
    } catch (error) {
      toast.error("Erro ao gerar token");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const webhookUrl = `https://bpsqyaxdhqejozmlejcb.supabase.co/functions/v1/asaas-webhook`;

  const isConfigured = asaasConfig.api_key_configured;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            <div>
              <CardTitle>Asaas (Pagamentos com PIX/Boleto)</CardTitle>
              <CardDescription>
                Configure pagamentos com escrow e split automático
              </CardDescription>
            </div>
          </div>
          <Badge variant={isConfigured ? "default" : "secondary"}>
            {isConfigured ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Conectado
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3 mr-1" />
                Não Configurado
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="config" className="space-y-4">
          <TabsList>
            <TabsTrigger value="config">
              <Settings className="h-4 w-4 mr-2" />
              Configuração
            </TabsTrigger>
            <TabsTrigger value="webhook">
              <Key className="h-4 w-4 mr-2" />
              Webhook
            </TabsTrigger>
            <TabsTrigger value="advanced">
              <DollarSign className="h-4 w-4 mr-2" />
              Escrow & Split
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-4">
            {asaasConfig.environment === 'sandbox' && (
              <Alert className="bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                <AlertTitle>Modo Sandbox Ativo</AlertTitle>
                <AlertDescription>
                  Você está usando o ambiente de testes. Nenhum pagamento real será processado.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="asaas-environment">Ambiente da API</Label>
              <Select 
                value={asaasConfig.environment || 'sandbox'} 
                onValueChange={(val) => setAsaasConfig({...asaasConfig, environment: val as 'sandbox' | 'production'})}
              >
                <SelectTrigger id="asaas-environment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">🟡 Sandbox (Testes)</SelectItem>
                  <SelectItem value="production">🟢 Produção</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Use Sandbox para testes e Produção para pagamentos reais
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="asaas-api-key">Chave da API Asaas</Label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    id="asaas-api-key"
                    type={showApiKey ? 'text' : 'password'}
                    placeholder={isConfigured ? '••••••••••••••••' : 'Cole sua chave da API aqui'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowApiKey(!showApiKey)}
                  type="button"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Obtenha sua chave em: <a 
                  href={asaasConfig.environment === 'sandbox' 
                    ? "https://sandbox.asaas.com/api/v3/apiKey" 
                    : "https://www.asaas.com/api/v3/apiKey"
                  } 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-primary hover:underline"
                >
                  {asaasConfig.environment === 'sandbox' ? 'Sandbox' : 'Produção'} API Key
                </a>
              </p>
            </div>

            <div className="flex gap-4">
              <Button onClick={handleTestConnection} disabled={isTestingConnection || (!isConfigured && !apiKey)}>
                {isTestingConnection ? 'Testando...' : 'Testar Conexão'}
              </Button>
              <Button onClick={handleSaveConfig} disabled={isLoading}>
                {isLoading ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </div>

            {isConfigured && (
              <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm font-medium">Status Atual:</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Ambiente: <span className="font-semibold">{asaasConfig.environment === 'sandbox' ? '🟡 Sandbox' : '🟢 Produção'}</span></div>
                  <div>Comissão: <span className="font-semibold">{asaasConfig.platform_commission_percentage}%</span></div>
                  <div>Liberação: <span className="font-semibold">{asaasConfig.auto_release_days} dias</span></div>
                  <div>
                    Split Automático: <span className="font-semibold">{asaasConfig.split_enabled ? '✓ Ativado' : '✗ Desativado'}</span>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="webhook" className="space-y-4">
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <h3 className="text-sm font-medium mb-2">URL do Webhook</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Configure esta URL no painel do Asaas para receber notificações de pagamento.
                </p>
                <div className="flex gap-2">
                  <Input
                    value={webhookUrl}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(webhookUrl, "URL")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <h3 className="text-sm font-medium mb-2">Token de Autenticação</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Use este token no header <code className="bg-muted px-1 py-0.5 rounded">asaas-access-token</code> ao configurar o webhook.
                </p>
                
                {webhookToken ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        type={showWebhookToken ? "text" : "password"}
                        value={webhookToken}
                        readOnly
                        className="font-mono text-xs"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowWebhookToken(!showWebhookToken)}
                      >
                        {showWebhookToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(webhookToken, "Token")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleGenerateWebhookToken}
                      className="w-full"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Gerar Novo Token
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleGenerateWebhookToken}
                    className="w-full"
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Gerar Token de Webhook
                  </Button>
                )}
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  Instruções de Configuração
                </h3>
                <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Acesse o painel do Asaas ({asaasConfig.environment === 'sandbox' ? 'Sandbox' : 'Produção'})</li>
                  <li>Vá em <strong>Integrações → Webhooks</strong></li>
                  <li>Clique em <strong>Novo Webhook</strong></li>
                  <li>Cole a URL do webhook acima</li>
                  <li>Adicione um header customizado:
                    <div className="ml-6 mt-1 bg-muted p-2 rounded font-mono text-xs">
                      Nome: asaas-access-token<br />
                      Valor: {webhookToken || '[gere o token primeiro]'}
                    </div>
                  </li>
                  <li>Marque os seguintes eventos:
                    <ul className="ml-6 mt-1 space-y-1">
                      <li>✓ PAYMENT_RECEIVED</li>
                      <li>✓ PAYMENT_CONFIRMED</li>
                      <li>✓ PAYMENT_OVERDUE</li>
                    </ul>
                  </li>
                  <li>Salve a configuração</li>
                </ol>
              </div>

              {asaasConfig.environment === 'sandbox' && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Você está em modo <strong>Sandbox</strong>. Configure o webhook no painel sandbox do Asaas.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="commission-percentage">Comissão da Plataforma (%)</Label>
                <Input
                  id="commission-percentage"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={asaasConfig.platform_commission_percentage}
                  onChange={(e) => setAsaasConfig(prev => ({ ...prev, platform_commission_percentage: parseFloat(e.target.value) || 0 }))}
                />
                <p className="text-sm text-muted-foreground">
                  Percentual que a plataforma receberá de cada pagamento
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="auto-release-days">Dias para Liberação Automática</Label>
                <Input
                  id="auto-release-days"
                  type="number"
                  min="1"
                  max="90"
                  value={asaasConfig.auto_release_days}
                  onChange={(e) => setAsaasConfig(prev => ({ ...prev, auto_release_days: parseInt(e.target.value) || 7 }))}
                />
                <p className="text-sm text-muted-foreground">
                  Após quantos dias o valor será liberado automaticamente para o fornecedor
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="split-enabled" className="text-base">Habilitar Split Automático</Label>
                <p className="text-sm text-muted-foreground">
                  Divide automaticamente o valor entre plataforma e fornecedor
                </p>
              </div>
              <Switch
                id="split-enabled"
                checked={asaasConfig.split_enabled}
                onCheckedChange={(checked) => setAsaasConfig(prev => ({ ...prev, split_enabled: checked }))}
              />
            </div>

            <Button onClick={handleSaveConfig} disabled={isLoading} className="w-full">
              {isLoading ? 'Salvando...' : 'Salvar Configurações de Escrow'}
            </Button>
          </TabsContent>

          <TabsContent value="tests" className="space-y-4">
            <TestWebhookSimulator />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
