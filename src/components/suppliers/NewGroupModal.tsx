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

const predefinedGroups = [
  {
    name: 'Materiais de Construção',
    description: 'Fornecedores de cimento, tijolos, areia, pedra, etc.',
    color: 'bg-blue-500'
  },
  {
    name: 'Produtos de Limpeza',
    description: 'Detergentes, desinfetantes, produtos de higiene',
    color: 'bg-green-500'
  },
  {
    name: 'Elétrica e Iluminação',
    description: 'Fios, cabos, lâmpadas, interruptores, tomadas',
    color: 'bg-yellow-500'
  },
  {
    name: 'Ferramentas e Equipamentos',
    description: 'Ferramentas manuais, elétricas e equipamentos',
    color: 'bg-red-500'
  },
  {
    name: 'Jardinagem e Paisagismo',
    description: 'Plantas, fertilizantes, ferramentas de jardim',
    color: 'bg-emerald-500'
  },
  {
    name: 'Serviços Gerais',
    description: 'Manutenção, limpeza, jardinagem, segurança',
    color: 'bg-purple-500'
  },
  {
    name: 'Alimentação e Bebidas',
    description: 'Fornecedores de alimentos e bebidas',
    color: 'bg-pink-500'
  },
  {
    name: 'Móveis e Decoração',
    description: 'Móveis, decoração, tecidos, cortinas',
    color: 'bg-indigo-500'
  }
];

export function NewGroupModal({ open, onOpenChange, onGroupCreate, existingGroups, onGroupDelete }: NewGroupModalProps) {
  const [showPredefined, setShowPredefined] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "bg-blue-500"
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Filter out predefined groups that already exist
  const availablePredefinedGroups = predefinedGroups.filter(
    predefined => !existingGroups.some(existing => existing.name === predefined.name)
  );

  const handlePredefinedGroupCreate = (predefinedGroup: typeof predefinedGroups[0]) => {
    const newGroup: SupplierGroup = {
      id: `group-${Date.now()}`,
      name: predefinedGroup.name,
      description: predefinedGroup.description,
      color: predefinedGroup.color,
      createdAt: new Date().toISOString()
    };

    onGroupCreate(newGroup);
  };

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
          {/* Predefined Groups */}
          {availablePredefinedGroups.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">Grupos Pré-definidos</h3>
                <Badge variant="outline" className="text-xs">
                  {availablePredefinedGroups.length} disponíveis
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Clique para adicionar grupos já configurados com as categorias mais comuns
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availablePredefinedGroups.map((predefinedGroup, index) => (
                  <Card key={index} className="border hover:shadow-md transition-shadow cursor-pointer group">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div 
                            className="w-4 h-4 rounded-full mt-0.5 flex-shrink-0" 
                            style={{ backgroundColor: colorOptions.find(c => c.value === predefinedGroup.color)?.color || '#3b82f6' }}
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                              {predefinedGroup.name}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {predefinedGroup.description}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePredefinedGroupCreate(predefinedGroup)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Existing Groups */}
          {existingGroups.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">Grupos Criados</h3>
                <Badge variant="secondary" className="text-xs">
                  {existingGroups.length} ativo{existingGroups.length !== 1 ? 's' : ''}
                </Badge>
              </div>
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

          {(availablePredefinedGroups.length > 0 || existingGroups.length > 0) && <Separator />}

          {/* Create Custom Group Form */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Criar Grupo Personalizado</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPredefined(!showPredefined)}
                className="text-xs"
              >
                {showPredefined ? 'Ocultar' : 'Mostrar'} Formulário
              </Button>
            </div>
            
            {!showPredefined && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Nome do Grupo *
                  </label>
                  <Input
                    placeholder="Ex: Fornecedores Especializados"
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
                    onClick={handleReset}
                    className="flex-1"
                  >
                    Limpar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 btn-corporate"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Grupo
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Close Button */}
          <div className="flex justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}