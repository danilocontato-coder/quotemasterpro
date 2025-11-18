import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Shield, AlertTriangle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RoleManagementModalProps {
  open: boolean;
  onClose: () => void;
  user: {
    id: string;
    email: string;
    name: string;
    roles: string[];
  };
}

const availableRoles = [
  { value: 'super_admin', label: 'Super Admin', description: 'Acesso total ao sistema' },
  { value: 'admin', label: 'Admin', description: 'Gestão completa da plataforma' },
  { value: 'admin_cliente', label: 'Admin Cliente', description: 'Administrador do cliente/condomínio' },
  { value: 'manager', label: 'Gerente', description: 'Gestão de cotações e aprovações' },
  { value: 'collaborator', label: 'Colaborador', description: 'Criação e edição de cotações' },
  { value: 'supplier', label: 'Fornecedor', description: 'Responder cotações' },
  { value: 'support', label: 'Suporte', description: 'Atendimento ao cliente' },
];

export function RoleManagementModal({ open, onClose, user }: RoleManagementModalProps) {
  const { user: currentUser } = useAuth();
  const [selectedRoles, setSelectedRoles] = useState<string[]>(user.roles);
  const [saving, setSaving] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    setSelectedRoles(user.roles);
    validateChanges(user.roles);
  }, [user.roles]);

  const validateChanges = (newRoles: string[]) => {
    const newWarnings: string[] = [];

    // Não pode remover próprio admin
    if (currentUser?.id === user.id) {
      const hasAdmin = newRoles.includes('admin') || newRoles.includes('super_admin');
      const hadAdmin = user.roles.includes('admin') || user.roles.includes('super_admin');
      
      if (hadAdmin && !hasAdmin) {
        newWarnings.push('⚠️ Você não pode remover sua própria permissão de admin');
      }
    }

    // Aviso se remover todos os roles
    if (newRoles.length === 0) {
      newWarnings.push('⚠️ Usuário ficará sem nenhuma permissão no sistema');
    }

    setWarnings(newWarnings);
  };

  const handleRoleToggle = (role: string) => {
    const newRoles = selectedRoles.includes(role)
      ? selectedRoles.filter((r) => r !== role)
      : [...selectedRoles, role];

    setSelectedRoles(newRoles);
    validateChanges(newRoles);
  };

  const handleSave = async () => {
    // Validações críticas
    if (currentUser?.id === user.id) {
      const hasAdmin = selectedRoles.includes('admin') || selectedRoles.includes('super_admin');
      const hadAdmin = user.roles.includes('admin') || user.roles.includes('super_admin');
      
      if (hadAdmin && !hasAdmin) {
        toast.error('Você não pode remover sua própria permissão de admin');
        return;
      }
    }

    setSaving(true);

    try {
      const rolesToAdd = selectedRoles.filter((r) => !user.roles.includes(r));
      const rolesToRemove = user.roles.filter((r) => !selectedRoles.includes(r));

      // Chamar Edge Function para gerenciar roles com validações
      const { data, error } = await supabase.functions.invoke('manage-user-roles', {
        body: {
          userId: user.id,
          rolesToAdd,
          rolesToRemove,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Roles atualizados com sucesso');
        onClose();
      } else {
        throw new Error(data?.error || 'Erro ao atualizar roles');
      }
    } catch (error: any) {
      console.error('Erro ao salvar roles:', error);
      toast.error(error.message || 'Erro ao atualizar roles');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Gerenciar Roles - {user.name}
          </DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warnings */}
          {warnings.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {warnings.map((warning, index) => (
                    <li key={index} className="text-sm">
                      {warning}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Roles List */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Selecione os Roles</Label>
            <div className="space-y-3 border rounded-lg p-4">
              {availableRoles.map((role) => (
                <div key={role.value} className="flex items-start space-x-3">
                  <Checkbox
                    id={role.value}
                    checked={selectedRoles.includes(role.value)}
                    onCheckedChange={() => handleRoleToggle(role.value)}
                  />
                  <div className="grid gap-1 leading-none">
                    <Label
                      htmlFor={role.value}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {role.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {role.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Current vs New */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm font-medium mb-2">Roles Atuais:</p>
              <div className="flex flex-wrap gap-1">
                {user.roles.length === 0 ? (
                  <span className="text-sm text-muted-foreground">Nenhum</span>
                ) : (
                  user.roles.map((role) => (
                    <span
                      key={role}
                      className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded"
                    >
                      {availableRoles.find((r) => r.value === role)?.label || role}
                    </span>
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Novos Roles:</p>
              <div className="flex flex-wrap gap-1">
                {selectedRoles.length === 0 ? (
                  <span className="text-sm text-muted-foreground">Nenhum</span>
                ) : (
                  selectedRoles.map((role) => (
                    <span
                      key={role}
                      className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded"
                    >
                      {availableRoles.find((r) => r.value === role)?.label || role}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || warnings.length > 0}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
