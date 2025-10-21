import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MessageSquare, Send, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ResendCredentialsModalProps {
  open: boolean;
  onClose: () => void;
  user: any;
}

export function ResendCredentialsModal({ open, onClose, user }: ResendCredentialsModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState(user?.phone || '');
  const [newPassword, setNewPassword] = useState('');

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(result);
  };

  React.useEffect(() => {
    if (open && !newPassword) {
      generatePassword();
    }
  }, [open, newPassword]);

  const normalizePhone = (phone: string) => {
    const digits = (phone || '').replace(/\D/g, '');
    if (!digits) return '';
    return digits.startsWith('55') ? digits : `55${digits}`;
  };

  const handleResend = async () => {
    if (!whatsappNumber.trim()) {
      toast.error('Informe o número do WhatsApp');
      return;
    }

    if (!newPassword.trim()) {
      toast.error('Gere uma nova senha');
      return;
    }

    setIsLoading(true);
    try {
      // Reset password first via edge function
      const { data: resetResult, error: resetError } = await supabase.functions.invoke('create-auth-user', {
        body: {
          email: user.email,
          password: newPassword,
          name: user.name,
          role: user.role,
          temporaryPassword: true, // ← Força flag temporaryPassword
          action: 'reset_password'
        }
      });

      if (resetError || !resetResult?.success) {
        throw new Error(resetResult?.error || resetError?.message || 'Erro ao redefinir senha');
      }

      // Verificar resultado do teste de senha
      if (resetResult?.password_test && !resetResult.password_test.ok) {
        console.warn('⚠️ Teste de senha falhou:', resetResult.password_test.error);
        toast.warning('Senha resetada, mas o teste de login falhou. Considere enviar link de recuperação.');
      }

      // Send credentials via WhatsApp
      const normalizedNumber = normalizePhone(whatsappNumber);
      const { data: notifyResult, error: notifyError } = await supabase.functions.invoke('notify', {
        body: {
          type: 'whatsapp_user_credentials',
          to: normalizedNumber,
          user_id: user.id,
          user_name: user.name,
          user_email: user.email,
          temp_password: newPassword,
          app_url: window.location.origin
        }
      });

      if (notifyError) {
        console.error('WhatsApp error:', notifyError);
        throw notifyError;
      }

      if (!notifyResult?.success) {
        throw new Error(notifyResult?.error || 'Falha ao enviar WhatsApp');
      }

      toast.success(`Credenciais reenviadas via WhatsApp para ${whatsappNumber}`);
      onClose();
    } catch (error: any) {
      console.error('Error resending credentials:', error);
      toast.error(`Erro ao reenviar credenciais: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setNewPassword('');
    setWhatsappNumber(user?.phone || '');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Reenviar Credenciais
          </DialogTitle>
          <DialogDescription>
            Gere uma nova senha e envie as credenciais via WhatsApp para <strong>{user?.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">E-mail do usuário</label>
            <Input
              value={user?.email || ''}
              disabled
              className="bg-muted"
            />
          </div>

          <div>
            <label className="text-sm font-medium">WhatsApp *</label>
            <Input
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="+55 11 99999-0000"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Número será normalizado automaticamente com código do país (55)
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">Nova senha temporária</label>
            <div className="flex gap-2">
              <Input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Senha gerada automaticamente"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={generatePassword}
                title="Gerar nova senha"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-blue-900">Atenção</div>
                <div className="text-blue-700 mt-1">
                  • A senha atual será substituída pela nova senha temporária<br />
                  • O usuário precisará alterar a senha no primeiro login<br />
                  • As credenciais serão enviadas via WhatsApp
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleResend} disabled={isLoading}>
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Reenviar via WhatsApp
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}