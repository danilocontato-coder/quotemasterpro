import { useState } from "react";
import { Plus, Users, Palette, Trash2, Edit, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SupplierGroup } from "@/hooks/useAdminSuppliers";
import { toast } from "sonner";

interface EnhancedGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupCreate: (group: Omit<SupplierGroup, "id" | "createdAt" | "supplierCount">) => void;
  onGroupUpdate: (groupId: string, group: Partial<SupplierGroup>) => void;
  onGroupDelete: (groupId: string) => void;
  existingGroups: SupplierGroup[];
}

const colorOptions = [
  { value: 'hsl(var(--primary))', label: 'Primário', color: '#003366' },
  { value: 'hsl(220, 70%, 50%)', label: 'Azul', color: '#3b82f6' },
  { value: 'hsl(142, 71%, 45%)', label: 'Verde', color: '#10b981' },
  { value: 'hsl(38, 92%, 50%)', label: 'Amarelo', color: '#f59e0b' },
  { value: 'hsl(0, 72%, 51%)', label: 'Vermelho', color: '#ef4444' },
  { value: 'hsl(271, 91%, 65%)', label: 'Roxo', color: '#8b5cf6' },
  { value: 'hsl(328, 86%, 70%)', label: 'Rosa', color: '#ec4899' },
  { value: 'hsl(239, 84%, 67%)', label: 'Índigo', color: '#6366f1' },
  { value: 'hsl(160, 84%, 39%)', label: 'Esmeralda', color: '#059669' },
  { value: 'hsl(25, 95%, 53%)', label: 'Laranja', color: '#f97316' },
  { value: 'hsl(200, 98%, 39%)', label: 'Ciano', color: '#0891b2' },
  { value: 'hsl(343, 84%, 58%)', label: 'Rosa Escuro', color: '#e11d48' }
];

export function EnhancedGroupModal({ 
  open, 
  onOpenChange, 
  onGroupCreate, 
  onGroupUpdate,
  onGroupDelete, 
  existingGroups 
}: EnhancedGroupModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "hsl(220, 70%, 50%)"
  });

  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<SupplierGroup>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome do grupo é obrigatório";
    }

    // Check for duplicate names
    const isDuplicate = existingGroups.some(group => 
      group.name.toLowerCase() === formData.name.toLowerCase()
    );
    
    if (isDuplicate) {
      newErrors.name = "Já existe um grupo com este nome";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateEditForm = (groupId: string) => {
    if (!editData.name?.trim()) {
      toast.error("Nome do grupo é obrigatório");
      return false;
    }

    // Check for duplicate names (excluding current group)
    const isDuplicate = existingGroups.some(group => 
      group.id !== groupId && group.name.toLowerCase() === editData.name!.toLowerCase()
    );
    
    if (isDuplicate) {
      toast.error("Já existe um grupo com este nome");
      return false;
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const newGroup = {
      name: formData.name,
      description: formData.description,
      color: formData.color
    };

    onGroupCreate(newGroup);
    handleReset();
    toast.success("Grupo criado com sucesso!");
  };

  const handleReset = () => {
    setFormData({
      name: "",
      description: "",
      color: "hsl(220, 70%, 50%)"
    });
    setErrors({});
  };

  const startEdit = (group: SupplierGroup) => {
    setEditingGroup(group.id);
    setEditData({
      name: group.name,
      description: group.description,
      color: group.color
    });
  };

  const saveEdit = () => {
    if (!editingGroup || !validateEditForm(editingGroup)) return;

    onGroupUpdate(editingGroup, editData);
    setEditingGroup(null);
    setEditData({});
    toast.success("Grupo atualizado com sucesso!");
  };

  const cancelEdit = () => {
    setEditingGroup(null);
    setEditData({});
  };

  const handleDelete = (groupId: string) => {
    const group = existingGroups.find(g => g.id === groupId);
    if (!group) return;

    if (group.supplierCount > 0) {
      toast.error("Não é possível excluir um grupo que possui fornecedores associados");
      return;
    }

    if (confirm(`Tem certeza que deseja excluir o grupo "${group.name}"?`)) {
      onGroupDelete(groupId);
      toast.success("Grupo excluído com sucesso!");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gerenciar Grupos de Fornecedores
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Existing Groups */}
          {existingGroups.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Grupos Existentes ({existingGroups.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {existingGroups.map((group) => (
                    <div key={group.id} className="border border-border rounded-lg p-4">
                      {editingGroup === group.id ? (
                        // Edit Mode
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-5 h-5 rounded-full border border-border" 
                              style={{ backgroundColor: editData.color || group.color }}
                            />
                            <Input
                              value={editData.name || ""}
                              onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Nome do grupo"
                              className="flex-1"
                            />
                          </div>
                          
                          <Textarea
                            value={editData.description || ""}
                            onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Descrição do grupo"
                            rows={2}
                          />
                          
                          <div>
                            <label className="text-sm font-medium mb-2 block">Cor do Grupo</label>
                            <div className="grid grid-cols-6 gap-2">
                              {colorOptions.map((color) => (
                                <button
                                  key={color.value}
                                  type="button"
                                  onClick={() => setEditData(prev => ({ ...prev, color: color.value }))}
                                  className={`
                                    w-8 h-8 rounded-full border-2 transition-all
                                    ${editData.color === color.value 
                                      ? 'border-foreground ring-2 ring-ring' 
                                      : 'border-border hover:border-foreground/50'
                                    }
                                  `}
                                  style={{ backgroundColor: color.color }}
                                  title={color.label}
                                />
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button onClick={saveEdit} size="sm">
                              <Save className="h-4 w-4 mr-2" />
                              Salvar
                            </Button>
                            <Button onClick={cancelEdit} variant="outline" size="sm">
                              <X className="h-4 w-4 mr-2" />
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // View Mode
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div 
                              className="w-5 h-5 rounded-full border border-border" 
                              style={{ backgroundColor: group.color }}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{group.name}</h4>
                                <Badge variant="secondary" className="text-xs">
                                  {group.supplierCount} fornecedores
                                </Badge>
                              </div>
                              {group.description && (
                                <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                Criado em {new Date(group.createdAt).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEdit(group)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(group.id)}
                              className="text-destructive hover:text-destructive"
                              disabled={group.supplierCount > 0}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Create New Group Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Criar Novo Grupo</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Nome do Grupo *
                  </label>
                  <Input
                    placeholder="Ex: Materiais de Construção"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={errors.name ? "border-destructive" : ""}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Descrição</label>
                  <Textarea
                    placeholder="Descreva o tipo de fornecedores deste grupo..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Cor do Grupo
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                        className={`
                          w-10 h-10 rounded-lg border-2 transition-all
                          ${formData.color === color.value 
                            ? 'border-foreground ring-2 ring-ring' 
                            : 'border-border hover:border-foreground/50'
                          }
                        `}
                        style={{ backgroundColor: color.color }}
                        title={color.label}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Cor selecionada: {colorOptions.find(c => c.value === formData.color)?.label}
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      handleReset();
                      onOpenChange(false);
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Grupo
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
