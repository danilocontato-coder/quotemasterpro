import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingButton } from '@/components/ui/loading-button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Copy, CheckCircle2, Mail, Shield, User } from 'lucide-react';

interface AddCondominioUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  condominioId: string;
  condominioName: string;
  condominioEmail: string;
  administradoraName: string;
  onSuccess: () => void;
}

interface CreatedUserData {
  email: string;
  temporaryPassword: string;
  name: string;
  role: string;
}

export function AddCondominioUserModal({
  open,
  onOpenChange,
  condominioId,
  condominioName,
  condominioEmail,
  administradoraName,
  onSuccess,
}: AddCondominioUserModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [createdUser, setCreatedUser] = useState<CreatedUserData | null>(null);
  const [copied, setCopied] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'manager' | 'collaborator'>('collaborator');

  const resetForm = () => {
    setName('');
    setEmail('');
    setRole('collaborator');
    setCreatedUser(null);
    setCopied(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleCopyPassword = async () => {
    if (createdUser?.temporaryPassword) {
      await navigator.clipboard.writeText(createdUser.temporaryPassword);
      setCopied(true);
      toast({
        title: 'Senha copiada',
        description: 'A senha temporária foi copiada para a área de transferência.',
      });
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o nome e email do usuário.',
        variant: 'destructive',
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: 'Email inválido',
        description: 'Por favor, insira um email válido.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-condominio-user', {
        body: {
          condominioId,
          condominioName,
          condominioEmail: condominioEmail || email, // Fallback to user email if condominio has no email
          administradoraName,
          userName: name,
          userEmail: email,
          userRole: role,
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      setCreatedUser({
        email: data.user.email,
        temporaryPassword: data.temporaryPassword,
        name: name,
        role: role,
      });

      toast({
        title: 'Usuário criado com sucesso',
        description: `${name} foi adicionado ao condomínio.`,
      });

      onSuccess();
    } catch (err: any) {
      console.error('Error creating user:', err);
      toast({
        title: 'Erro ao criar usuário',
        description: err.message || 'Não foi possível criar o usuário. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleLabel = (r: string) => {
    return r === 'manager' ? 'Gestor' : 'Colaborador';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            {createdUser ? 'Usuário Criado' : 'Adicionar Usuário'}
          </DialogTitle>
          <DialogDescription>
            {createdUser
              ? 'O usuário foi criado com sucesso. Compartilhe as credenciais abaixo.'
              : `Adicionar novo usuário ao ${condominioName}`}
          </DialogDescription>
        </DialogHeader>

        {createdUser ? (
          // Success state - show credentials
          <div className="space-y-4 py-4">
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Usuário criado com sucesso!</span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Nome:</span>
                  <span className="font-medium">{createdUser.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{createdUser.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Cargo:</span>
                  <span className="font-medium">{getRoleLabel(createdUser.role)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Senha Temporária</Label>
              <div className="flex gap-2">
                <Input
                  value={createdUser.temporaryPassword}
                  readOnly
                  className="font-mono bg-muted"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyPassword}
                  className="shrink-0"
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                O usuário receberá um email com as credenciais de acesso. Recomende que altere a senha no primeiro login.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleClose}>Fechar</Button>
            </div>
          </div>
        ) : (
          // Form state
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                placeholder="Digite o nome do usuário"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Cargo</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as 'manager' | 'collaborator')}
                disabled={isLoading}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Selecione o cargo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">
                    <div className="flex flex-col items-start">
                      <span>Gestor</span>
                      <span className="text-xs text-muted-foreground">
                        Pode aprovar cotações e gerenciar fornecedores
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="collaborator">
                    <div className="flex flex-col items-start">
                      <span>Colaborador</span>
                      <span className="text-xs text-muted-foreground">
                        Pode criar cotações e visualizar dados
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <LoadingButton type="submit" isLoading={isLoading} loadingText="Criando...">
                <UserPlus className="h-4 w-4 mr-2" />
                Criar Usuário
              </LoadingButton>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
