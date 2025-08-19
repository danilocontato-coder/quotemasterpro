import { useState } from "react";
import { Plus, Users, Palette, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SupplierGroup } from "@/data/mockData";

interface NewGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupCreate: (group: SupplierGroup) => void;
  existingGroups: SupplierGroup[];
  onGroupDelete: (groupId: string) => void;
}

const colorOptions = [
  { value: 'bg-blue-500', label: 'Azul', color: '#3b82f6' },
  { value: 'bg-green-500', label: 'Verde', color: '#10b981' },
  { value: 'bg-yellow-500', label: 'Amarelo', color: '#f59e0b' },
  { value: 'bg-red-500', label: 'Vermelho', color: '#ef4444' },
  { value: 'bg-purple-500', label: 'Roxo', color: '#8b5cf6' },
  { value: 'bg-pink-500', label: 'Rosa', color: '#ec4899' },
  { value: 'bg-indigo-500', label: 'Índigo', color: '#6366f1' },
  { value: 'bg-emerald-500', label: 'Esmeralda', color: '#059669' },
];

export function NewGroupModal({ open, onOpenChange, onGroupCreate, existingGroups, onGroupDelete }: NewGroupModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "bg-blue-500"
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome do grupo é obrigatório";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const newGroup: SupplierGroup = {
      id: `group-${Date.now()}`,
      name: formData.name,
      description: formData.description,
      color: formData.color,
      createdAt: new Date().toISOString()
    };

    onGroupCreate(newGroup);
    handleReset();
    onOpenChange(false);
  };

  const handleReset = () => {
    setFormData({
      name: "",
      description: "",
      color: "bg-blue-500"
    });
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gerenciar Grupos de Fornecedores
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Existing Groups */}
          {existingGroups.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3">Grupos Existentes</h3>
              <div className="space-y-2">
                {existingGroups.map((group) => (
                  <Card key={group.id} className="border">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: colorOptions.find(c => c.value === group.color)?.color || '#3b82f6' }}
                          />
                          <div>
                            <h4 className="font-medium text-sm">{group.name}</h4>
                            {group.description && (
                              <p className="text-xs text-muted-foreground">{group.description}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onGroupDelete(group.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Create New Group Form */}
          <div>
            <h3 className="text-sm font-medium mb-4">Criar Novo Grupo</h3>
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
            <div className="grid grid-cols-4 gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                  className={`
                    w-full h-10 rounded-lg border-2 transition-all
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}