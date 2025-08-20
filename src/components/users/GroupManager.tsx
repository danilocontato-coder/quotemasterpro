import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Users, 
  Edit, 
  Trash2, 
  Shield,
  Settings,
  UserPlus,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUserGroups, UserGroup } from '@/hooks/useUsersAndGroups';
import { toast } from 'sonner';

interface GroupManagerProps {
  open: boolean;
  onClose: () => void;
  users: any[]; // Array de usuários para atualizar contadores
}

const colorOptions = [
  { value: '#dc2626', label: 'Vermelho', class: 'bg-red-600' },
  { value: '#2563eb', label: 'Azul', class: 'bg-blue-600' },
  { value: '#16a34a', label: 'Verde', class: 'bg-green-600' },
  { value: '#ea580c', label: 'Laranja', class: 'bg-orange-600' },
  { value: '#7c3aed', label: 'Roxo', class: 'bg-violet-600' },
  { value: '#0891b2', label: 'Ciano', class: 'bg-cyan-600' },
  { value: '#be123c', label: 'Rosa', class: 'bg-rose-600' },
  { value: '#059669', label: 'Esmeralda', class: 'bg-emerald-600' },
];

const permissionOptions = [
  { id: 'quotes.create', label: 'Criar Cotações', category: 'Cotações' },
  { id: 'quotes.edit', label: 'Editar Cotações', category: 'Cotações' },
  { id: 'quotes.approve', label: 'Aprovar Cotações', category: 'Cotações' },
  { id: 'quotes.view', label: 'Visualizar Cotações', category: 'Cotações' },
  { id: 'quotes.respond', label: 'Responder Cotações', category: 'Cotações' },
  
  { id: 'suppliers.manage', label: 'Gerenciar Fornecedores', category: 'Fornecedores' },
  { id: 'suppliers.view', label: 'Visualizar Fornecedores', category: 'Fornecedores' },
  { id: 'suppliers.negotiate', label: 'Negociar com Fornecedores', category: 'Fornecedores' },
  
  { id: 'products.manage', label: 'Gerenciar Produtos', category: 'Produtos' },
  { id: 'products.view', label: 'Visualizar Produtos', category: 'Produtos' },
  { id: 'products.research', label: 'Pesquisar Produtos', category: 'Produtos' },
  
  { id: 'payments.approve', label: 'Aprovar Pagamentos', category: 'Financeiro' },
  { id: 'payments.view', label: 'Visualizar Pagamentos', category: 'Financeiro' },
  { id: 'budget.manage', label: 'Gerenciar Orçamento', category: 'Financeiro' },
  
  { id: 'reports.view', label: 'Visualizar Relatórios', category: 'Relatórios' },
  { id: 'reports.financial', label: 'Relatórios Financeiros', category: 'Relatórios' },
  
  { id: 'users.manage', label: 'Gerenciar Usuários', category: 'Sistema' },
  { id: 'system.settings', label: 'Configurações do Sistema', category: 'Sistema' },
  { id: 'profile.edit', label: 'Editar Perfil', category: 'Perfil' },
];

