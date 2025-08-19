import { useState } from "react";
import { Plus, Search, Package, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { mockProducts, Product } from "@/data/mockData";

interface ProductSelectorProps {
  onProductSelect: (product: Product, quantity: number) => void;
  selectedProducts: string[];
}

export function ProductSelector({ onProductSelect, selectedProducts }: ProductSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
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
      [productId]: quantity
    }));
  };

  const handleAddProduct = (product: Product) => {
    const quantity = selectedQuantities[product.id] || 1;
    onProductSelect(product, quantity);
    setSelectedQuantities(prev => ({
      ...prev,
      [product.id]: 0
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Package className="h-4 w-4 mr-2" />
          Adicionar Produtos do Estoque
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Selecionar Produtos do Estoque</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
            {filteredProducts.map((product) => {
              const isSelected = selectedProducts.includes(product.id);
              const isLowStock = product.stockQuantity <= 10;
              
              return (
                <Card key={product.id} className={`${isSelected ? 'border-primary' : ''}`}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{product.name}</h4>
                          <p className="text-xs text-muted-foreground font-mono">{product.code}</p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {product.category}
                          </Badge>
                        </div>
                        {isLowStock && (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span>Estoque: <strong>{product.stockQuantity}</strong></span>
                        <span className="font-bold text-primary">
                          R$ {product.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Qtd"
                          min="1"
                          max={product.stockQuantity}
                          value={selectedQuantities[product.id] || 1}
                          onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 1)}
                          className="w-20 text-sm"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleAddProduct(product)}
                          disabled={isSelected || (selectedQuantities[product.id] || 1) > product.stockQuantity}
                          className="flex-1"
                        >
                          {isSelected ? 'Já Adicionado' : 'Adicionar'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum produto encontrado</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Quick Add Product Modal
interface QuickAddProductProps {
  onProductAdd: (product: Omit<Product, 'id'>) => void;
}

export function QuickAddProduct({ onProductAdd }: QuickAddProductProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    category: 'Materiais de Construção',
    stockQuantity: 1,
    unitPrice: 0,
    status: 'active' as const
  });

  const categories = [
    'Materiais de Construção',
    'Produtos de Limpeza', 
    'Elétrica e Iluminação',
    'Jardinagem',
    'Ferramentas',
    'Hidráulica'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onProductAdd(formData);
    setIsOpen(false);
    setFormData({
      code: '',
      name: '',
      description: '',
      category: 'Materiais de Construção',
      stockQuantity: 1,
      unitPrice: 0,
      status: 'active'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Criar Novo Produto
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Novo Produto</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Código</label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                placeholder="EX: MAT001"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Categoria</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Nome do Produto</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Nome completo do produto"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Descrição</label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descrição detalhada"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Quantidade Inicial</label>
              <Input
                type="number"
                min="0"
                value={formData.stockQuantity}
                onChange={(e) => setFormData(prev => ({ ...prev, stockQuantity: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Preço Unitário (R$)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.unitPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              Criar Produto
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}