import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Tag,
  Palette
} from 'lucide-react';
import { ClientGroup } from '@/hooks/useSupabaseAdminClients';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ClientGroupsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: ClientGroup[];
  onCreateGroup: (group: Omit<ClientGroup, "id" | "createdAt" | "clientCount">) => Promise<ClientGroup>;
  onUpdateGroup: (id: string, group: Partial<ClientGroup>) => Promise<void>;
  onDeleteGroup: (id: string) => Promise<void>;
}

const colorOptions = [
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Verde', value: '#10b981' },
  { name: 'Roxo', value: '#8b5cf6' },
  { name: 'Laranja', value: '#f97316' },
  { name: 'Vermelho', value: '#ef4444' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Amarelo', value: '#eab308' },
  { name: 'Cinza', value: '#64748b' }
];

export const ClientGroupsManager: React.FC<ClientGroupsManagerProps> = ({
  open,
  onOpenChange,
  groups,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup
}) => {
  const { toast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ClientGroup | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6'
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#3b82f6'
    });
    setEditingGroup(null);
    setShowCreateForm(false);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome do grupo é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      if (editingGroup) {
        await onUpdateGroup(editingGroup.id, formData);
        toast({
          title: "Grupo atualizado",
          description: `${formData.name} foi atualizado com sucesso.`
        });
      } else {
        await onCreateGroup(formData);
        toast({
          title: "Grupo criado",
          description: `${formData.name} foi criado com sucesso.`
        });
      }

      resetForm();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar grupo. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (group: ClientGroup) => {
    setFormData({
      name: group.name,
      description: group.description || '',
      color: group.color || '#3b82f6'
    });
    setEditingGroup(group);
    setShowCreateForm(true);
  };

  const handleDelete = async (group: ClientGroup) => {
    if ((group.clientCount || 0) > 0) {
      toast({
        title: "Não é possível excluir",
        description: `O grupo "${group.name}" possui ${group.clientCount || 0} cliente(s) vinculado(s).`,
        variant: "destructive"
      });
      return;
    }

    try {
      await onDeleteGroup(group.id);
      toast({
        title: "Grupo excluído",
        description: `${group.name} foi excluído com sucesso.`
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir grupo. Tente novamente.",
        variant: "destructive"
      });
    }
  };


  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Gerenciar Grupos de Clientes
          </DialogTitle>
          <DialogDescription>
            Organize seus clientes em grupos para melhor gestão
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-full">
          {!showCreateForm ? (
            <>
              {/* Header Actions */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {groups.length} grupo{groups.length !== 1 ? 's' : ''} cadastrado{groups.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Grupo
                </Button>
              </div>

              {/* Groups List */}
              <div className="flex-1 overflow-y-auto">
                {groups.length === 0 ? (
                  <div className="text-center py-12">
                    <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum grupo cadastrado</h3>
                    <p className="text-muted-foreground mb-4">
                      Crie grupos para organizar melhor seus clientes
                    </p>
                    <Button onClick={() => setShowCreateForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Primeiro Grupo
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groups.map((group) => (
                      <Card key={group.id} className="relative">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full`} style={{ backgroundColor: group.color || '#64748b' }}></div>
                              <CardTitle className="text-lg">{group.name}</CardTitle>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(group)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(group)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <CardDescription className="text-sm">
                            {group.description || "Sem descrição"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {group.clientCount || 0} cliente{(group.clientCount || 0) !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {group.createdAt ? new Date(group.createdAt).toLocaleDateString() : 'Data não disponível'}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  {editingGroup ? 'Editar Grupo' : 'Novo Grupo'}
                </CardTitle>
                <CardDescription>
                  {editingGroup ? 'Atualize as informações do grupo' : 'Crie um novo grupo para organizar seus clientes'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="groupName">Nome do Grupo *</Label>
                  <Input
                    id="groupName"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Condomínios Residenciais"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="groupDescription">Descrição</Label>
                  <Textarea
                    id="groupDescription"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descreva o objetivo deste grupo..."
                    rows={3}
                  />
                </div>

                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Cor do Grupo
                  </Label>
                  <div className="grid grid-cols-4 gap-3">
                    {colorOptions.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                          formData.color === color.value 
                            ? 'border-primary bg-primary/5' 
                            : 'border-muted hover:border-muted-foreground/50'
                        }`}
                        onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                      >
                        <div className={`w-4 h-4 rounded-full`} style={{ backgroundColor: color.value }}></div>
                        <span className="text-sm font-medium">{color.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={resetForm}
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isLoading}
                  >
                    {editingGroup ? 'Atualizar Grupo' : 'Criar Grupo'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};