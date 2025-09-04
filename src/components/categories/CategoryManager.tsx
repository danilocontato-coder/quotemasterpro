import { useState, useEffect } from "react";
import { Plus, FolderPlus, Edit, Trash2, Tag, Palette, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { useSupabaseCategories } from "@/hooks/useSupabaseCategories";
import { toast } from "sonner";

interface CategoryManagerProps {
  onCategoryAdd?: (category: string) => void;
  onCategoryChange?: () => void;
}

export function CategoryManager({ onCategoryAdd, onCategoryChange }: CategoryManagerProps) {
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
      onCategoryChange?.();
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
      onCategoryChange?.();
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
      onCategoryChange?.();
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
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Gerenciar Categorias</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Add/Edit Category */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">
                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={editingCategory ? handleUpdateCategory : handleAddCategory} className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Nome da categoria..."
                    className="flex-1"
                    required
                  />
                  <div className="flex items-center gap-1">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    <input
                      type="color"
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      className="w-8 h-8 rounded border cursor-pointer"
                      title="Escolher cor"
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
                    <Button type="button" variant="outline" onClick={handleCancelEdit} size="sm">
                      Cancelar
                    </Button>
                  )}
                  <Button type="submit" disabled={!newCategory.trim()} size="sm">
                    {editingCategory ? (
                      <>
                        <Edit className="h-4 w-4 mr-1" />
                        Atualizar
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1" />
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
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Categorias ({categories.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-6 text-muted-foreground">
                  Carregando categorias...
                </div>
              ) : categories.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {categories.map((category) => {
                    const productCount = categoryUsage[category.name] || 0;
                    return (
                      <div
                        key={category.id}
                        className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-secondary/20 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div 
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: category.color }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate flex items-center gap-2">
                              {category.name}
                              {category.is_system && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">Sistema</Badge>
                              )}
                            </p>
                            {category.description && (
                              <p className="text-xs text-muted-foreground truncate">
                                {category.description}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {productCount} item{productCount !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditCategory(category)}
                            className="h-8 w-8 p-0 hover:bg-secondary"
                            title={category.is_system ? "Categorias do sistema não podem ser editadas" : "Editar categoria"}
                            disabled={!!category.is_system}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveCategory(category)}
                            disabled={productCount > 0 || !!category.is_system}
                            className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                            title={category.is_system ? "Categorias do sistema não podem ser excluídas" : (productCount > 0 ? "Não é possível excluir: categoria em uso" : "Excluir categoria")}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Tag className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm">Nenhuma categoria cadastrada</p>
                  <p className="text-xs">Adicione uma categoria acima</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Help Info */}
          <Card className="bg-secondary/10">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <div className="text-sm">
                  <p className="font-medium text-foreground mb-1">Dicas:</p>
                  <ul className="text-muted-foreground space-y-1 text-xs">
                    <li>• Organize produtos por tipo para facilitar cotações</li>
                    <li>• Categorias em uso não podem ser removidas</li>
                    <li>• Use cores para identificar categorias rapidamente</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Close Button */}
          <div className="flex justify-end pt-2">
            <DialogClose asChild>
              <Button variant="outline">
                Fechar
              </Button>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}