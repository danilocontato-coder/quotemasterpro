import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Send, Loader2, CheckCircle, XCircle, Mail } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useSystemBranding } from '@/hooks/useSystemBranding';

interface EmailConfig {
  provider: 'resend' | 'sendgrid' | 'smtp';
  resend_api_key?: string;
  sendgrid_api_key?: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_password?: string;
  smtp_secure?: boolean;
  from_email: string;
  from_name: string;
}

export default function EmailSettings() {
  const { toast } = useToast();
  const { settings: brandingSettings } = useSystemBranding();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testEmail, setTestEmail] = useState('');
  
  const [config, setConfig] = useState<EmailConfig>({
    provider: 'resend',
    from_email: '',
    from_name: brandingSettings.companyName,
    smtp_secure: true,
    smtp_port: 587
  });

  useEffect(() => {
    loadEmailConfig();
  }, []);

  const loadEmailConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'email_configuration')
        .maybeSingle();

      if (error) throw error;

      if (data?.setting_value) {
        setConfig(data.setting_value as unknown as EmailConfig);
      }
    } catch (error: any) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'email_configuration',
          setting_value: config as any,
          description: 'Configurações de envio de e-mail (Resend, SendGrid ou SMTP)'
        }, {
          onConflict: 'setting_key'
        });

      if (error) throw error;

      toast({
        title: 'Configurações salvas',
        description: 'As configurações de e-mail foram atualizadas com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      toast({
        title: 'E-mail inválido',
        description: 'Por favor, insira um e-mail válido para o teste.',
        variant: 'destructive',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('test-email', {
        body: { to: testEmail }
      });

      if (error) throw error;

      setTestResult({
        success: data.success,
        message: data.message || 'E-mail de teste enviado com sucesso!'
      });

      if (data.success) {
        toast({
          title: 'E-mail de teste enviado',
          description: `Verifique sua caixa de entrada: ${testEmail}`,
        });
      } else {
        throw new Error(data.message || 'Erro ao enviar e-mail de teste');
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'Erro ao enviar e-mail de teste'
      });
      
      toast({
        title: 'Erro ao testar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Configuração de E-mails</h1>
        <p className="text-muted-foreground">
          Configure o provedor de e-mail para enviar notificações e comunicados
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Provedor de E-mail
          </CardTitle>
          <CardDescription>
            Escolha entre Resend (recomendado), SendGrid ou SMTP customizado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={config.provider} onValueChange={(value) => setConfig({ ...config, provider: value as any })}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="resend">Resend</TabsTrigger>
              <TabsTrigger value="sendgrid">SendGrid</TabsTrigger>
              <TabsTrigger value="smtp">SMTP Custom</TabsTrigger>
            </TabsList>

            <TabsContent value="resend" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="resend_api_key">API Key do Resend</Label>
                <Input
                  id="resend_api_key"
                  type="password"
                  placeholder="re_..."
                  value={config.resend_api_key || ''}
                  onChange={(e) => setConfig({ ...config, resend_api_key: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Obtenha sua API Key em: <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">resend.com/api-keys</a>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="from_email_resend">E-mail remetente</Label>
                <Input
                  id="from_email_resend"
                  type="email"
                  placeholder="noreply@seudominio.com.br"
                  value={config.from_email}
                  onChange={(e) => setConfig({ ...config, from_email: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Use onboarding@resend.dev para testes ou configure seu domínio
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="from_name_resend">Nome do remetente</Label>
                <Input
                  id="from_name_resend"
                  placeholder={brandingSettings.companyName}
                  value={config.from_name}
                  onChange={(e) => setConfig({ ...config, from_name: e.target.value })}
                />
              </div>
            </TabsContent>

            <TabsContent value="sendgrid" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="sendgrid_api_key">API Key do SendGrid</Label>
                <Input
                  id="sendgrid_api_key"
                  type="password"
                  placeholder="SG...."
                  value={config.sendgrid_api_key || ''}
                  onChange={(e) => setConfig({ ...config, sendgrid_api_key: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="from_email_sendgrid">E-mail remetente</Label>
                <Input
                  id="from_email_sendgrid"
                  type="email"
                  placeholder="noreply@seudominio.com.br"
                  value={config.from_email}
                  onChange={(e) => setConfig({ ...config, from_email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="from_name_sendgrid">Nome do remetente</Label>
                <Input
                  id="from_name_sendgrid"
                  placeholder={brandingSettings.companyName}
                  value={config.from_name}
                  onChange={(e) => setConfig({ ...config, from_name: e.target.value })}
                />
              </div>
            </TabsContent>

            <TabsContent value="smtp" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_host">Host SMTP</Label>
                  <Input
                    id="smtp_host"
                    placeholder="smtp.gmail.com"
                    value={config.smtp_host || ''}
                    onChange={(e) => setConfig({ ...config, smtp_host: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp_port">Porta</Label>
                  <Input
                    id="smtp_port"
                    type="number"
                    placeholder="587"
                    value={config.smtp_port || 587}
                    onChange={(e) => setConfig({ ...config, smtp_port: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp_user">Usuário</Label>
                <Input
                  id="smtp_user"
                  placeholder="seu@email.com"
                  value={config.smtp_user || ''}
                  onChange={(e) => setConfig({ ...config, smtp_user: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp_password">Senha</Label>
                <Input
                  id="smtp_password"
                  type="password"
                  placeholder="••••••••"
                  value={config.smtp_password || ''}
                  onChange={(e) => setConfig({ ...config, smtp_password: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="smtp_secure"
                  checked={config.smtp_secure}
                  onCheckedChange={(checked) => setConfig({ ...config, smtp_secure: checked })}
                />
                <Label htmlFor="smtp_secure">Usar TLS/SSL</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="from_email_smtp">E-mail remetente</Label>
                <Input
                  id="from_email_smtp"
                  type="email"
                  placeholder="noreply@seudominio.com.br"
                  value={config.from_email}
                  onChange={(e) => setConfig({ ...config, from_email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="from_name_smtp">Nome do remetente</Label>
                <Input
                  id="from_name_smtp"
                  placeholder={brandingSettings.companyName}
                  value={config.from_name}
                  onChange={(e) => setConfig({ ...config, from_name: e.target.value })}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-4 mt-6">
            <Button onClick={handleSave} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Salvar Configurações
                </>
              )}
            </Button>

            <div className="border-t pt-4">
              <Label htmlFor="test_email" className="text-base font-medium mb-3 block">
                Testar Envio de E-mail
              </Label>
              <div className="flex gap-3">
                <Input
                  id="test_email"
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  onClick={handleTestEmail} 
                  disabled={testing || !config.from_email || !testEmail}
                >
                  {testing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testando...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Testar
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Digite o e-mail para onde deseja enviar o teste de configuração
              </p>
            </div>
          </div>

          {testResult && (
            <div className={`mt-4 p-4 rounded-lg border ${
              testResult.success 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
                <p className="font-medium">
                  {testResult.success ? 'Teste bem-sucedido' : 'Falha no teste'}
                </p>
              </div>
              <p className="text-sm mt-1">{testResult.message}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documentação</CardTitle>
          <CardDescription>Links úteis para configuração</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <strong>Resend (Recomendado):</strong>
            <ul className="list-disc list-inside text-sm text-muted-foreground ml-4 mt-1">
              <li><a href="https://resend.com/docs" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Documentação oficial</a></li>
              <li><a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Configurar domínio</a></li>
              <li>5.000 e-mails/mês grátis</li>
            </ul>
          </div>
          
          <div className="mt-4">
            <strong>SendGrid:</strong>
            <ul className="list-disc list-inside text-sm text-muted-foreground ml-4 mt-1">
              <li><a href="https://sendgrid.com/docs" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Documentação oficial</a></li>
              <li>100 e-mails/dia grátis</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
