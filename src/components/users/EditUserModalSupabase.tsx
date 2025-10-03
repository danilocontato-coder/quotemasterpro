import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Users, 
  Shield,
  Key,
  RefreshCw
} from 'lucide-react';
import { useSupabaseUsers, SupabaseUser } from '@/hooks/useSupabaseUsers';
import { toast } from 'sonner';
import { ResetPasswordModal } from './ResetPasswordModal';
import { supabase } from '@/integrations/supabase/client';

interface EditUserModalProps {
  open: boolean;
  onClose: () => void;
  user: SupabaseUser;
}

export function EditUserModal({ open, onClose, user }: EditUserModalProps) {
  const { updateUser, resetPassword, groups } = useSupabaseUsers();
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    role: user?.role || '' as SupabaseUser['role'],
    status: user?.status || 'active' as SupabaseUser['status'],
    client_id: user?.client_id || '',
    supplier_id: user?.supplier_id || '',
    groups: user?.groups || [] as string[],
    force_password_change: user?.force_password_change || false
  });

  React.useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        status: user.status,
        client_id: user.client_id || '',
        supplier_id: user.supplier_id || '',
        groups: user.groups || [],
        force_password_change: user.force_password_change
      });
    }
  }, [user]);

  // Load current user's role
  React.useEffect(() => {
    const loadCurrentUserRole = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', authUser.id)
            .single();
          
          if (profile) {
            setCurrentUserRole(profile.role);
          }
        }
      } catch (error) {
        console.error('Error loading current user role:', error);
      }
    };
    loadCurrentUserRole();
  }, []);

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Nome e e-mail são obrigatórios');
      return;
    }

    console.log('=== MODAL: Iniciando handleSubmit ===', formData);

    try {
      await updateUser(user.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        role: formData.role,
        status: formData.status,
        client_id: formData.client_id || undefined,
        supplier_id: formData.supplier_id || undefined,
        groups: formData.groups,
        force_password_change: formData.force_password_change
      });

      console.log('=== MODAL: Update concluído, fechando modal ===');
      onClose();
    } catch (error) {
      console.error('=== MODAL: Erro no handleSubmit ===', error);
      // Error is handled in the hook
    }
  };

  const handleResetPasswordAutomatic = async () => {
    try {
      const newPassword = await resetPassword(user.id);
      toast.success(`Nova senha temporária gerada: ${newPassword}`, {
        description: 'Copie esta senha e envie ao usuário. Ele será obrigado a alterá-la no próximo login.',
        duration: 10000
      });
      return newPassword;
    } catch (error: any) {
      toast.error('Erro ao gerar senha: ' + (error?.message || 'Tente novamente'));
      throw error;
    }
  };

  const handleResetPasswordCustom = async (customPassword: string) => {
    try {
      await resetPassword(user.id, customPassword);
      toast.success('Senha redefinida com sucesso', {
        description: 'O usuário pode utilizar a nova senha imediatamente.'
      });
    } catch (error: any) {
      toast.error('Erro ao definir senha: ' + (error?.message || 'Tente novamente'));
      throw error;
    }
  };

  const handleGroupToggle = (groupName: string) => {
    setFormData(prev => ({
      ...prev,
      groups: prev.groups.includes(groupName)
        ? prev.groups.filter(name => name !== groupName)
        : [...prev.groups, groupName]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Editar Usuário
          </DialogTitle>
          <DialogDescription>
            Altere as informações e permissões do usuário {user?.name}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Informações Básicas</TabsTrigger>
            <TabsTrigger value="access">Acesso e Grupos</TabsTrigger>
            <TabsTrigger value="security">Segurança</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Nome Completo *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="João Silva"
                />
              </div>
              <div>
                <label className="text-sm font-medium">E-mail *</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="joao.silva@empresa.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Telefone</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+55 11 99999-0000"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as SupabaseUser['status'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Papel/Função *</label>
              <Select 
                value={formData.role} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as SupabaseUser['role'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="manager">Gestor</SelectItem>
                  <SelectItem value="collaborator">Colaborador</SelectItem>
                  <SelectItem value="supplier">Fornecedor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="access" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4" />
                  Grupos de Usuário
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {groups.map(group => (
                    <div key={group.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: group.color }}
                        />
                        <div>
                          <div className="font-medium text-sm">{group.name}</div>
                          <div className="text-xs text-muted-foreground">{group.description}</div>
                        </div>
                        {group.is_system_group && (
                          <Badge variant="outline" className="text-xs">Sistema</Badge>
                        )}
                      </div>
                      <Switch
                        checked={formData.groups.includes(group.name)}
                        onCheckedChange={() => handleGroupToggle(group.name)}
                      />
                    </div>
                  ))}
                </div>

                {formData.groups.length > 0 && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <div className="text-sm font-medium mb-2">Grupos Ativos:</div>
                    <div className="flex flex-wrap gap-2">
                      {formData.groups.map(groupName => {
                        const group = groups.find(g => g.name === groupName);
                        return (
                          <Badge key={groupName} style={{ backgroundColor: group?.color || '#3b82f6', color: 'white' }}>
                            {groupName}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Key className="h-4 w-4" />
                  Configurações de Segurança
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">Status da Conta</div>
                    <div className="text-sm text-muted-foreground">
                      {formData.status === 'active' ? 'Usuário ativo no sistema' : 'Usuário desativado'}
                    </div>
                  </div>
                  <Badge variant={formData.status === 'active' ? 'default' : 'secondary'}>
                    {formData.status === 'active' ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>

                {(currentUserRole === 'admin' || currentUserRole === 'manager') && (
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Forçar alteração de senha</div>
                      <div className="text-sm text-muted-foreground">
                        Usuário deverá alterar a senha no próximo login
                      </div>
                    </div>
                    <Switch
                      checked={formData.force_password_change}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, force_password_change: checked }))}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">Redefinir Senha</div>
                    <div className="text-sm text-muted-foreground">
                      Gerar senha temporária ou definir senha personalizada
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowResetPasswordModal(true)}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Nova Senha
                  </Button>
                </div>

                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div className="text-sm">
                      <div className="font-medium text-yellow-900">Aviso de Segurança</div>
                      <div className="text-yellow-700 mt-1">
                        Alterações de segurança serão registradas no log de auditoria do sistema
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>

      <ResetPasswordModal
        open={showResetPasswordModal}
        onClose={() => setShowResetPasswordModal(false)}
        userName={user?.name || ''}
        onResetAutomatic={handleResetPasswordAutomatic}
        onResetCustom={handleResetPasswordCustom}
      />
    </Dialog>
  );
}