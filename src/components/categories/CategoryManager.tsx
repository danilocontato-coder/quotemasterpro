import { useState } from "react";
import { Plus, FolderPlus, Edit, Trash2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { productCategories, mockProducts } from "@/data/mockData";

interface CategoryManagerProps {
  onCategoryAdd?: (category: string) => void;
}

export function CategoryManager({ onCategoryAdd }: CategoryManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [categories, setCategories] = useState(productCategories);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      const updatedCategories = [...categories, newCategory.trim()];
      setCategories(updatedCategories);
      onCategoryAdd?.(newCategory.trim());
      setNewCategory("");
    }
  };

  const handleRemoveCategory = (categoryToRemove: string) => {
    const productsInCategory = mockProducts.filter(p => p.category === categoryToRemove).length;
    if (productsInCategory === 0) {
      setCategories(prev => prev.filter(cat => cat !== categoryToRemove));
    } else {
      alert(`Não é possível remover a categoria "${categoryToRemove}" pois existem ${productsInCategory} produto(s) cadastrado(s) nela.`);
    }
  };

  const getCategoryCount = (category: string) => {
    return mockProducts.filter(p => p.category === category).length;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <FolderPlus className="h-4 w-4" />
          Gerenciar Categorias
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gerenciar Categorias de Produtos</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Add New Category */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Adicionar Nova Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddCategory} className="flex gap-2">
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Nome da nova categoria..."
                  className="flex-1"
                />
                <Button type="submit" disabled={!newCategory.trim()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Categories List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Categorias Existentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                {categories.map((category) => {
                  const productCount = getCategoryCount(category);
                  return (
                    <div
                      key={category}
                      className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-secondary/20 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{category}</p>
                          <p className="text-xs text-muted-foreground">
                            {productCount} produto{productCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {productCount}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveCategory(category)}
                          disabled={productCount > 0}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Category Usage Info */}
          <Card className="bg-secondary/10">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                <div className="text-sm">
                  <p className="font-medium text-foreground mb-1">Como usar as categorias:</p>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• Organize produtos por tipo para facilitar cotações</li>
                    <li>• Envie solicitações para fornecedores especializados por categoria</li>
                    <li>• Categorias com produtos não podem ser removidas</li>
                    <li>• Use nomes descritivos e específicos</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}