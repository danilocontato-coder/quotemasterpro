import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  FileText, 
  Package2, 
  Users, 
  DollarSign,
  MessageSquare,
  Settings,
  BarChart3,
  Plus,
  Edit
} from 'lucide-react';
import { useSupplierUsers, SupplierPermissionProfile } from '@/hooks/useSupplierUsers';
import { toast } from 'sonner';

interface SupplierUserPermissionsModalProps {
  open: boolean;
  onClose: () => void;
  profile?: SupplierPermissionProfile | null;
}

const defaultPermissions = {
  quotes: {
    view: false,
    create: false,
    edit: false,
    delete: false,
    approve: false
  },
  products: {
    view: false,
    create: false,
    edit: false,
    delete: false,
    manage_stock: false
  },
  users: {
    view: false,
    create: false,
    edit: false,
    delete: false
  },
  receivables: {
    view: false,
    create: false,
    edit: false
  },
  communication: {
    view: false,
    create: false,
    edit: false
  },
  settings: {
    view: false,
    edit: false
  },
  reports: {
    view: false,
    export: false
  }
};

const moduleIcons = {
  quotes: FileText,
  products: Package2,
  users: Users,
  receivables: DollarSign,
  communication: MessageSquare,
  settings: Settings,
  reports: BarChart3
};

const moduleLabels = {
  quotes: 'Cotações',
  products: 'Produtos',
  users: 'Usuários',
  receivables: 'Recebimentos',
  communication: 'Comunicação',
  settings: 'Configurações',
  reports: 'Relatórios'
};

const actionLabels = {
  view: 'Visualizar',
  create: 'Criar',
  edit: 'Editar',
  delete: 'Excluir',
  approve: 'Aprovar',
  manage_stock: 'Gerenciar Estoque',
  export: 'Exportar'
};

export function SupplierUserPermissionsModal({ open, onClose, profile }: SupplierUserPermissionsModalProps) {
  const { createPermissionProfile, updatePermissionProfile } = useSupplierUsers();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: defaultPermissions
  });

  const [loading, setLoading] = useState(false);
  const isEditing = !!profile;

  useEffect(() => {
    if (profile && open) {
      setFormData({
        name: profile.name || '',
        description: profile.description || '',
        permissions: { ...defaultPermissions, ...profile.permissions }
      });
    } else if (open) {
      setFormData({
        name: '',
        description: '',
        permissions: defaultPermissions
      });
    }
  }, [profile, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Por favor, insira um nome para o perfil');
      return;
    }

    setLoading(true);
    try {
      if (isEditing && profile) {
        await updatePermissionProfile(profile.id, {
          name: formData.name,
          description: formData.description,
          permissions: formData.permissions
        });
      } else {
        await createPermissionProfile({
          name: formData.name,
          description: formData.description,
          permissions: formData.permissions
        });
      }
      
      onClose();
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (module: string, action: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: {
          ...prev.permissions[module],
          [action]: value
        }
      }
    }));
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      permissions: defaultPermissions
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {isEditing ? 'Editar' : 'Novo'} Perfil de Permissões
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? `Edite as permissões do perfil "${profile?.name}"`
              : 'Crie um novo perfil de permissões para organizar os acessos dos usuários'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Informações Básicas</TabsTrigger>
              <TabsTrigger value="permissions">Permissões</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Nome do Perfil <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="Ex: Supervisor de Vendas"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva as responsabilidades deste perfil..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="permissions" className="space-y-4 mt-4">
              <div className="grid gap-4">
                {Object.entries(formData.permissions).map(([module, permissions]) => {
                  const IconComponent = moduleIcons[module as keyof typeof moduleIcons];
                  
                  return (
                    <Card key={module}>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <IconComponent className="h-4 w-4" />
                          {moduleLabels[module as keyof typeof moduleLabels]}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {Object.entries(permissions).map(([action, value]) => (
                            <div key={action} className="flex items-center space-x-2">
                              <Switch
                                id={`${module}-${action}`}
                                checked={value as boolean}
                                onCheckedChange={(checked) => 
                                  handlePermissionChange(module, action, checked)
                                }
                              />
                              <Label 
                                htmlFor={`${module}-${action}`}
                                className="text-sm font-normal cursor-pointer"
                              >
                                {actionLabels[action as keyof typeof actionLabels]}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
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
              {loading 
                ? (isEditing ? 'Salvando...' : 'Criando...') 
                : (isEditing ? 'Salvar Alterações' : 'Criar Perfil')
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}