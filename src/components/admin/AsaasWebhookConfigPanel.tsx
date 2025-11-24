import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Webhook, 
  Copy, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  TestTube,
  Mail,
  DollarSign,
  Shield
} from 'lucide-react';
import { useAsaasWebhookConfig } from '@/hooks/useAsaasWebhookConfig';
import { toast } from 'sonner';

export function AsaasWebhookConfigPanel() {
  const { config, updateConfig, testWebhook, generateToken, isLoading } = useAsaasWebhookConfig();
  const [showToken, setShowToken] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [localConfig, setLocalConfig] = useState(config || {
    enabled: false,
    webhook_url: `https://bpsqyaxdhqejozmlejcb.supabase.co/functions/v1/approve-transfer-webhook`,
    auth_token: '',
    notification_email: '',
    max_auto_approve_amount: 50000.0,
    validate_pix_key: true,
  });

  useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);

  const handleSave = async () => {
    try {
      await updateConfig(localConfig);
    } catch (error) {
      console.error('Error saving webhook config:', error);
    }
  };

  const handleGenerateToken = () => {
    const newToken = generateToken();
    setLocalConfig({ ...localConfig, auth_token: newToken });
    toast.success('Token gerado! Não esqueça de salvar as configurações.');
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      await testWebhook();
    } finally {
      setIsTesting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado para área de transferência!`);
  };

  const isConfigured = localConfig.enabled && localConfig.auth_token;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            <div>
              <CardTitle>Webhook de Autorização de Transferências</CardTitle>
              <CardDescription>
                Configure validação automática de transferências para fornecedores
              </CardDescription>
            </div>
          </div>
          <Badge variant={isConfigured ? "default" : "secondary"}>
            {isConfigured ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Ativo
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3 mr-1" />
                Inativo
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status do Webhook */}
        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
          <div className="space-y-1">
            <p className="text-sm font-medium">Webhook Ativo</p>
            <p className="text-xs text-muted-foreground">
              Habilitar autorização automática de transferências via webhook
            </p>
          </div>
          <Switch
            checked={localConfig.enabled}
            onCheckedChange={(checked) => setLocalConfig({ ...localConfig, enabled: checked })}
          />
        </div>

        {/* URL do Webhook */}
        <div className="space-y-2">
          <Label htmlFor="webhook-url">URL do Webhook</Label>
          <div className="flex gap-2">
            <Input
              id="webhook-url"
              value={localConfig.webhook_url}
              readOnly
              className="font-mono text-xs"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(localConfig.webhook_url, "URL")}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Configure esta URL no painel do Asaas em: <strong>Transferências → Mecanismos de Segurança → Webhook de Autorização</strong>
          </p>
        </div>

        {/* Token de Autenticação */}
        <div className="space-y-2">
          <Label htmlFor="auth-token">Token de Autenticação</Label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                id="auth-token"
                type={showToken ? 'text' : 'password'}
                placeholder={localConfig.auth_token ? '••••••••••••••••' : 'Gere um token de autenticação'}
                value={localConfig.auth_token || ''}
                onChange={(e) => setLocalConfig({ ...localConfig, auth_token: e.target.value })}
                className="font-mono text-xs pr-10"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowToken(!showToken)}
              type="button"
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleGenerateToken}
              type="button"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            {localConfig.auth_token && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(localConfig.auth_token || '', "Token")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Este token será usado pelo Asaas para autenticar as solicitações de autorização
          </p>
        </div>

        {/* Email de Notificação */}
        <div className="space-y-2">
          <Label htmlFor="notification-email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email de Notificação de Erros
          </Label>
          <Input
            id="notification-email"
            type="email"
            placeholder="seu-email@empresa.com"
            value={localConfig.notification_email || ''}
            onChange={(e) => setLocalConfig({ ...localConfig, notification_email: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Receba alertas quando uma transferência for rejeitada pelo webhook
          </p>
        </div>

        {/* Limite de Aprovação Automática */}
        <div className="space-y-2">
          <Label htmlFor="max-amount" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Valor Máximo para Aprovação Automática
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-sm">R$</span>
            <Input
              id="max-amount"
              type="number"
              step="0.01"
              min="0"
              value={localConfig.max_auto_approve_amount}
              onChange={(e) => setLocalConfig({ 
                ...localConfig, 
                max_auto_approve_amount: parseFloat(e.target.value) || 0 
              })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Transferências acima deste valor serão rejeitadas e exigirão aprovação manual
          </p>
        </div>

        {/* Validação de Chave PIX */}
        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
          <div className="space-y-1 flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium">Validar Chave PIX</p>
              <p className="text-xs text-muted-foreground">
                Verificar se a chave PIX corresponde aos dados cadastrados do fornecedor
              </p>
            </div>
          </div>
          <Switch
            checked={localConfig.validate_pix_key}
            onCheckedChange={(checked) => setLocalConfig({ ...localConfig, validate_pix_key: checked })}
          />
        </div>

        {/* Alert de Configuração */}
        {localConfig.enabled && !localConfig.auth_token && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Token Obrigatório</AlertTitle>
            <AlertDescription>
              Gere um token de autenticação antes de ativar o webhook para garantir a segurança das transferências.
            </AlertDescription>
          </Alert>
        )}

        {/* Instruções */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Como Configurar no Asaas</AlertTitle>
          <AlertDescription className="space-y-2 mt-2">
            <ol className="text-xs space-y-2 list-decimal list-inside">
              <li>Acesse o painel do Asaas</li>
              <li>Vá em <strong>Transferências → Mecanismos de Segurança</strong></li>
              <li>Clique em <strong>Webhook de Autorização</strong></li>
              <li>Cole a URL do webhook acima</li>
              <li>
                Configure o token no campo de autenticação:
                <div className="ml-6 mt-1 bg-muted p-2 rounded font-mono text-xs">
                  {localConfig.auth_token || '[gere o token primeiro]'}
                </div>
              </li>
              <li>Salve as configurações no Asaas</li>
            </ol>
          </AlertDescription>
        </Alert>

        {/* Validações Automáticas */}
        <div className="rounded-lg border p-4 space-y-3">
          <h4 className="text-sm font-semibold">Validações Automáticas</h4>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 text-green-500" />
              <div>
                <strong>Valor da Transferência:</strong> Verifica se o valor corresponde ao registrado
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 text-green-500" />
              <div>
                <strong>Status Pendente:</strong> Confirma que a transferência está aguardando aprovação
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 text-green-500" />
              <div>
                <strong>Fornecedor Ativo:</strong> Valida que o fornecedor está cadastrado e ativo
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 text-green-500" />
              <div>
                <strong>Limite de Valor:</strong> Rejeita transferências acima de R$ {localConfig.max_auto_approve_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            {localConfig.validate_pix_key && (
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 text-green-500" />
                <div>
                  <strong>Chave PIX:</strong> Valida correspondência com dados bancários cadastrados
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-3">
          <Button 
            onClick={handleSave} 
            disabled={isLoading || (localConfig.enabled && !localConfig.auth_token)}
            className="flex-1"
          >
            {isLoading ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
          <Button 
            variant="outline"
            onClick={handleTest}
            disabled={isTesting || !localConfig.enabled || !localConfig.auth_token}
          >
            <TestTube className="h-4 w-4 mr-2" />
            {isTesting ? 'Testando...' : 'Testar Webhook'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
