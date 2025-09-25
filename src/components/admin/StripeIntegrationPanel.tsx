import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink,
  Key,
  Webhook,
  Settings,
  TestTube
} from 'lucide-react';
import { useSupabaseIntegrations } from '@/hooks/useSupabaseIntegrations';
import { toast } from 'sonner';

export const StripeIntegrationPanel = () => {
  const { integrations, createIntegration, updateIntegration, testIntegration } = useSupabaseIntegrations();
  const [stripeConfig, setStripeConfig] = useState({
    publishable_key: '',
    secret_key: '',
    webhook_secret: '',
    webhook_url: '',
    test_mode: true
  });
  const [isTesting, setIsTesting] = useState(false);
  const [hasStripeIntegration, setHasStripeIntegration] = useState(false);

  useEffect(() => {
    // Buscar integração Stripe existente
    const stripeIntegration = integrations.find(int => int.integration_type === 'payment_stripe');
    if (stripeIntegration) {
      setHasStripeIntegration(true);
      setStripeConfig({
        publishable_key: stripeIntegration.configuration.publishable_key || '',
        secret_key: stripeIntegration.configuration.secret_key || '',
        webhook_secret: stripeIntegration.configuration.webhook_secret || '',
        webhook_url: stripeIntegration.configuration.webhook_url || '',
        test_mode: stripeIntegration.configuration.test_mode || true
      });
    } else {
      // Configurar webhook URL padrão
      const baseUrl = window.location.origin;
      setStripeConfig(prev => ({
        ...prev,
        webhook_url: `${baseUrl}/webhooks/stripe`
      }));
    }
  }, [integrations]);

  const handleSaveConfiguration = async () => {
    try {
      if (!stripeConfig.publishable_key || !stripeConfig.secret_key) {
        toast.error('Chaves do Stripe são obrigatórias');
        return;
      }

      const integrationData = {
        integration_type: 'payment_stripe' as const,
        configuration: stripeConfig,
        active: true
      };

      if (hasStripeIntegration) {
        const stripeIntegration = integrations.find(int => int.integration_type === 'payment_stripe');
        if (stripeIntegration) {
          await updateIntegration(stripeIntegration.id, integrationData);
        }
      } else {
        await createIntegration(integrationData);
        setHasStripeIntegration(true);
      }

      toast.success('Configuração do Stripe salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast.error('Erro ao salvar configuração do Stripe');
    }
  };

  const handleTestConnection = async () => {
    if (!hasStripeIntegration) {
      toast.error('Salve a configuração antes de testar');
      return;
    }

    setIsTesting(true);
    try {
      const stripeIntegration = integrations.find(int => int.integration_type === 'payment_stripe');
      if (stripeIntegration) {
        await testIntegration(stripeIntegration.id);
      }
    } catch (error) {
      console.error('Erro no teste:', error);
    } finally {
      setIsTesting(false);
    }
  };

  const isConfigurationValid = stripeConfig.publishable_key && stripeConfig.secret_key;

  return (
    <div className="space-y-6">
      {/* Status da Integração */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle>Integração Stripe</CardTitle>
                <CardDescription>Configure pagamentos automáticos e assinaturas</CardDescription>
              </div>
            </div>
            {isConfigurationValid ? (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                <CheckCircle className="h-4 w-4 mr-1" />
                Configurado
              </Badge>
            ) : (
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                <AlertCircle className="h-4 w-4 mr-1" />
                Pendente
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Configuração de Chaves */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Chaves da API
          </CardTitle>
          <CardDescription>
            Configure suas chaves do Stripe. Use chaves de teste durante desenvolvimento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Modo de Teste</Label>
              <p className="text-sm text-muted-foreground">
                Ativar para usar chaves de teste do Stripe
              </p>
            </div>
            <Switch
              checked={stripeConfig.test_mode}
              onCheckedChange={(checked) => 
                setStripeConfig(prev => ({ ...prev, test_mode: checked }))
              }
            />
          </div>

          <Separator />

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="publishable_key">
                Chave Publicável {stripeConfig.test_mode ? '(Teste)' : '(Produção)'}
              </Label>
              <Input
                id="publishable_key"
                placeholder={stripeConfig.test_mode ? "pk_test_..." : "pk_live_..."}
                value={stripeConfig.publishable_key}
                onChange={(e) => 
                  setStripeConfig(prev => ({ ...prev, publishable_key: e.target.value }))
                }
              />
              <p className="text-sm text-muted-foreground mt-1">
                Esta chave será visível no frontend
              </p>
            </div>

            <div>
              <Label htmlFor="secret_key">
                Chave Secreta {stripeConfig.test_mode ? '(Teste)' : '(Produção)'}
              </Label>
              <Input
                id="secret_key"
                type="password"
                placeholder={stripeConfig.test_mode ? "sk_test_..." : "sk_live_..."}
                value={stripeConfig.secret_key}
                onChange={(e) => 
                  setStripeConfig(prev => ({ ...prev, secret_key: e.target.value }))
                }
              />
              <p className="text-sm text-muted-foreground mt-1">
                Esta chave será armazenada com segurança no Supabase
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <ExternalLink className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-800">
              Obtenha suas chaves em: 
              <a 
                href="https://dashboard.stripe.com/apikeys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-1 underline font-medium"
              >
                Stripe Dashboard
              </a>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Configuração de Webhooks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhooks
          </CardTitle>
          <CardDescription>
            Configure webhooks para sincronização automática de pagamentos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="webhook_url">URL do Webhook</Label>
            <Input
              id="webhook_url"
              value={stripeConfig.webhook_url}
              onChange={(e) => 
                setStripeConfig(prev => ({ ...prev, webhook_url: e.target.value }))
              }
              readOnly
            />
            <p className="text-sm text-muted-foreground mt-1">
              Configure esta URL no seu dashboard do Stripe
            </p>
          </div>

          <div>
            <Label htmlFor="webhook_secret">Secret do Webhook</Label>
            <Input
              id="webhook_secret"
              type="password"
              placeholder="whsec_..."
              value={stripeConfig.webhook_secret}
              onChange={(e) => 
                setStripeConfig(prev => ({ ...prev, webhook_secret: e.target.value }))
              }
            />
            <p className="text-sm text-muted-foreground mt-1">
              Obtido após criar o webhook no Stripe
            </p>
          </div>

          <div className="space-y-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <h4 className="font-medium text-amber-800">Eventos necessários no Stripe:</h4>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• invoice.payment_succeeded</li>
              <li>• invoice.payment_failed</li>
              <li>• customer.subscription.updated</li>
              <li>• customer.subscription.deleted</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Ações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button 
              onClick={handleSaveConfiguration}
              disabled={!stripeConfig.publishable_key || !stripeConfig.secret_key}
            >
              Salvar Configuração
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleTestConnection}
              disabled={!isConfigurationValid || isTesting}
            >
              {isTesting ? (
                <>
                  <TestTube className="h-4 w-4 mr-2 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <TestTube className="h-4 w-4 mr-2" />
                  Testar Conexão
                </>
              )}
            </Button>

            <Button variant="outline" asChild>
              <a 
                href="https://dashboard.stripe.com/webhooks" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Configurar Webhooks
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Documentação */}
      <Card>
        <CardHeader>
          <CardTitle>Próximos Passos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">1</div>
            <div>
              <p className="font-medium">Configure as chaves da API</p>
              <p className="text-sm text-muted-foreground">Obtenha e configure suas chaves do Stripe</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">2</div>
            <div>
              <p className="font-medium">Configure webhooks no Stripe</p>
              <p className="text-sm text-muted-foreground">Adicione a URL do webhook no dashboard do Stripe</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">3</div>
            <div>
              <p className="font-medium">Teste a integração</p>
              <p className="text-sm text-muted-foreground">Execute o teste para verificar se tudo está funcionando</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};