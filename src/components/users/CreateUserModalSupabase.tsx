import React, { useState, useEffect } from 'react';
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
import { useSupabaseUsers, SupabaseUser } from '@/hooks/useSupabaseUsers';
import { useSupabaseSubscriptionGuard } from '@/hooks/useSupabaseSubscriptionGuard';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateUserModal({ open, onClose }: CreateUserModalProps) {
  const { createUser, generateTemporaryPassword, groups } = useSupabaseUsers();
  const { enforceLimit } = useSupabaseSubscriptionGuard();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '' as SupabaseUser['role'] | '',
    status: 'active' as SupabaseUser['status'],
    client_id: '',
    supplier_id: '',
    groups: [] as string[],
    generateCredentials: true,
    username: '',
    password: '',
    force_password_change: true
  });

  const [showPassword, setShowPassword] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);

  useEffect(() => {
    if (formData.generateCredentials && formData.email) {
      const username = formData.email.split('@')[0];
      setFormData(prev => ({
        ...prev,
        username,
        // Só gera nova senha se não existir uma
        password: prev.password || generateTemporaryPassword()
      }));
    }
  }, [formData.email, formData.generateCredentials, generateTemporaryPassword]);

const resetForm = () => {
  setFormData({
    name: '',
    email: '',
    phone: '',
    role: '',
    status: 'active',
    client_id: '',
    supplier_id: '',
    groups: [],
    generateCredentials: true,
    username: '',
    password: '',
    force_password_change: true
  });
  setPasswordCopied(false);
};

const normalizePhone = (phone: string) => {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('55') ? digits : `55${digits}`;
};

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.role) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Verificar limite de usuários antes de criar
    if (!enforceLimit('CREATE_USER')) {
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Digite um e-mail válido');
      return;
    }

    try {
      const userData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        role: formData.role as SupabaseUser['role'],
        status: formData.status,
        client_id: formData.client_id || undefined,
        supplier_id: formData.supplier_id || undefined,
        force_password_change: formData.force_password_change,
        groups: formData.groups,
        password: formData.generateCredentials ? formData.password : undefined
      };

      const created = await createUser(userData);
      
      if (!created) {
        // Se a criação falhou, não continue com o fluxo
        return;
      }

      // Enviar credenciais via WhatsApp, se houver telefone e credenciais geradas
      if (formData.generateCredentials && formData.password && formData.phone) {
        const to = normalizePhone(formData.phone);
        try {
          const { data: notifyRes, error } = await supabase.functions.invoke('notify', {
            body: {
              type: 'whatsapp_user_credentials',
              to,
              user_id: created?.id,
              user_name: formData.name,
              user_email: formData.email,
              temp_password: formData.password,
              app_url: window.location.origin
            }
          });
          if (error) {
            console.error('WhatsApp error:', error);
            throw error;
          }
          if (!notifyRes?.success) {
            throw new Error(notifyRes?.error || 'Falha ao enviar WhatsApp');
          }
          toast.success(`Credenciais enviadas via WhatsApp para ${formData.phone}`);
        } catch (err) {
          console.error('Erro ao enviar WhatsApp:', err);
          toast.error('Usuário criado, mas houve falha ao enviar as credenciais por WhatsApp');
        }
      }
      
      toast.success(`Usuário ${formData.name} criado com sucesso!`);
      resetForm();
      onClose();
    } catch (error) {
      // Error is handled in the hook
      console.error('Error in handleSubmit:', error);
    }
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

  const getDefaultGroupsForRole = (role: SupabaseUser['role']) => {
    const roleGroupMap = {
      admin: ['Administradores'],
      manager: ['Gestores'],
      collaborator: ['Colaboradores'],
      supplier: ['Fornecedores']
    };
    return roleGroupMap[role] || [];
  };

  const handleRoleChange = (role: string) => {
    const defaultGroups = getDefaultGroupsForRole(role as SupabaseUser['role']);
    setFormData(prev => ({
      ...prev,
      role: role as SupabaseUser['role'],
      groups: defaultGroups
    }));
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
                <p className="text-xs text-muted-foreground mt-1">
                  Se informado, as credenciais de acesso serão enviadas via WhatsApp para este número.
                </p>
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
                    <div className="text-sm font-medium mb-2">Grupos Selecionados:</div>
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
                      Criar usuário e senha automaticamente baseado no e-mail
                    </div>
                  </div>
                  <Switch
                    checked={formData.generateCredentials}
                    onCheckedChange={(checked) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        generateCredentials: checked,
                        // Clear password when disabling auto-generation
                        password: checked ? prev.password : '',
                        username: checked ? prev.username : ''
                      }));
                    }}
                  />
                </div>

                {formData.generateCredentials && (
                  <div className="space-y-4 p-4 bg-muted rounded-lg">
                    <div>
                      <label className="text-sm font-medium">E-mail de Acesso</label>
                      <Input
                        type="email"
                        value={formData.email}
                        disabled
                        className="bg-background"
                        placeholder="Preencha o e-mail na aba Informações Básicas"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Este será o e-mail usado para login. Defina-o na aba "Informações Básicas".
                      </p>
                    </div>

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
                        checked={formData.force_password_change}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, force_password_change: checked }))}
                      />
                    </div>

                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div className="text-sm">
                          <div className="font-medium text-blue-900">Credenciais Geradas</div>
                          <div className="text-blue-700 mt-1">
                            <strong>Usuário:</strong> {formData.email}<br />
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