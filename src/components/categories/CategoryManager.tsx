import { useState, useEffect } from "react";
import { Plus, FolderPlus, Edit, Trash2, Tag, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useSupabaseCategories } from "@/hooks/useSupabaseCategories";
import { toast } from "sonner";

interface CategoryManagerProps {
  onCategoryAdd?: (category: string) => void;
}

export function CategoryManager({ onCategoryAdd }: CategoryManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [categoryUsage, setCategoryUsage] = useState<Record<string, number>>({});
  
  const { categories, isLoading, addCategory, updateCategory, deleteCategory, getCategoryUsageCount } = useSupabaseCategories();

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) {
      toast.error("Nome da categoria é obrigatório");
      return;
    }

    const success = await addCategory({
      name: newCategory.trim(),
      description: newDescription.trim() || undefined,
      color: newColor
    });

    if (success) {
      setNewCategory("");
      setNewDescription("");
      setNewColor("#3b82f6");
      onCategoryAdd?.(newCategory.trim());
    }
  };

  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    setNewCategory(category.name);
    setNewDescription(category.description || "");
    setNewColor(category.color || "#3b82f6");
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !newCategory.trim()) return;

    const success = await updateCategory(editingCategory.id, {
      name: newCategory.trim(),
      description: newDescription.trim() || undefined,
      color: newColor
    });

    if (success) {
      handleCancelEdit();
    }
  };

  const handleRemoveCategory = async (category: any) => {
    const usage = await getCategoryUsageCount(category.name);
    if (usage > 0) {
      toast.error(`Não é possível remover "${category.name}" pois existem ${usage} produto(s) usando esta categoria.`);
      return;
    }

    const success = await deleteCategory(category.id, category.name);
    if (success) {
      // Remove from usage tracking
      const newUsage = { ...categoryUsage };
      delete newUsage[category.name];
      setCategoryUsage(newUsage);
    }
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setNewCategory("");
    setNewDescription("");
    setNewColor("#3b82f6");
  };

  // Load usage counts for all categories (with debounce to prevent spam)
  useEffect(() => {
    const loadUsageCounts = async () => {
      if (categories.length === 0) return;
      
      // Debounce to prevent multiple rapid calls
      const timeoutId = setTimeout(async () => {
        const usage: Record<string, number> = {};
        
        // Load usage counts sequentially to avoid overwhelming the API
        for (const category of categories.slice(0, 10)) { // Limit to first 10 to prevent spam
          usage[category.name] = await getCategoryUsageCount(category.name);
        }
        
        setCategoryUsage(usage);
      }, 300);

      return () => clearTimeout(timeoutId);
    };

    loadUsageCounts();
  }, [categories.length]); // Only depend on categories length, not the full array

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
          {/* Add/Edit Category */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {editingCategory ? 'Editar Categoria' : 'Adicionar Nova Categoria'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={editingCategory ? handleUpdateCategory : handleAddCategory} className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Nome da categoria..."
                    className="flex-1"
                    required
                  />
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    <input
                      type="color"
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      className="w-10 h-10 rounded border"
                    />
                  </div>
                </div>
                <Input
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Descrição (opcional)..."
                />
                <div className="flex gap-2">
                  {editingCategory && (
                    <Button type="button" variant="outline" onClick={handleCancelEdit}>
                      Cancelar
                    </Button>
                  )}
                  <Button type="submit" disabled={!newCategory.trim()}>
                    {editingCategory ? (
                      <>
                        <Edit className="h-4 w-4 mr-2" />
                        Atualizar
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Categories List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Categorias Existentes</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando categorias...
                </div>
              ) : categories.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                  {categories.map((category) => {
                    const productCount = categoryUsage[category.name] || 0;
                    return (
                      <div
                        key={category.id}
                        className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-secondary/20 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div 
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: category.color }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{category.name}</p>
                            {category.description && (
                              <p className="text-xs text-muted-foreground truncate">
                                {category.description}
                              </p>
                            )}
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
                            onClick={() => handleEditCategory(category)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
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
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma categoria cadastrada
                </div>
              )}
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