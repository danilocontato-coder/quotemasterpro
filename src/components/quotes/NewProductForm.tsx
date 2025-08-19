import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Product } from "@/data/mockData";

interface NewProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductCreate: (product: Product, quantity: number) => void;
}

export function NewProductForm({ open, onOpenChange, onProductCreate }: NewProductFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    category: "",
    quantity: 1
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) return;

    const newProduct: Product = {
      id: `new-${Date.now()}`,
      name: formData.name,
      code: formData.code || `NOVO-${Date.now()}`,
      description: formData.description,
      category: formData.category || "Geral",
      stockQuantity: 0,
      status: 'active'
    };

    onProductCreate(newProduct, formData.quantity);
    
    // Reset form
    setFormData({
      name: "",
      code: "",
      description: "",
      category: "",
      quantity: 1
    });
    
    onOpenChange(false);
  };

  const handleReset = () => {
    setFormData({
      name: "",
      code: "",
      description: "",
      category: "",
      quantity: 1
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Novo Item</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Nome do Item *</label>
            <Input
              placeholder="Ex: Cimento Portland 50kg"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Código (opcional)</label>
            <Input
              placeholder="Ex: CIM001"
              value={formData.code}
              onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Categoria</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
            >
              <option value="">Selecione uma categoria</option>
              <option value="Materiais de Construção">Materiais de Construção</option>
              <option value="Produtos de Limpeza">Produtos de Limpeza</option>
              <option value="Elétrica e Iluminação">Elétrica e Iluminação</option>
              <option value="Jardinagem">Jardinagem</option>
              <option value="Serviços">Serviços</option>
              <option value="Geral">Geral</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Descrição (opcional)</label>
            <Textarea
              placeholder="Descreva detalhes do item..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Quantidade *</label>
            <Input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
              required
            />
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
              disabled={!formData.name.trim()}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Item
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}