import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertCircle, Eye, EyeOff, RefreshCw, Key } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ResetPasswordModalProps {
  open: boolean;
  onClose: () => void;
  userName: string;
  onResetAutomatic: () => Promise<string>;
  onResetCustom: (password: string) => Promise<void>;
}

export function ResetPasswordModal({ 
  open, 
  onClose, 
  userName,
  onResetAutomatic,
  onResetCustom
}: ResetPasswordModalProps) {
  const [customPassword, setCustomPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'automatic' | 'custom'>('automatic');

  const handleClose = () => {
    setCustomPassword('');
    setConfirmPassword('');
    setError('');
    setActiveTab('automatic');
    onClose();
  };

  const handleAutomaticReset = async () => {
    setIsLoading(true);
    setError('');
    try {
      await onResetAutomatic();
      handleClose();
    } catch (err) {
      setError('Erro ao gerar senha temporária');
    } finally {
      setIsLoading(false);
    }
  };

  const validateCustomPassword = () => {
    if (!customPassword.trim()) {
      setError('Informe a nova senha');
      return false;
    }
    if (customPassword.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return false;
    }
    if (customPassword !== confirmPassword) {
      setError('As senhas não conferem');
      return false;
    }
    return true;
  };

  const handleCustomReset = async () => {
    setError('');
    
    if (!validateCustomPassword()) {
      return;
    }

    setIsLoading(true);
    try {
      await onResetCustom(customPassword);
      handleClose();
    } catch (err) {
      setError('Erro ao definir nova senha');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Redefinir Senha
          </DialogTitle>
          <DialogDescription>
            Redefinir senha para o usuário <span className="font-semibold">{userName}</span>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'automatic' | 'custom')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="automatic">Senha Automática</TabsTrigger>
            <TabsTrigger value="custom">Senha Personalizada</TabsTrigger>
          </TabsList>

          <TabsContent value="automatic" className="space-y-4">
            {error && activeTab === 'automatic' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <RefreshCw className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-blue-900 mb-1">Senha Temporária</div>
                  <div className="text-blue-700">
                    Uma senha temporária será gerada automaticamente e exibida para você copiar.
                    O usuário será obrigado a alterar a senha no próximo login.
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancelar
              </Button>
              <Button 
                onClick={handleAutomaticReset} 
                disabled={isLoading}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                {isLoading ? 'Gerando...' : 'Gerar Senha'}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            {error && activeTab === 'custom' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customPassword">Nova Senha *</Label>
                <div className="relative">
                  <Input
                    id="customPassword"
                    type={showPassword ? "text" : "password"}
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    placeholder="Digite a nova senha (mín. 6 caracteres)"
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Digite novamente a nova senha"
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirm(!showConfirm)}
                    tabIndex={-1}
                  >
                    {showConfirm ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium text-amber-900 mb-1">Requisitos da senha:</div>
                    <ul className="text-amber-700 space-y-1">
                      <li>• Mínimo de 6 caracteres</li>
                      <li>• Recomendamos usar letras, números e símbolos</li>
                      <li>• O usuário poderá usar esta senha imediatamente</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCustomReset} 
                disabled={isLoading}
                className="gap-2"
              >
                <Key className="h-4 w-4" />
                {isLoading ? 'Definindo...' : 'Definir Senha'}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