export function GroupManager({ open, onClose, users }: GroupManagerProps) {
  const { 
    groups, 
    createGroup, 
    updateGroup, 
    deleteGroup, 
    getSystemGroups, 
    getCustomGroups,
    updateGroupUserCounts 
  } = useUserGroups();
  
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#2563eb',
    permissions: [] as string[]
  });

  React.useEffect(() => {
    if (users.length > 0) {
      updateGroupUserCounts(users);
    }
  }, [users, updateGroupUserCounts]);

  const systemGroups = getSystemGroups();
  const customGroups = getCustomGroups();
  
  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#2563eb',
      permissions: []
    });
  };

  const handleCreateGroup = () => {
    if (!formData.name.trim()) {
      toast.error('Nome do grupo é obrigatório');
      return;
    }

    createGroup({
      name: formData.name,
      description: formData.description,
      color: formData.color,
      permissions: formData.permissions
    });

    toast.success('Grupo criado com sucesso');
    setCreateModalOpen(false);
    resetForm();
  };

  const handleEditGroup = () => {
    if (!selectedGroup || !formData.name.trim()) {
      toast.error('Nome do grupo é obrigatório');
      return;
    }

    updateGroup(selectedGroup.id, {
      name: formData.name,
      description: formData.description,
      color: formData.color,
      permissions: formData.permissions
    });

    toast.success('Grupo atualizado com sucesso');
    setEditModalOpen(false);
    setSelectedGroup(null);
    resetForm();
  };

  const handleDeleteGroup = () => {
    if (!selectedGroup) return;

    deleteGroup(selectedGroup.id);
    toast.success('Grupo excluído com sucesso');
    setDeleteModalOpen(false);
    setSelectedGroup(null);
  };

  const openEditModal = (group: UserGroup) => {
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      description: group.description,
      color: group.color,
      permissions: [...group.permissions]
    });
    setEditModalOpen(true);
  };

  const openDeleteModal = (group: UserGroup) => {
    setSelectedGroup(group);
    setDeleteModalOpen(true);
  };

  const togglePermission = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const groupPermissionsByCategory = () => {
    const categories: Record<string, typeof permissionOptions> = {};
    permissionOptions.forEach(permission => {
      if (!categories[permission.category]) {
        categories[permission.category] = [];
      }
      categories[permission.category].push(permission);
    });
    return categories;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gerenciar Grupos de Usuários
            </DialogTitle>
            <DialogDescription>
              Organize usuários em grupos para facilitar o controle de permissões e acesso
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Search and Create */}
            <div className="flex items-center justify-between gap-4">
              <Input
                placeholder="Buscar grupos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
              <Button onClick={() => setCreateModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Criar Grupo
              </Button>
            </div>

            {/* System Groups */}
            {systemGroups.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Grupos do Sistema
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {systemGroups.filter(group =>
                    group.name.toLowerCase().includes(searchTerm.toLowerCase())
                  ).map(group => (
                    <Card key={group.id} className="border-l-4" style={{ borderLeftColor: group.color }}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: group.color }}
                            />
                            <CardTitle className="text-base">{group.name}</CardTitle>
                            <Badge variant="outline" className="text-xs">
                              Sistema
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="secondary" className="text-xs">
                              {group.userCount} usuário{group.userCount !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">{group.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {group.permissions.slice(0, 3).map(permission => (
                            <Badge key={permission} variant="outline" className="text-xs">
                              {permission === '*' ? 'Todas as permissões' : permission.split('.')[1]}
                            </Badge>
                          ))}
                          {group.permissions.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{group.permissions.length - 3} mais
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Groups */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Grupos Customizados
              </h3>
              {customGroups.filter(group =>
                group.name.toLowerCase().includes(searchTerm.toLowerCase())
              ).length === 0 ? (
                <Card className="p-6 text-center">
                  <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum grupo customizado</h3>
                  <p className="text-muted-foreground mb-4">
                    Crie grupos personalizados para organizar melhor seus usuários
                  </p>
                  <Button onClick={() => setCreateModalOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Criar Primeiro Grupo
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customGroups.filter(group =>
                    group.name.toLowerCase().includes(searchTerm.toLowerCase())
                  ).map(group => (
                    <Card key={group.id} className="border-l-4" style={{ borderLeftColor: group.color }}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: group.color }}
                            />
                            <CardTitle className="text-base">{group.name}</CardTitle>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="secondary" className="text-xs">
                              {group.userCount} usuário{group.userCount !== 1 ? 's' : ''}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditModal(group)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => openDeleteModal(group)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">{group.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {group.permissions.slice(0, 3).map(permission => (
                            <Badge key={permission} variant="outline" className="text-xs">
                              {permission.split('.')[1]}
                            </Badge>
                          ))}
                          {group.permissions.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{group.permissions.length - 3} mais
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Group Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Novo Grupo</DialogTitle>
            <DialogDescription>
              Defina um grupo para organizar usuários com permissões similares
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome do Grupo</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Equipe de Compras"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva as responsabilidades deste grupo..."
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Cor do Grupo</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {colorOptions.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                    className={`w-8 h-8 rounded-full border-2 ${color.class} ${
                      formData.color === color.value ? 'border-foreground' : 'border-transparent'
                    }`}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Permissões</label>
              <div className="space-y-4 mt-2 max-h-64 overflow-y-auto border rounded-lg p-4">
                {Object.entries(groupPermissionsByCategory()).map(([category, permissions]) => (
                  <div key={category}>
                    <h4 className="font-medium text-sm mb-2">{category}</h4>
                    <div className="space-y-2 ml-4">
                      {permissions.map(permission => (
                        <label key={permission.id} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions.includes(permission.id)}
                            onChange={() => togglePermission(permission.id)}
                            className="rounded"
                          />
                          <span className="text-sm">{permission.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateGroup}>
              Criar Grupo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Group Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Grupo</DialogTitle>
            <DialogDescription>
              Modifique as configurações do grupo selecionado
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome do Grupo</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Equipe de Compras"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva as responsabilidades deste grupo..."
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Cor do Grupo</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {colorOptions.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                    className={`w-8 h-8 rounded-full border-2 ${color.class} ${
                      formData.color === color.value ? 'border-foreground' : 'border-transparent'
                    }`}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Permissões</label>
              <div className="space-y-4 mt-2 max-h-64 overflow-y-auto border rounded-lg p-4">
                {Object.entries(groupPermissionsByCategory()).map(([category, permissions]) => (
                  <div key={category}>
                    <h4 className="font-medium text-sm mb-2">{category}</h4>
                    <div className="space-y-2 ml-4">
                      {permissions.map(permission => (
                        <label key={permission.id} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.permissions.includes(permission.id)}
                            onChange={() => togglePermission(permission.id)}
                            className="rounded"
                          />
                          <span className="text-sm">{permission.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditGroup}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o grupo "{selectedGroup?.name}"?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteGroup}>
              Excluir Grupo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}