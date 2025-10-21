import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Copy, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  User, 
  Lock,
  AlertTriangle,
  CheckCircle,
  Mail,
  MessageSquare,
  History,
  Info
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Client {
  id: string;
  name: string;
  companyName: string;
  email: string;
  phone?: string;
  status: string;
}

interface ClientCredentialsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onGenerateUsername: (companyName: string) => string;
  onGeneratePassword: () => string;
  onResetPassword: (clientId: string, email: string) => Promise<string | { password: string; temporaryCredentialId?: string }>;
  onSendCredentials?: (
    clientId: string,
    credentials: { email: string; password: string },
    options: { sendByEmail: boolean; sendByWhatsApp: boolean }
  ) => Promise<void>;
}

export const ClientCredentialsModal: React.FC<ClientCredentialsModalProps> = ({
  open,
  onOpenChange,
  client,
  onGenerateUsername,
  onGeneratePassword,
  onResetPassword,
  onSendCredentials
}) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    temporaryPassword: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingLast, setIsLoadingLast] = useState(false);
  const [lastPasswordInfo, setLastPasswordInfo] = useState<{ generated_at: string; sent_at?: string } | null>(null);
  const [sendOptions, setSendOptions] = useState({
    sendByEmail: true,
    sendByWhatsApp: false
  });
  const { toast } = useToast();

  const [tempCredId, setTempCredId] = useState<string | null>(null);

  React.useEffect(() => {
    if (client && open) {
      // Usar o email como username
      const username = client.email;
      // Não gerar senha localmente mais - será resetada quando necessário
      setCredentials({
        username,
        password: '',
        temporaryPassword: true
      });
      // Resetar senha automaticamente ao abrir
      handleGenerateNewPassword();
    }
  }, [client, open]);

  const handleCopyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: `${type} copiado para a área de transferência.`,
    });
  };

  const handleCopyAllCredentials = () => {
    const fullText = `🔐 CREDENCIAIS DE ACESSO - ${client?.companyName}

📧 Email: ${credentials.username}
🔑 Senha: ${credentials.password}

⚠️ Esta é uma senha temporária.
   Altere no primeiro acesso em: ${window.location.origin}

🔒 Mantenha estas informações seguras!`;
    
    navigator.clipboard.writeText(fullText);
    toast({
      title: "Credenciais Completas Copiadas",
      description: "Email e senha copiados em formato de mensagem.",
    });
  };

  const handleGenerateNewPassword = async () => {
    if (!client || isGenerating) return;
    
    console.log('Gerando nova senha para cliente:', client.id);
    setIsGenerating(true);
    
    try {
      // Usar a função real de reset de senha
      const result = await onResetPassword(client.id, client.email);
      
      // Verificar se o resultado é um objeto com password e temporaryCredentialId
      if (result && typeof result === 'object' && 'password' in result) {
        setCredentials(prev => ({ ...prev, password: result.password }));
        setTempCredId(result.temporaryCredentialId || null);
      } else if (result && typeof result === 'string') {
        // Fallback para versão antiga que retorna apenas a senha
        setCredentials(prev => ({ ...prev, password: result }));
      }
      
      console.log('Nova senha gerada com sucesso');
      // O toast já é mostrado pela função onResetPassword
    } catch (error) {
      // Erro já tratado pela função onResetPassword  
      console.error('Erro ao resetar senha:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleViewLastPassword = async () => {
    if (!client) return;
    setIsLoadingLast(true);
    
    try {
      // Buscar última credencial gerada por email
      const { data: tempCred, error } = await supabase
        .from('temporary_credentials')
        .select('*')
        .eq('email', client.email.toLowerCase())
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      
      if (!tempCred) {
        toast({
          title: "Nenhuma senha encontrada",
          description: "Não há registro de senhas temporárias para este cliente.",
          variant: "destructive"
        });
        return;
      }
      
      // Descriptografar via Edge Function
      const { data: decrypted, error: decryptError } = await supabase.functions.invoke('decrypt-temp-password', {
        body: { credential_id: tempCred.id }
      });
      
      if (decryptError) throw decryptError;
      
      setCredentials(prev => ({ ...prev, password: decrypted.password }));
      setLastPasswordInfo({
        generated_at: tempCred.generated_at,
        sent_at: tempCred.sent_at
      });
      
      const generatedDate = new Date(tempCred.generated_at).toLocaleString('pt-BR');
      const sentDate = tempCred.sent_at ? new Date(tempCred.sent_at).toLocaleString('pt-BR') : 'Não enviada';
      
      toast({
        title: "Última senha recuperada",
        description: `Gerada em ${generatedDate}\nÚltimo envio: ${sentDate}`,
      });
    } catch (error) {
      console.error('Erro ao recuperar senha:', error);
      toast({
        title: "Erro ao recuperar senha",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setIsLoadingLast(false);
    }
  };

  const handleSendCredentials = async () => {
    if (!client || !onSendCredentials) return;
    
    if (!sendOptions.sendByEmail && !sendOptions.sendByWhatsApp) {
      toast({
        title: "Seleção necessária",
        description: "Selecione pelo menos uma opção de envio.",
        variant: "destructive"
      });
      return;
    }

    if (sendOptions.sendByWhatsApp && !client.phone) {
      toast({
        title: "Telefone necessário",
        description: "Cliente não possui telefone cadastrado para envio via WhatsApp.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSending(true);
    try {
      await onSendCredentials(client.id, {
        email: credentials.username,
        password: credentials.password
      }, sendOptions);
      
      // Atualizar registro de credencial temporária
      // Preferir usar o ID salvo em estado, caso contrário buscar por email
      if (tempCredId) {
        await supabase
          .from('temporary_credentials')
          .update({
            sent_at: new Date().toISOString(),
            sent_by_email: sendOptions.sendByEmail,
            sent_by_whatsapp: sendOptions.sendByWhatsApp,
            status: 'sent'
          })
          .eq('id', tempCredId);
      } else {
        // Fallback: buscar por email
        const { data: latestCred } = await supabase
          .from('temporary_credentials')
          .select('id')
          .eq('email', client.email.toLowerCase())
          .eq('status', 'pending')
          .order('generated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (latestCred) {
          await supabase
            .from('temporary_credentials')
            .update({
              sent_at: new Date().toISOString(),
              sent_by_email: sendOptions.sendByEmail,
              sent_by_whatsapp: sendOptions.sendByWhatsApp,
              status: 'sent'
            })
            .eq('id', latestCred.id);
        }
      }
      
      const methods = [];
      if (sendOptions.sendByEmail) methods.push("e-mail");
      if (sendOptions.sendByWhatsApp) methods.push("WhatsApp");
      
      toast({
        title: "Credenciais enviadas",
        description: `As credenciais foram enviadas por ${methods.join(" e ")}`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível enviar as credenciais.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Credenciais de Acesso - {client.companyName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status do Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Status da Conta
                <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                  {client.status === 'active' ? 'Ativa' : 'Inativa'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{client.email}</span>
              </div>
            </CardContent>
          </Card>

          {/* Histórico de Senhas */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-blue-900 mb-1">Histórico de Senhas Registrado</p>
                  <p className="text-sm text-blue-700 mb-3">
                    Todas as senhas geradas são criptografadas e armazenadas por 7 dias. 
                    Você pode recuperar a última senha caso o cliente não tenha recebido.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleViewLastPassword}
                    disabled={isLoadingLast}
                    className="bg-white hover:bg-blue-50"
                  >
                    <History className="h-4 w-4 mr-2" />
                    {isLoadingLast ? 'Carregando...' : 'Ver Última Senha Enviada'}
                  </Button>
                  {lastPasswordInfo && (
                    <p className="text-xs text-blue-600 mt-2">
                      Última gerada: {new Date(lastPasswordInfo.generated_at).toLocaleString('pt-BR')}
                      {lastPasswordInfo.sent_at && ` • Enviada: ${new Date(lastPasswordInfo.sent_at).toLocaleString('pt-BR')}`}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Credenciais */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Credenciais de Acesso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Nome de Usuário</Label>
                <div className="flex gap-2">
                  <Input
                    id="username"
                    value={credentials.username}
                    readOnly
                    className="bg-muted"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopyToClipboard(credentials.username, 'Nome de usuário')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  Senha Temporária
                  {credentials.temporaryPassword && (
                    <Badge variant="outline" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Temporária
                    </Badge>
                  )}
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={credentials.password}
                      readOnly
                      className="bg-muted pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full w-10"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopyToClipboard(credentials.password, 'Senha')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleGenerateNewPassword}
                    disabled={isGenerating}
                    title="Resetar senha no Supabase"
                  >
                    <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800">Senha Temporária</p>
                    <p className="text-yellow-700">
                      O usuário deve alterar esta senha no primeiro acesso ao sistema.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações de Segurança */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações de Segurança</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Senha gerada com 12 caracteres</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Contém letras maiúsculas, minúsculas e números</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Alteração obrigatória no primeiro acesso</span>
              </div>
            </CardContent>
          </Card>

          {/* Botão de Copiar Tudo */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleCopyAllCredentials}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar Todas as Credenciais
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Copia email e senha em formato de mensagem para envio
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Opções de Envio */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Enviar Credenciais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="send-email"
                checked={sendOptions.sendByEmail}
                onCheckedChange={(checked) => setSendOptions(prev => ({ ...prev, sendByEmail: checked }))}
              />
              <Label htmlFor="send-email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Enviar por E-mail
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="send-whatsapp"
                checked={sendOptions.sendByWhatsApp}
                onCheckedChange={(checked) => setSendOptions(prev => ({ ...prev, sendByWhatsApp: checked }))}
                disabled={!client?.phone}
              />
              <Label htmlFor="send-whatsapp" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Enviar por WhatsApp
                {client?.phone && (
                  <span className="text-xs text-muted-foreground">({client.phone})</span>
                )}
                {!client?.phone && (
                  <span className="text-xs text-muted-foreground">(sem telefone)</span>
                )}
              </Label>
            </div>

            {(sendOptions.sendByEmail || sendOptions.sendByWhatsApp) && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  As credenciais serão enviadas automaticamente quando você clicar em "Enviar Credenciais".
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 pt-4 pb-2 border-t sticky bottom-0 bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Fechar
          </Button>
          <LoadingButton
            variant="default"
            onClick={handleSendCredentials}
            disabled={!onSendCredentials || (!sendOptions.sendByEmail && !sendOptions.sendByWhatsApp)}
            isLoading={isSending}
            loadingText="Enviando..."
          >
            Enviar Credenciais
          </LoadingButton>
        </div>
      </DialogContent>
    </Dialog>
  );
};