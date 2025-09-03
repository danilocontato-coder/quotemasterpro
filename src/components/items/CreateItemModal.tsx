import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Package, Wrench } from "lucide-react";
import { useSupabaseCategories } from "@/hooks/useSupabaseCategories";
import { useSupabaseProducts } from "@/hooks/useSupabaseProducts";
import { toast } from "sonner";

interface CreateItemModalProps {
  trigger?: React.ReactNode;
  onItemCreate?: (item: any) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateItemModal({ trigger, onItemCreate, open: externalOpen, onOpenChange: externalOnOpenChange }: CreateItemModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [itemType, setItemType] = useState<'product' | 'service'>('product');
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    category: '',
    initialStock: '',
    unitPrice: '',
    supplier: '',
    minStock: '',
  });

  const { categories, refetch: refetchCategories } = useSupabaseCategories();
  const { addProduct } = useSupabaseProducts();

  // Force re-render when categories change
  useEffect(() => {
    // This effect will trigger when categories array changes
    console.log('Categories updated in CreateItemModal:', categories.length);
  }, [categories]);
  
  // Controle do estado do modal (interno ou externo)
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code || !formData.name || !formData.category) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    const productData = {
      code: formData.code,
      name: formData.name,
      description: formData.description || null,
      category: formData.category,
      stock_quantity: itemType === 'product' ? parseInt(formData.initialStock || '0') : 0,
      unit_price: parseFloat(formData.unitPrice || '0') || null,
      status: 'active' as const,
    };

    const result = await addProduct(productData);
    
    if (result) {
      onItemCreate?.(result);
      
      // Reset form
      setFormData({
        code: '',
        name: '',
        description: '',
        category: '',
        initialStock: '',
        unitPrice: '',
        supplier: '',
        minStock: '',
      });
      setItemType('product');
      setInternalOpen(false);
      setOpen(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {!externalOpen && (
        <DialogTrigger asChild>
          {trigger || (
            <Button className="btn-corporate">
              <Plus className="h-4 w-4 mr-2" />
              Novo Item
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Cadastrar Novo Item
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Item Type Selection */}
          <Card className="card-corporate">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Tipo do Item</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup 
                value={itemType} 
                onValueChange={(value) => setItemType(value as 'product' | 'service')}
                className="grid grid-cols-2 gap-4"
              >
                <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-accent/50">
                  <RadioGroupItem value="product" id="product" />
                  <Label htmlFor="product" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Package className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Produto</div>
                      <div className="text-xs text-muted-foreground">Item físico com controle de estoque</div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-accent/50">
                  <RadioGroupItem value="service" id="service" />
                  <Label htmlFor="service" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Wrench className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Serviço</div>
                      <div className="text-xs text-muted-foreground">Prestação de serviço</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card className="card-corporate">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Código *</Label>
                  <Input
                    id="code"
                    placeholder="Ex: PRD001"
                    value={formData.code}
                    onChange={(e) => handleInputChange('code', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria *</Label>
                   <Select 
                     key={`categories-${categories.length}-${Date.now()}`}
                     value={formData.category} 
                     onValueChange={(value) => handleInputChange('category', value)}
                   >
                     <SelectTrigger>
                       <SelectValue placeholder="Selecione uma categoria" />
                     </SelectTrigger>
                       <SelectContent>
                         {categories.map((category) => (
                           <SelectItem key={category.id} value={category.name}>
                             <div className="flex items-center gap-2">
                               <div 
                                 className="w-3 h-3 rounded-full"
                                 style={{ backgroundColor: category.color }}
                               />
                               {category.name}
                             </div>
                           </SelectItem>
                         ))}
                       </SelectContent>
                   </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nome do Item *</Label>
                <Input
                  id="name"
                  placeholder="Digite o nome do item"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva detalhes do item..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Stock and Pricing - Only for products */}
          {itemType === 'product' && (
            <Card className="card-corporate">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Estoque e Preço</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="initialStock">Quantidade Inicial</Label>
                    <Input
                      id="initialStock"
                      type="number"
                      placeholder="0"
                      value={formData.initialStock}
                      onChange={(e) => handleInputChange('initialStock', e.target.value)}
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minStock">Estoque Mínimo</Label>
                    <Input
                      id="minStock"
                      type="number"
                      placeholder="0"
                      value={formData.minStock}
                      onChange={(e) => handleInputChange('minStock', e.target.value)}
                      min="0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitPrice">Preço Unitário Estimado (R$)</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    value={formData.unitPrice}
                    onChange={(e) => handleInputChange('unitPrice', e.target.value)}
                    min="0"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Service Pricing - Only for services */}
          {itemType === 'service' && (
            <Card className="card-corporate">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Precificação do Serviço</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="unitPrice">Preço Estimado (R$)</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    value={formData.unitPrice}
                    onChange={(e) => handleInputChange('unitPrice', e.target.value)}
                    min="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Valor de referência para cotações (pode variar conforme fornecedor)
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="btn-corporate">
              Cadastrar {itemType === 'product' ? 'Produto' : 'Serviço'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}