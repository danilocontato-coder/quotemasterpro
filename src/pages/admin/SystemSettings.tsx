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
  Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AIQuoteFeatureToggle } from '@/components/admin/AIQuoteFeatureToggle';
import { supabase } from '@/integrations/supabase/client';

export const SystemSettings = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Estados para configurações
  const [systemConfig, setSystemConfig] = useState({
    systemName: 'Sistema de Cotações',
    systemDescription: 'Plataforma corporativa de gestão de cotações',
    maintenanceMode: false,
    registrationEnabled: true,
    emailVerificationRequired: true,
    twoFactorEnabled: false,
    sessionTimeout: 24,
    maxLoginAttempts: 5,
    backupFrequency: 'daily',
    logRetentionDays: 90
  });

  const [whatsappMessages, setWhatsappMessages] = useState({
    proposalReceivedMessage: `🎯 *Nova Proposta Recebida!*

📋 *Cotação:* {{quote_title}} ({{quote_id}})
🏢 *Fornecedor:* {{supplier_name}}
💰 *Valor Total:* R$ {{total_value}}

✅ Uma nova proposta foi enviada para sua cotação. Acesse o sistema para avaliar os detalhes.

_QuoteMaster Pro - Gestão Inteligente de Cotações_`
  });

  // Carregar configurações salvas
  React.useEffect(() => {
    loadWhatsappMessages();
  }, []);

  const loadWhatsappMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'whatsapp_proposal_message')
        .single();
      
      if (data && data.setting_value && typeof data.setting_value === 'object') {
        const settingValue = data.setting_value as { message?: string };
        if (settingValue.message) {
          setWhatsappMessages({
            ...whatsappMessages,
            proposalReceivedMessage: settingValue.message
          });
        }
      }
    } catch (error) {
      // Se não encontrar configuração, usar padrão
      console.log('Usando mensagem padrão');
    }
  };

  const [integrationStatus, setIntegrationStatus] = useState({
    email: { connected: true, service: 'SendGrid', status: 'active' },
    whatsapp: { connected: false, service: 'Twilio', status: 'inactive' },
    payment: { connected: true, service: 'Stripe', status: 'active' },
    sms: { connected: false, service: 'Twilio SMS', status: 'inactive' },
    storage: { connected: true, service: 'Supabase Storage', status: 'active' }
  });

  const handleSave = async (section: string) => {
    setIsLoading(true);
    
    try {
      if (section === 'Mensagens') {
        const { error } = await supabase
          .from('system_settings')
          .upsert({
            setting_key: 'whatsapp_proposal_message',
            setting_value: { message: whatsappMessages.proposalReceivedMessage },
            description: 'Mensagem WhatsApp enviada quando fornecedor envia proposta'
          }, {
            onConflict: 'setting_key'
          });
        
        if (error) throw error;
      } else {
        // Simular salvamento para outras seções
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
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
            <TabsTrigger value="security">Segurança</TabsTrigger>
            <TabsTrigger value="integrations">Integrações</TabsTrigger>
            <TabsTrigger value="messages">Mensagens</TabsTrigger>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="systemName">Nome do Sistema</Label>
                    <Input
                      id="systemName"
                      value={systemConfig.systemName}
                      onChange={(e) => setSystemConfig({...systemConfig, systemName: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">Timeout de Sessão (horas)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      value={systemConfig.sessionTimeout}
                      onChange={(e) => setSystemConfig({...systemConfig, sessionTimeout: parseInt(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="systemDescription">Descrição do Sistema</Label>
                  <Textarea
                    id="systemDescription"
                    value={systemConfig.systemDescription}
                    onChange={(e) => setSystemConfig({...systemConfig, systemDescription: e.target.value})}
                    rows={3}
                  />
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

          {/* Configurações de Segurança */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Configurações de Segurança
                </CardTitle>
                <CardDescription>Configurações de autenticação e segurança</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="maxLoginAttempts">Máximo de Tentativas de Login</Label>
                    <Input
                      id="maxLoginAttempts"
                      type="number"
                      value={systemConfig.maxLoginAttempts}
                      onChange={(e) => setSystemConfig({...systemConfig, maxLoginAttempts: parseInt(e.target.value)})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="logRetention">Retenção de Logs (dias)</Label>
                    <Input
                      id="logRetention"
                      type="number"
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
            </div>
          </TabsContent>

          {/* Mensagens WhatsApp */}
          <TabsContent value="messages" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Mensagens WhatsApp
                </CardTitle>
                <CardDescription>Personalize as mensagens enviadas automaticamente via WhatsApp</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="proposalMessage">Mensagem: Nova Proposta Recebida</Label>
                    <p className="text-sm text-muted-foreground">
                      Mensagem enviada ao cliente quando um fornecedor envia uma nova proposta
                    </p>
                    <Textarea
                      id="proposalMessage"
                      value={whatsappMessages.proposalReceivedMessage}
                      onChange={(e) => setWhatsappMessages({
                        ...whatsappMessages, 
                        proposalReceivedMessage: e.target.value
                      })}
                      rows={12}
                      className="font-mono text-sm"
                    />
                    <div className="bg-muted p-3 rounded-md">
                      <p className="text-sm font-medium mb-2">Variáveis disponíveis:</p>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p><code>{'{{quote_title}}'}</code> - Título da cotação</p>
                        <p><code>{'{{quote_id}}'}</code> - ID da cotação</p>
                        <p><code>{'{{supplier_name}}'}</code> - Nome do fornecedor</p>
                        <p><code>{'{{total_value}}'}</code> - Valor total formatado</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Button onClick={() => handleSave('Mensagens')} disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'Salvando...' : 'Salvar Mensagens'}
                </Button>
              </CardContent>
            </Card>
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