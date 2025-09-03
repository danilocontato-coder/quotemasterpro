import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSupabaseProducts } from "@/hooks/useSupabaseProducts";
import { useSupabaseCategories } from "@/hooks/useSupabaseCategories";

interface NewProductFormSupabaseProps {
  open: boolean;
  onClose: () => void;
  onProductCreate: (product: any, quantity: number) => void;
}

export function NewProductFormSupabase({ open, onClose, onProductCreate }: NewProductFormSupabaseProps) {
  const { addProduct } = useSupabaseProducts();
  const { categories, refetch } = useSupabaseCategories();
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    category: '',
    quantity: 1
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open, refetch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      const newProduct = await addProduct({
        name: formData.name,
        code: formData.code || `PRD-${Date.now()}`,
        description: formData.description,
        category: formData.category || 'Geral',
        stock_quantity: 0,
        status: 'active'
      });

      if (newProduct) {
        onProductCreate(newProduct, formData.quantity);
        handleClose();
      }
    } catch (error) {
      console.error('Erro ao criar produto:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      category: '',
      quantity: 1
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Novo Produto</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nome *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Nome do produto..."
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Código</label>
            <Input
              value={formData.code}
              onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
              placeholder="Código do produto (opcional)"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Categoria</label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Geral">Geral</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Descrição</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descrição do produto..."
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Quantidade *</label>
            <Input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.name.trim()} className="flex-1">
              {isSubmitting ? 'Criando...' : 'Criar Produto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}