import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Send, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function EmailConfig() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const [config, setConfig] = useState({
    resend_api_key: '',
    from_email: '',
    from_name: 'Cotiz'
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'email_service_config')
        .maybeSingle();

      if (error) throw error;
      if (data?.setting_value) {
        setConfig(data.setting_value as any);
      }
    } catch (error: any) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config.resend_api_key || !config.from_email) {
      toast({
        title: 'Campos obrigatórios',
        description: 'API Key e From Email são obrigatórios',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'email_service_config',
          setting_value: config,
          description: 'Configurações do serviço de e-mail (Resend)'
        }, {
          onConflict: 'setting_key'
        });

      if (error) throw error;

      toast({
        title: 'Configurações salvas',
        description: 'As configurações de e-mail foram salvas com sucesso'
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!config.resend_api_key || !config.from_email) {
      toast({
        title: 'Configure primeiro',
        description: 'Salve as configurações antes de testar',
        variant: 'destructive'
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-email-config', {
        body: {
          api_key: config.resend_api_key,
          from_email: config.from_email,
          from_name: config.from_name
        }
      });

      if (error) throw error;

      setTestResult({
        success: data.success,
        message: data.success 
          ? 'E-mail de teste enviado com sucesso! Verifique sua caixa de entrada.' 
          : data.error || 'Erro ao enviar e-mail de teste'
      });

      if (data.success) {
        toast({
          title: 'Teste enviado',
          description: 'Verifique sua caixa de entrada'
        });
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'Erro ao testar configuração'
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Button variant="ghost" onClick={() => navigate('/admin/system')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Configurações de E-mail (Resend)</CardTitle>
          <CardDescription>
            Configure o serviço de envio de e-mails. Você precisará de uma conta Resend e uma API Key.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="api_key">API Key do Resend *</Label>
            <Input
              id="api_key"
              type="password"
              placeholder="re_xxxxxxxxxxxxxxxxxx"
              value={config.resend_api_key}
              onChange={(e) => setConfig({ ...config, resend_api_key: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Obtenha sua API Key em: <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">resend.com/api-keys</a>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="from_email">From Email *</Label>
            <Input
              id="from_email"
              type="email"
              placeholder="noreply@seudominio.com.br"
              value={config.from_email}
              onChange={(e) => setConfig({ ...config, from_email: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Certifique-se de validar seu domínio em: <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="underline">resend.com/domains</a>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="from_name">From Name</Label>
            <Input
              id="from_name"
              type="text"
              placeholder="Cotiz"
              value={config.from_name}
              onChange={(e) => setConfig({ ...config, from_name: e.target.value })}
            />
          </div>

          {testResult && (
            <div className={`flex items-start gap-2 p-4 rounded-lg border ${
              testResult.success 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              )}
              <p className="text-sm">{testResult.message}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Configurações
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testing || !config.resend_api_key}>
              {testing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Testar Conexão
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
