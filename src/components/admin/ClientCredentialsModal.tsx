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
  MessageSquare
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

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
  onResetPassword: (clientId: string, email: string) => Promise<string>;
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
  const [sendOptions, setSendOptions] = useState({
    sendByEmail: true,
    sendByWhatsApp: false
  });
  const { toast } = useToast();

  React.useEffect(() => {
    if (client && open) {
      // Usar o email como username em vez do código gerado
      const username = client.email;
      const password = onGeneratePassword();
      setCredentials({
        username,
        password,
        temporaryPassword: true
      });
    }
  }, [client, open, onGeneratePassword]);

  const handleCopyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: `${type} copiado para a área de transferência.`,
    });
  };

  const handleGenerateNewPassword = async () => {
    if (!client || isGenerating) return;
    
    console.log('Gerando nova senha para cliente:', client.id);
    setIsGenerating(true);
    
    try {
      // Usar a função real de reset de senha
      const newPassword = await onResetPassword(client.id, client.email);
      setCredentials(prev => ({ ...prev, password: newPassword }));
      console.log('Nova senha gerada com sucesso');
      // O toast já é mostrado pela função onResetPassword
    } catch (error) {
      // Erro já tratado pela função onResetPassword  
      console.error('Erro ao resetar senha:', error);
    } finally {
      setIsGenerating(false);
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