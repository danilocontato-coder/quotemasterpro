import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Wrench, Edit } from "lucide-react";
import { productCategories } from "@/data/mockData";
import { toast } from "sonner";

interface EditItemModalProps {
  item: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemUpdate: (itemId: string, updates: any) => void;
}

export function EditItemModal({ item, open, onOpenChange, onItemUpdate }: EditItemModalProps) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    category: '',
    unitPrice: '',
    minStock: '',
    status: 'active' as 'active' | 'inactive',
  });

  useEffect(() => {
    if (item) {
      setFormData({
        code: item.code || '',
        name: item.name || '',
        description: item.description || '',
        category: item.category || '',
        unitPrice: item.unitPrice?.toString() || '',
        minStock: item.minStock?.toString() || '',
        status: item.status || 'active',
      });
    }
  }, [item]);

  if (!item) return null;

  const isService = item.type === 'service' || item.category === 'Serviços';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code || !formData.name || !formData.category) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    const updates = {
      code: formData.code,
      name: formData.name,
      description: formData.description,
      category: formData.category,
      unitPrice: parseFloat(formData.unitPrice || '0'),
      minStock: parseInt(formData.minStock || '0'),
      status: formData.status,
    };

    onItemUpdate(item.id, updates);
    toast.success(`${isService ? 'Serviço' : 'Produto'} atualizado com sucesso!`);
    onOpenChange(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Editar {isService ? 'Serviço' : 'Produto'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Item Info */}
          <Card className="card-corporate">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center justify-between">
                Informações do Item
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {isService ? 'Serviço' : 'Produto'}
                  </Badge>
                  {isService ? <Wrench className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Código *</Label>
                  <Input
                    id="code"
                    placeholder="Ex: PRD001"
                    value={formData.code}
                    onChange={(e) => handleInputChange('code', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
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

              <div className="space-y-2">
                <Label htmlFor="name">Nome do Item *</Label>
                <Input
                  id="name"
                  placeholder="Digite o nome do item"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {productCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva detalhes do item..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing and Stock */}
          <Card className="card-corporate">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">
                {isService ? 'Precificação' : 'Preço e Estoque'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unitPrice">
                    {isService ? 'Preço de Referência (R$)' : 'Preço Unitário (R$)'}
                  </Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    value={formData.unitPrice}
                    onChange={(e) => handleInputChange('unitPrice', e.target.value)}
                    min="0"
                  />
                </div>
                {!isService && (
                  <div className="space-y-2">
                    <Label htmlFor="minStock">Estoque Mínimo</Label>
                    <Input
                      id="minStock"
                      type="number"
                      placeholder="0"
                      value={formData.minStock}
                      onChange={(e) => handleInputChange('minStock', e.target.value)}
                      min="0"
                    />
                  </div>
                )}
              </div>

              {!isService && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Estoque atual:</span>
                    <span className="font-semibold">{item.stockQuantity} unidades</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use a funcionalidade "Movimentar" para alterar quantidades
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="btn-corporate">
              Salvar Alterações
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}