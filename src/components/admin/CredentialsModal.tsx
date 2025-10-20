import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, CheckCircle, Eye, EyeOff, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CredentialsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  condominioName: string;
  email: string;
  temporaryPassword: string;
}

export function CredentialsModal({
  open,
  onOpenChange,
  condominioName,
  email,
  temporaryPassword
}: CredentialsModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: `${label} copiado para a área de transferência`
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-success" />
            Condomínio Criado com Sucesso!
          </DialogTitle>
          <DialogDescription>
            O condomínio <strong>{condominioName}</strong> foi criado e as credenciais foram enviadas por e-mail.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">E-mail enviado!</p>
                <p>Um e-mail de boas-vindas com as credenciais foi enviado para <strong>{email}</strong></p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="cred-email">E-mail de Acesso</Label>
              <div className="flex gap-2">
                <Input
                  id="cred-email"
                  value={email}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => copyToClipboard(email, 'E-mail')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cred-password">Senha Temporária</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="cred-password"
                    type={showPassword ? 'text' : 'password'}
                    value={temporaryPassword}
                    readOnly
                    className="font-mono text-sm pr-10"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute right-0 top-0 h-full"
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
                  size="icon"
                  variant="outline"
                  onClick={() => copyToClipboard(temporaryPassword, 'Senha')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
            <p className="font-medium text-amber-900 mb-1">⚠️ Importante:</p>
            <ul className="text-amber-800 space-y-1 text-xs list-disc list-inside">
              <li>O condomínio deverá trocar a senha no primeiro acesso</li>
              <li>Guarde essas credenciais em local seguro</li>
              <li>As credenciais também foram enviadas por e-mail</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>
            Entendi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
