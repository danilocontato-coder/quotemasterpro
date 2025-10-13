import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useSupabaseProducts } from "@/hooks/useSupabaseProducts";
import { ShoppingCart, CheckSquare } from "lucide-react";

interface ProductSearchModalSupabaseProps {
  open: boolean;
  onClose: () => void;
  onProductSelect: (product: any, quantity: number) => void;
}

export function ProductSearchModalSupabase({ open, onClose, onProductSelect }: ProductSearchModalSupabaseProps) {
  const { products, isLoading } = useSupabaseProducts();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Record<string, { selected: boolean; quantity: number }>>({});

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleProductToggle = (productId: string, checked: boolean) => {
    setSelectedProducts(prev => ({
      ...prev,
      [productId]: {
        selected: checked,
        quantity: prev[productId]?.quantity || 1
      }
    }));
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    setSelectedProducts(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        quantity: Math.max(1, quantity)
      }
    }));
  };

  const handleAddSelected = () => {
    const selectedItems = Object.entries(selectedProducts).filter(([_, data]) => data.selected);
    
    selectedItems.forEach(([productId, data]) => {
      const product = products.find(p => p.id === productId);
      if (product) {
        onProductSelect(product, data.quantity);
      }
    });

    // Limpar seleções e fechar modal
    setSelectedProducts({});
    setSearchTerm("");
    onClose();
  };

  const selectedCount = Object.values(selectedProducts).filter(data => data.selected).length;

  const handleSelectAll = () => {
    const allSelected = filteredProducts.every(product => selectedProducts[product.id]?.selected);
    
    if (allSelected) {
      // Desmarcar todos os filtrados
      setSelectedProducts(prev => {
        const newState = { ...prev };
        filteredProducts.forEach(product => {
          if (newState[product.id]) {
            newState[product.id].selected = false;
          }
        });
        return newState;
      });
    } else {
      // Marcar todos os filtrados
      setSelectedProducts(prev => {
        const newState = { ...prev };
        filteredProducts.forEach(product => {
          newState[product.id] = {
            selected: true,
            quantity: prev[product.id]?.quantity || 1
          };
        });
        return newState;
      });
    }
  };

  const allFilteredSelected = filteredProducts.length > 0 && filteredProducts.every(product => selectedProducts[product.id]?.selected);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Selecionar Produtos
            {selectedCount > 0 && (
              <span className="bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs">
                {selectedCount} selecionado{selectedCount > 1 ? 's' : ''}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden">
          <div className="flex gap-3">
            <Input
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            {filteredProducts.length > 0 && (
              <Button
                variant="outline"
                onClick={handleSelectAll}
                className="flex items-center gap-2"
              >
                <CheckSquare className="w-4 h-4" />
                {allFilteredSelected ? 'Desmarcar' : 'Marcar'} Todos
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Carregando produtos...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[400px] flex-1 pr-2">
              {filteredProducts.map((product) => (
                <div key={product.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <Checkbox
                    checked={selectedProducts[product.id]?.selected || false}
                    onCheckedChange={(checked) => handleProductToggle(product.id, checked as boolean)}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{product.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {product.code} {product.description && `• ${product.description}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Estoque: {product.stock_quantity || 0}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">Qtd:</label>
                    <Input
                      type="number"
                      min="1"
                      className="w-20 h-8"
                      value={selectedProducts[product.id]?.quantity || 1}
                      onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 1)}
                      disabled={!selectedProducts[product.id]?.selected}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleAddSelected}
            disabled={selectedCount === 0}
            className="flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            Adicionar {selectedCount > 0 ? `${selectedCount} produto${selectedCount > 1 ? 's' : ''}` : 'Produtos'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}