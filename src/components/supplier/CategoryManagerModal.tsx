import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Package, Search } from 'lucide-react';
import { useSupplierCategories } from '@/hooks/useSupplierCategories';

interface CategoryManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryManagerModal({ open, onOpenChange }: CategoryManagerModalProps) {
  const { categories, addCategory, updateCategory, deleteCategory, isLoading } = useSupplierCategories();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
  });

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "O nome da categoria é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, formData);
        toast({
          title: "Categoria atualizada",
          description: `${formData.name} foi atualizada com sucesso.`,
        });
      } else {
        await addCategory(formData);
        toast({
          title: "Categoria criada",
          description: `${formData.name} foi adicionada ao seu catálogo.`,
        });
      }

      // Reset form
      setFormData({ name: '', description: '', color: '#3B82F6' });
      setIsCreating(false);
      setEditingCategory(null);
      
    } catch (error) {
      toast({
        title: "Erro",
        description: editingCategory ? "Não foi possível atualizar a categoria." : "Não foi possível criar a categoria.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      color: category.color,
    });
    setIsCreating(true);
  };

  const handleDelete = async (category: any) => {
    if (category.productCount > 0) {
      toast({
        title: "Não é possível excluir",
        description: `A categoria "${category.name}" possui ${category.productCount} produto(s) vinculado(s).`,
        variant: "destructive",
      });
      return;
    }

    if (window.confirm(`Tem certeza que deseja excluir a categoria "${category.name}"?`)) {
      try {
        await deleteCategory(category.id);
        toast({
          title: "Categoria excluída",
          description: `${category.name} foi removida do seu catálogo.`,
        });
      } catch (error) {
        toast({
          title: "Erro",
          description: "Não foi possível excluir a categoria.",
          variant: "destructive",
        });
      }
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', description: '', color: '#3B82F6' });
    setIsCreating(false);
    setEditingCategory(null);
  };

  const colorOptions = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
    '#8B5CF6', '#F97316', '#06B6D4', '#84CC16',
    '#EC4899', '#6B7280', '#DC2626', '#059669'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Gerenciar Categorias
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {isCreating ? (editingCategory ? 'Editar Categoria' : 'Nova Categoria') : 'Adicionar Categoria'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isCreating ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Categoria *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Ex: Materiais Elétricos"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Descreva o tipo de produtos desta categoria"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Cor da Categoria</Label>
                    <div className="flex flex-wrap gap-2">
                      {colorOptions.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-8 h-8 rounded-full border-2 ${
                            formData.color === color ? 'border-gray-800' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => handleInputChange('color', color)}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <div 
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: formData.color }}
                      />
                      <Input
                        type="text"
                        value={formData.color}
                        onChange={(e) => handleInputChange('color', e.target.value)}
                        placeholder="#3B82F6"
                        className="w-24 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? 'Salvando...' : editingCategory ? 'Atualizar' : 'Criar Categoria'}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleCancel}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-8">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground mt-2 mb-4">
                    Organize seus produtos em categorias
                  </p>
                  <Button onClick={() => setIsCreating(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Categoria
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Categories List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Categorias Existentes ({categories.length})
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar categorias..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto">
                {filteredCategories.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Produtos</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCategories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-4 h-4 rounded border"
                                style={{ backgroundColor: category.color }}
                              />
                              <div>
                                <p className="font-medium">{category.name}</p>
                                {category.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {category.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {category.productCount} produto(s)
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(category)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(category)}
                                className="text-destructive hover:text-destructive"
                                disabled={category.productCount > 0}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <Package className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground mt-2">
                      {searchTerm ? 'Nenhuma categoria encontrada' : 'Nenhuma categoria criada'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}