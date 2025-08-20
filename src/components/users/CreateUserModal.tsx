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
  Mail, 
  Phone, 
  Key, 
  Users, 
  Shield,
  Eye,
  EyeOff,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import { useUsers, useUserGroups, User as UserType } from '@/hooks/useUsersAndGroups';
import { toast } from 'sonner';

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateUserModal({ open, onClose }: CreateUserModalProps) {
  const { createUser, generateTemporaryPassword, generateUsername } = useUsers();
  const { groups, getGroupsByIds } = useUserGroups();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '' as UserType['role'] | '',
    status: 'active' as UserType['status'],
    client: '',
    supplier: '',
    groupIds: [] as string[],
    generateCredentials: true,
    username: '',
    password: '',
    mustChangePassword: true
  });

  const [showPassword, setShowPassword] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);

  React.useEffect(() => {
    if (formData.generateCredentials && formData.name && formData.email) {
      const username = generateUsername(formData.name, formData.email);
      const password = generateTemporaryPassword();
      setFormData(prev => ({
        ...prev,
        username,
        password
      }));
    }
  }, [formData.name, formData.email, formData.generateCredentials, generateUsername, generateTemporaryPassword]);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: '',
      status: 'active',
      client: '',
      supplier: '',
      groupIds: [],
      generateCredentials: true,
      username: '',
      password: '',
      mustChangePassword: true
    });
    setPasswordCopied(false);
  };

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.role) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const userData: Omit<UserType, "id" | "createdAt" | "lastAccess"> = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone || undefined,
      role: formData.role as UserType['role'],
      status: formData.status,
      client: formData.client || undefined,
      supplier: formData.supplier || undefined,
      groupIds: formData.groupIds,
      mustChangePassword: formData.mustChangePassword
    };

    if (formData.generateCredentials) {
      userData.loginCredentials = {
        username: formData.username,
        password: formData.password,
        lastPasswordChange: new Date().toISOString()
      };
      
      if (formData.mustChangePassword) {
        userData.temporaryPassword = formData.password;
      }
    }

    createUser(userData);
    toast.success('Usuário criado com sucesso');
    onClose();
    resetForm();
  };

  const handleGenerateNewPassword = () => {
    const newPassword = generateTemporaryPassword();
    setFormData(prev => ({ ...prev, password: newPassword }));
    setPasswordCopied(false);
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(formData.password);
      setPasswordCopied(true);
      toast.success('Senha copiada para a área de transferência');
      setTimeout(() => setPasswordCopied(false), 2000);
    } catch (error) {
      toast.error('Erro ao copiar senha');
    }
  };

  const getDefaultGroupsForRole = (role: UserType['role']) => {
    const roleGroupMap = {
      admin: ['group-admins'],
      manager: ['group-managers'],
      collaborator: ['group-collaborators'],
      supplier: ['group-suppliers']
    };
    return roleGroupMap[role] || [];
  };

  const handleRoleChange = (role: string) => {
    const defaultGroups = getDefaultGroupsForRole(role as UserType['role']);
    setFormData(prev => ({
      ...prev,
      role: role as UserType['role'],
      groupIds: defaultGroups
    }));
  };

  const handleGroupToggle = (groupId: string) => {
    setFormData(prev => ({
      ...prev,
      groupIds: prev.groupIds.includes(groupId)
        ? prev.groupIds.filter(id => id !== groupId)
        : [...prev.groupIds, groupId]
    }));
  };

  const selectedGroups = getGroupsByIds(formData.groupIds);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Criar Novo Usuário
          </DialogTitle>
          <DialogDescription>
            Preencha as informações do usuário e configure suas permissões de acesso
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Informações Básicas</TabsTrigger>
            <TabsTrigger value="access">Acesso e Grupos</TabsTrigger>
            <TabsTrigger value="credentials">Credenciais</TabsTrigger>
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
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as UserType['status'] }))}
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
              <Select value={formData.role} onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o papel do usuário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="manager">Gestor</SelectItem>
                  <SelectItem value="collaborator">Colaborador</SelectItem>
                  <SelectItem value="supplier">Fornecedor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(formData.role === 'manager' || formData.role === 'collaborator') && (
              <div>
                <label className="text-sm font-medium">Cliente/Condomínio</label>
                <Input
                  value={formData.client}
                  onChange={(e) => setFormData(prev => ({ ...prev, client: e.target.value }))}
                  placeholder="Ex: Condomínio Azul"
                />
              </div>
            )}

            {formData.role === 'supplier' && (
              <div>
                <label className="text-sm font-medium">Empresa Fornecedora</label>
                <Input
                  value={formData.supplier}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                  placeholder="Ex: Fornecedor Alpha"
                />
              </div>
            )}
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
                        {group.isSystem && (
                          <Badge variant="outline" className="text-xs">Sistema</Badge>
                        )}
                      </div>
                      <Switch
                        checked={formData.groupIds.includes(group.id)}
                        onCheckedChange={() => handleGroupToggle(group.id)}
                      />
                    </div>
                  ))}
                </div>

                {selectedGroups.length > 0 && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <div className="text-sm font-medium mb-2">Grupos Selecionados:</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedGroups.map(group => (
                        <Badge key={group.id} style={{ backgroundColor: group.color, color: 'white' }}>
                          {group.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="credentials" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Key className="h-4 w-4" />
                  Credenciais de Acesso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Gerar credenciais automaticamente</div>
                    <div className="text-sm text-muted-foreground">
                      Criar usuário e senha automaticamente baseado no nome
                    </div>
                  </div>
                  <Switch
                    checked={formData.generateCredentials}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, generateCredentials: checked }))}
                  />
                </div>

                {formData.generateCredentials && (
                  <div className="space-y-4 p-4 bg-muted rounded-lg">
                    <div>
                      <label className="text-sm font-medium">Nome de Usuário</label>
                      <Input
                        value={formData.username}
                        onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                        placeholder="usuario.nome"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Senha Temporária</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                            placeholder="Senha gerada automaticamente"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleGenerateNewPassword}
                          title="Gerar nova senha"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleCopyPassword}
                          title="Copiar senha"
                        >
                          {passwordCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">Forçar alteração de senha</div>
                        <div className="text-xs text-muted-foreground">
                          Usuário deverá alterar a senha no primeiro login
                        </div>
                      </div>
                      <Switch
                        checked={formData.mustChangePassword}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, mustChangePassword: checked }))}
                      />
                    </div>

                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div className="text-sm">
                          <div className="font-medium text-blue-900">Credenciais Geradas</div>
                          <div className="text-blue-700 mt-1">
                            <strong>Usuário:</strong> {formData.username}<br />
                            <strong>Senha:</strong> {formData.password}
                          </div>
                          <div className="text-xs text-blue-600 mt-2">
                            Certifique-se de compartilhar essas credenciais com segurança
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            Criar Usuário
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}