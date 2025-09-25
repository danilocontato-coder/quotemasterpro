import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle, Settings, FileText } from 'lucide-react';
import { useSupabaseFinancial } from '@/hooks/useSupabaseFinancial';
import { toast } from 'sonner';

export function BoletoIntegrationPanel() {
  const { settings, updateSettings, isLoading } = useSupabaseFinancial();
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [boletoConfig, setBoletoConfig] = useState(settings?.boleto_config || {
    provider: 'pagseguro',
    api_url: 'https://ws.sandbox.pagseguro.uol.com.br',
    email: '',
    token: '',
    discount_days: 3,
    interest_rate: 1.0,
    fine_rate: 2.0,
    instructions: 'Pagamento via boleto bancário. Após o vencimento haverá cobrança de multa e juros.',
    expire_days: 30
  });

  const handleSaveConfig = async () => {
    try {
      await updateSettings({
        boleto_config: boletoConfig
      });
      toast.success('Configurações do boleto salvas com sucesso');
    } catch (error) {
      console.error('Error saving boleto config:', error);
      toast.error('Erro ao salvar configurações do boleto');
    }
  };

  const testConnection = async () => {
    if (!boletoConfig.email || !boletoConfig.token) {
      toast.error('Preencha email e token antes de testar');
      return;
    }

    setIsTestingConnection(true);
    try {
      // Teste simples de conexão
      const response = await fetch(`${boletoConfig.api_url}/v2/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          email: boletoConfig.email,
          token: boletoConfig.token
        })
      });

      if (response.ok) {
        toast.success('Conexão com PagSeguro testada com sucesso');
      } else {
        throw new Error('Falha na conexão');
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      toast.error('Erro ao testar conexão. Verifique as credenciais.');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const isConfigured = boletoConfig.email && boletoConfig.token;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <div>
              <CardTitle>Integração Boleto</CardTitle>
              <CardDescription>
                Configure a geração automática de boletos via PagSeguro
              </CardDescription>
            </div>
          </div>
          <Badge variant={isConfigured ? "default" : "secondary"}>
            {isConfigured ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Configurado
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
            <TabsTrigger value="advanced">
              <FileText className="h-4 w-4 mr-2" />
              Avançado
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pagseguro-email">Email PagSeguro</Label>
                <Input
                  id="pagseguro-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={boletoConfig.email}
                  onChange={(e) => setBoletoConfig(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pagseguro-token">Token de Produção</Label>
                <Input
                  id="pagseguro-token"
                  type="password"
                  placeholder="Seu token do PagSeguro"
                  value={boletoConfig.token}
                  onChange={(e) => setBoletoConfig(prev => ({ ...prev, token: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api-url">URL da API</Label>
              <Input
                id="api-url"
                value={boletoConfig.api_url}
                onChange={(e) => setBoletoConfig(prev => ({ ...prev, api_url: e.target.value }))}
                placeholder="https://ws.pagseguro.uol.com.br"
              />
              <p className="text-sm text-muted-foreground">
                Use https://ws.sandbox.pagseguro.uol.com.br para testes
              </p>
            </div>

            <div className="flex gap-4">
              <Button onClick={testConnection} disabled={isTestingConnection || !isConfigured}>
                {isTestingConnection ? 'Testando...' : 'Testar Conexão'}
              </Button>
              <Button onClick={handleSaveConfig} disabled={isLoading}>
                {isLoading ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discount-days">Dias para Desconto</Label>
                <Input
                  id="discount-days"
                  type="number"
                  value={boletoConfig.discount_days}
                  onChange={(e) => setBoletoConfig(prev => ({ ...prev, discount_days: parseInt(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interest-rate">Taxa de Juros (%)</Label>
                <Input
                  id="interest-rate"
                  type="number"
                  step="0.1"
                  value={boletoConfig.interest_rate}
                  onChange={(e) => setBoletoConfig(prev => ({ ...prev, interest_rate: parseFloat(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fine-rate">Taxa de Multa (%)</Label>
                <Input
                  id="fine-rate"
                  type="number"
                  step="0.1"
                  value={boletoConfig.fine_rate}
                  onChange={(e) => setBoletoConfig(prev => ({ ...prev, fine_rate: parseFloat(e.target.value) }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Instruções do Boleto</Label>
              <Textarea
                id="instructions"
                value={boletoConfig.instructions}
                onChange={(e) => setBoletoConfig(prev => ({ ...prev, instructions: e.target.value }))}
                placeholder="Instruções que aparecerão no boleto"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expire-days">Dias para Vencimento</Label>
              <Input
                id="expire-days"
                type="number"
                value={boletoConfig.expire_days}
                onChange={(e) => setBoletoConfig(prev => ({ ...prev, expire_days: parseInt(e.target.value) }))}
              />
              <p className="text-sm text-muted-foreground">
                Quantos dias após a geração o boleto vence
              </p>
            </div>

            <Button onClick={handleSaveConfig} disabled={isLoading} className="w-full">
              {isLoading ? 'Salvando...' : 'Salvar Configurações Avançadas'}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}