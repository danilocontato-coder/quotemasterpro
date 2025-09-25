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
  Shield,
  UserPlus,
  Building2
} from 'lucide-react';
import { useSupplierUsers } from '@/hooks/useSupplierUsers';
import { toast } from 'sonner';

interface CreateSupplierUserModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateSupplierUserModal({ open, onClose }: CreateSupplierUserModalProps) {
  const { createUser, permissionProfiles } = useSupplierUsers();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'collaborator' as 'manager' | 'collaborator' | 'supplier',
    permission_profile_id: '',
    password: ''
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Por favor, insira um e-mail válido');
      return;
    }

    setLoading(true);
    try {
      await createUser({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        role: formData.role,
        permission_profile_id: formData.permission_profile_id || null,
        password: formData.password
      });
      
      onClose();
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: 'collaborator',
        permission_profile_id: '',
        password: ''
      });
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'collaborator',
      permission_profile_id: '',
      password: ''
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Novo Usuário
          </DialogTitle>
          <DialogDescription>
            Adicione um novo usuário à sua empresa. Um e-mail com as credenciais será enviado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
              <TabsTrigger value="permissions">Permissões</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="h-4 w-4" />
                    Informações Pessoais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">
                        Nome Completo <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Nome do usuário"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">
                        E-mail <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="usuario@empresa.com"
                          className="pl-10"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="(11) 99999-9999"
                          className="pl-10"
                          value={formData.phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">
                        Função <span className="text-destructive">*</span>
                      </Label>
                      <Select 
                        value={formData.role} 
                        onValueChange={(value: 'manager' | 'collaborator' | 'supplier') => 
                          setFormData(prev => ({ ...prev, role: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a função" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="supplier">Fornecedor Principal</SelectItem>
                          <SelectItem value="manager">Gerente</SelectItem>
                          <SelectItem value="collaborator">Colaborador</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="password">
                        Senha Inicial <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Digite uma senha inicial (mín. 6 caracteres)"
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        required
                      />
                      <p className="text-sm text-muted-foreground">
                        O usuário será obrigado a alterar a senha no primeiro login
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="permissions" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="h-4 w-4" />
                    Controle de Acesso
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="permission_profile">Perfil de Permissão</Label>
                    <Select 
                      value={formData.permission_profile_id} 
                      onValueChange={(value) => 
                        setFormData(prev => ({ ...prev, permission_profile_id: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um perfil de permissão" />
                      </SelectTrigger>
                      <SelectContent>
                        {permissionProfiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.name}
                            {profile.description && (
                              <span className="text-muted-foreground ml-2">
                                - {profile.description}
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Se não selecionado, o usuário terá permissões básicas baseadas na função.
                    </p>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2">Informações sobre Funções:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li><strong>Gerente:</strong> Acesso completo aos recursos da empresa</li>
                      <li><strong>Colaborador:</strong> Acesso limitado baseado nas permissões</li>
                      <li><strong>Fornecedor:</strong> Acesso específico para operações de fornecimento</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}