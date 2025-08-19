import { useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { mockProducts, Product } from "@/data/mockData";

interface ProductSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductSelect: (product: Product, quantity: number) => void;
  selectedProductIds: string[];
}

export function ProductSearchModal({ open, onOpenChange, onProductSelect, selectedProductIds }: ProductSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});

  const filteredProducts = mockProducts.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleQuantityChange = (productId: string, quantity: number) => {
    setSelectedQuantities(prev => ({
      ...prev,
      [productId]: Math.max(1, quantity)
    }));
  };

  const handleAddProduct = (product: Product) => {
    const quantity = selectedQuantities[product.id] || 1;
    onProductSelect(product, quantity);
    setSelectedQuantities(prev => ({
      ...prev,
      [product.id]: 1
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Selecionar Produtos Existentes</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar itens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Lista de produtos */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "Nenhum item encontrado." : "Nenhum produto disponível."}
              </div>
            ) : (
              filteredProducts.map((product) => {
                const isSelected = selectedProductIds.includes(product.id);
                const quantity = selectedQuantities[product.id] || 1;
                
                return (
                  <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-secondary/50">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.code} • {product.category}
                      </p>
                      {product.stockQuantity !== null && (
                        <p className="text-xs text-muted-foreground">
                          Estoque: {product.stockQuantity}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 1)}
                          className="w-16 h-8 text-center"
                        />
                        <span className="text-xs text-muted-foreground">un</span>
                      </div>
                      
                      <Button
                        size="sm"
                        onClick={() => handleAddProduct(product)}
                        disabled={isSelected}
                        variant={isSelected ? "secondary" : "default"}
                      >
                        {isSelected ? "Adicionado" : "Adicionar"}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}