import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { useSupplierProducts, SupplierProduct } from '@/hooks/useSupplierProducts';

interface CreateProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const defaultCategories = [
  'Materiais de Construção',
  'Ferramentas',
  'Elétrica e Iluminação',
  'Hidráulica',
  'Produtos de Limpeza',
  'Jardinagem',
  'Pintura',
  'Acabamento',
  'Equipamentos',
  'Serviços Gerais',
];

export function CreateProductModal({ open, onOpenChange }: CreateProductModalProps) {
  const { addProduct, categories, isLoading } = useSupplierProducts();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    stockQuantity: 0,
    minStockLevel: 5,
    unitPrice: 0,
    costPrice: 0,
    brand: '',
    specifications: '',
    status: 'active' as const,
  });
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  const existingCategories = categories;
  const allCategories = [...new Set([...defaultCategories, ...existingCategories])];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files);
      const validFiles = files.filter(file => {
        const isValid = file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024; // 5MB limit
        if (!isValid) {
          toast({
            title: "Arquivo inválido",
            description: `${file.name} não é uma imagem válida ou excede 5MB.`,
            variant: "destructive",
          });
        }
        return isValid;
      });
      
      setSelectedImages(prev => [...prev, ...validFiles].slice(0, 5)); // Max 5 images
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.description) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e descrição são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (formData.unitPrice <= 0) {
      toast({
        title: "Preço inválido",
        description: "O preço unitário deve ser maior que zero.",
        variant: "destructive",
      });
      return;
    }

    try {
      const categoryToUse = isCustomCategory ? customCategory : formData.category;
      
      const productData: Omit<SupplierProduct, 'id' | 'code' | 'createdAt' | 'lastUpdated'> = {
        ...formData,
        category: categoryToUse,
        images: [], // Images will be added after product creation
      };

      const newProduct = await addProduct(productData);
      
      // TODO: In real app, upload images to Supabase Storage here
      // For now, we'll skip image upload in the mock

      toast({
        title: "Produto criado",
        description: `${formData.name} foi adicionado ao seu catálogo.`,
      });

      // Reset form
      setFormData({
        name: '',
        description: '',
        category: '',
        stockQuantity: 0,
        minStockLevel: 5,
        unitPrice: 0,
        costPrice: 0,
        brand: '',
        specifications: '',
        status: 'active',
      });
      setSelectedImages([]);
      setCustomCategory('');
      setIsCustomCategory(false);
      onOpenChange(false);
      
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar o produto.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Produto</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Produto *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Ex: Cimento Portland 50kg"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand">Marca</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => handleInputChange('brand', e.target.value)}
                placeholder="Ex: Votoran"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Descreva o produto detalhadamente"
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="specifications">Especificações Técnicas</Label>
            <Textarea
              id="specifications"
              value={formData.specifications}
              onChange={(e) => handleInputChange('specifications', e.target.value)}
              placeholder="Especificações técnicas, dimensões, características especiais..."
              rows={2}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="custom-category"
                checked={isCustomCategory}
                onCheckedChange={setIsCustomCategory}
              />
              <Label htmlFor="custom-category">Criar nova categoria</Label>
            </div>

            {isCustomCategory ? (
              <div className="space-y-2">
                <Label htmlFor="custom-category-input">Nova Categoria</Label>
                <Input
                  id="custom-category-input"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Nome da nova categoria"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {allCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stockQuantity">Estoque Inicial</Label>
              <Input
                id="stockQuantity"
                type="number"
                value={formData.stockQuantity}
                onChange={(e) => handleInputChange('stockQuantity', Number(e.target.value))}
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minStockLevel">Estoque Mínimo</Label>
              <Input
                id="minStockLevel"
                type="number"
                value={formData.minStockLevel}
                onChange={(e) => handleInputChange('minStockLevel', Number(e.target.value))}
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="costPrice">Custo (R$)</Label>
              <Input
                id="costPrice"
                type="number"
                value={formData.costPrice}
                onChange={(e) => handleInputChange('costPrice', Number(e.target.value))}
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitPrice">Preço Venda (R$) *</Label>
              <Input
                id="unitPrice"
                type="number"
                value={formData.unitPrice}
                onChange={(e) => handleInputChange('unitPrice', Number(e.target.value))}
                min="0"
                step="0.01"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label>Imagens do Produto (máx. 5)</Label>
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-5 gap-4 mb-4">
                  {selectedImages.map((file, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-20 object-cover rounded border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                {selectedImages.length < 5 && (
                  <div>
                    <input
                      type="file"
                      id="images"
                      multiple
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('images')?.click()}
                      className="w-full"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {selectedImages.length === 0 ? 'Adicionar Imagens' : 'Adicionar Mais Imagens'}
                    </Button>
                  </div>
                )}
                
                {selectedImages.length === 0 && (
                  <div className="text-center py-4">
                    <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-2">
                      Adicione até 5 imagens do produto
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="status"
              checked={formData.status === 'active'}
              onCheckedChange={(checked) => handleInputChange('status', checked ? 'active' : 'inactive')}
            />
            <Label htmlFor="status">Produto ativo</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-6 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Criando...' : 'Criar Produto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}