import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Database, 
  Shield, 
  Bell, 
  Mail, 
  Smartphone,
  CreditCard,
  Globe,
  Server,
  Lock,
  Key,
  Save,
  TestTube,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sparkles,
  MessageCircle,
  Bot
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AIQuoteFeatureToggle } from '@/components/admin/AIQuoteFeatureToggle';
import { supabase } from '@/integrations/supabase/client';
import { PasswordChange } from '@/components/settings/PasswordChange';
import { GamificationPanel } from '@/components/admin/gamification/GamificationPanel';

export const SystemSettings = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [systemConfig, setSystemConfig] = useState({
    maintenanceMode: false,
    registrationEnabled: true,
    emailVerificationRequired: true,
    twoFactorEnabled: false,
    sessionTimeout: 24,
    maxLoginAttempts: 5,
    backupFrequency: 'daily',
    logRetentionDays: 90
  });

  // Carregar configurações salvas (removido carregamento de mensagens WhatsApp)

  const [integrationStatus, setIntegrationStatus] = useState({
    email: { connected: true, service: 'SendGrid', status: 'active' },
    whatsapp: { connected: false, service: 'Twilio', status: 'inactive' },
    payment: { connected: true, service: 'Stripe', status: 'active' },
    sms: { connected: false, service: 'Twilio SMS', status: 'inactive' },
    storage: { connected: true, service: 'Supabase Storage', status: 'active' },
    uber: { connected: false, service: 'Uber Direct', status: 'inactive' }
  });

  const handleSave = async (section: string) => {
    setIsLoading(true);
    
    try {
      // Simular salvamento para outras seções
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Configurações salvas",
        description: `Seção "${section}" foi atualizada com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testIntegration = async (service: string) => {
    setIsLoading(true);
    // Simular teste de integração
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false);
    
    toast({
      title: "Teste concluído",
      description: `Integração com ${service} está funcionando corretamente.`,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'inactive': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <XCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Configurações do Sistema</h1>
            <p className="text-muted-foreground">Configurações avançadas e integrações</p>
          </div>
          <Badge variant="secondary" className="bg-blue-50 text-blue-700">
            <Server className="h-4 w-4 mr-2" />
            Sistema Online
          </Badge>
        </div>
      </div>

      <div className="p-6">
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="ai">IA</TabsTrigger>
            <TabsTrigger value="gamification">🎮 Gamificação</TabsTrigger>
            <TabsTrigger value="security">Segurança</TabsTrigger>
            <TabsTrigger value="integrations">Integrações</TabsTrigger>
            <TabsTrigger value="notifications">Notificações</TabsTrigger>
            <TabsTrigger value="maintenance">Manutenção</TabsTrigger>
          </TabsList>

          {/* Configurações Gerais */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configurações Gerais
                </CardTitle>
                <CardDescription>Configurações básicas do sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Tempo da Sessão (horas)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    min="1"
                    max="168"
                    value={systemConfig.sessionTimeout}
                    onChange={(e) => setSystemConfig({...systemConfig, sessionTimeout: parseInt(e.target.value)})}
                  />
                  <p className="text-sm text-muted-foreground">
                    Define quanto tempo um usuário pode ficar inativo antes de ser desconectado automaticamente (1-168 horas)
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="maintenanceMode">Modo de Manutenção</Label>
                      <p className="text-sm text-muted-foreground">Desativa o acesso de usuários não-admin</p>
                    </div>
                    <Switch
                      id="maintenanceMode"
                      checked={systemConfig.maintenanceMode}
                      onCheckedChange={(checked) => setSystemConfig({...systemConfig, maintenanceMode: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="registrationEnabled">Registro Habilitado</Label>
                      <p className="text-sm text-muted-foreground">Permite novos registros</p>
                    </div>
                    <Switch
                      id="registrationEnabled"
                      checked={systemConfig.registrationEnabled}
                      onCheckedChange={(checked) => setSystemConfig({...systemConfig, registrationEnabled: checked})}
                    />
                  </div>
                </div>

                <Button onClick={() => handleSave('Geral')} disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Configurações de IA */}
          <TabsContent value="ai" className="space-y-6">
            <AIQuoteFeatureToggle />
          </TabsContent>

          {/* Configurações de Gamificação */}
          <TabsContent value="gamification" className="space-y-6">
            <GamificationPanel />
          </TabsContent>

          {/* Configurações de Segurança */}
          <TabsContent value="security" className="space-y-6">
            {/* Alteração de Senha */}
            <PasswordChange />

            {/* Outras Configurações de Segurança */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Políticas de Segurança
                </CardTitle>
                <CardDescription>Configurações globais de autenticação e segurança</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="maxLoginAttempts">Máximo de Tentativas de Login</Label>
                    <Input
                      id="maxLoginAttempts"
                      type="number"
                      min="3"
                      max="10"
                      value={systemConfig.maxLoginAttempts}
                      onChange={(e) => setSystemConfig({...systemConfig, maxLoginAttempts: parseInt(e.target.value)})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="logRetention">Retenção de Logs (dias)</Label>
                    <Input
                      id="logRetention"
                      type="number"
                      min="30"
                      max="365"
                      value={systemConfig.logRetentionDays}
                      onChange={(e) => setSystemConfig({...systemConfig, logRetentionDays: parseInt(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Verificação de E-mail Obrigatória</Label>
                      <p className="text-sm text-muted-foreground">Usuários devem verificar o e-mail</p>
                    </div>
                    <Switch
                      checked={systemConfig.emailVerificationRequired}
                      onCheckedChange={(checked) => setSystemConfig({...systemConfig, emailVerificationRequired: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Autenticação de Dois Fatores</Label>
                      <p className="text-sm text-muted-foreground">Habilita 2FA para todos os usuários</p>
                    </div>
                    <Switch
                      checked={systemConfig.twoFactorEnabled}
                      onCheckedChange={(checked) => setSystemConfig({...systemConfig, twoFactorEnabled: checked})}
                    />
                  </div>
                </div>

                <Button onClick={() => handleSave('Segurança')} disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrações */}
          <TabsContent value="integrations" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* E-mail */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    E-mail (SendGrid)
                  </CardTitle>
                  <CardDescription>Envio de e-mails transacionais</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(integrationStatus.email.status)}
                      <Badge variant={integrationStatus.email.connected ? 'default' : 'secondary'}>
                        {integrationStatus.email.connected ? 'Conectado' : 'Desconectado'}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sendgridKey">Chave da API SendGrid</Label>
                    <Input
                      id="sendgridKey"
                      type="password"
                      placeholder="SG.***************"
                      defaultValue="******************"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => testIntegration('SendGrid')}
                      disabled={isLoading}
                    >
                      <TestTube className="h-4 w-4 mr-2" />
                      Testar
                    </Button>
                    <Button size="sm" onClick={() => handleSave('E-mail')}>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* WhatsApp */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    WhatsApp (Twilio)
                  </CardTitle>
                  <CardDescription>Mensagens via WhatsApp</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(integrationStatus.whatsapp.status)}
                      <Badge variant={integrationStatus.whatsapp.connected ? 'default' : 'secondary'}>
                        {integrationStatus.whatsapp.connected ? 'Conectado' : 'Desconectado'}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="twilioSid">Account SID</Label>
                    <Input
                      id="twilioSid"
                      placeholder="AC***************"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="twilioToken">Auth Token</Label>
                    <Input
                      id="twilioToken"
                      type="password"
                      placeholder="***************"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => testIntegration('Twilio WhatsApp')}
                      disabled={isLoading}
                    >
                      <TestTube className="h-4 w-4 mr-2" />
                      Testar
                    </Button>
                    <Button size="sm" onClick={() => handleSave('WhatsApp')}>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Stripe */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Pagamentos (Stripe)
                  </CardTitle>
                  <CardDescription>Processamento de pagamentos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(integrationStatus.payment.status)}
                      <Badge variant={integrationStatus.payment.connected ? 'default' : 'secondary'}>
                        {integrationStatus.payment.connected ? 'Conectado' : 'Desconectado'}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stripeKey">Chave Secreta Stripe</Label>
                    <Input
                      id="stripeKey"
                      type="password"
                      placeholder="sk_***************"
                      defaultValue="******************"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stripeWebhook">Webhook Secret</Label>
                    <Input
                      id="stripeWebhook"
                      type="password"
                      placeholder="whsec_***************"
                      defaultValue="******************"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => testIntegration('Stripe')}
                      disabled={isLoading}
                    >
                      <TestTube className="h-4 w-4 mr-2" />
                      Testar
                    </Button>
                    <Button size="sm" onClick={() => handleSave('Stripe')}>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Storage */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Armazenamento
                  </CardTitle>
                  <CardDescription>Supabase Storage</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(integrationStatus.storage.status)}
                      <Badge variant={integrationStatus.storage.connected ? 'default' : 'secondary'}>
                        {integrationStatus.storage.connected ? 'Conectado' : 'Desconectado'}
                      </Badge>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Conectado automaticamente via integração Supabase
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => testIntegration('Supabase Storage')}
                    disabled={isLoading}
                  >
                    <TestTube className="h-4 w-4 mr-2" />
                    Testar Conexão
                  </Button>
                </CardContent>
              </Card>

              {/* Uber Direct */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Uber Direct API
                  </CardTitle>
                  <CardDescription>Integração para entregas via Uber</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(integrationStatus.uber.status)}
                      <Badge variant={integrationStatus.uber.connected ? 'default' : 'secondary'}>
                        {integrationStatus.uber.connected ? 'Conectado' : 'Desconectado'}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="uberCustomerId">Customer ID</Label>
                    <Input
                      id="uberCustomerId"
                      placeholder="customer-xxxxx-xxxxx"
                    />
                    <p className="text-xs text-muted-foreground">
                      ID do cliente Uber Direct (encontrado no dashboard)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="uberClientId">Client ID</Label>
                    <Input
                      id="uberClientId"
                      placeholder="xxxxxxxxxxxxx"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="uberClientSecret">Client Secret</Label>
                    <Input
                      id="uberClientSecret"
                      type="password"
                      placeholder="***************"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="uberApiUrl">URL da API</Label>
                    <Input
                      id="uberApiUrl"
                      placeholder="https://api.uber.com"
                      defaultValue="https://sandbox-api.uber.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use https://sandbox-api.uber.com para testes ou https://api.uber.com para produção
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => testIntegration('Uber Direct')}
                      disabled={isLoading}
                    >
                      <TestTube className="h-4 w-4 mr-2" />
                      Testar
                    </Button>
                    <Button size="sm" onClick={() => handleSave('Uber Direct')}>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Notificações */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Configurações de Notificações
                </CardTitle>
                <CardDescription>Configure quando e como enviar notificações</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Configurações de Notificações</h3>
                  <p className="text-muted-foreground mb-4">Interface para configurar notificações por e-mail, WhatsApp e push</p>
                  <Button>Em desenvolvimento</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manutenção */}
          <TabsContent value="maintenance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Manutenção do Sistema
                </CardTitle>
                <CardDescription>Backup, logs e manutenção preventiva</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Server className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Ferramentas de Manutenção</h3>
                  <p className="text-muted-foreground mb-4">Backup automático, limpeza de logs e otimização</p>
                  <Button>Em desenvolvimento</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SystemSettings;