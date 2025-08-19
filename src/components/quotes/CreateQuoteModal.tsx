import { useState } from "react";
import { Plus, Search, X, Building, Mail, MessageCircle, Eye, Calendar, FileText, Package, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Stepper } from "@/components/ui/stepper";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { mockProducts, mockSuppliers, Product, Supplier } from "@/data/mockData";

interface QuoteFormData {
  title: string;
  description: string;
  deadline: string;
  items: Array<{product: Product, quantity: number}>;
  suppliers: Array<Supplier>;
  communicationMethods: {
    email: boolean;
    whatsapp: boolean;
  };
}

interface CreateQuoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuoteCreate: (quoteData: QuoteFormData) => void;
}

const steps = [
  { id: 1, title: "Dados" },
  { id: 2, title: "Itens" },
  { id: 3, title: "Fornecedores" },
  { id: 4, title: "Revisão" },
  { id: 5, title: "Envio" },
];

export function CreateQuoteModal({ open, onOpenChange, onQuoteCreate }: CreateQuoteModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<QuoteFormData>({
    title: "",
    description: "",
    deadline: "",
    items: [],
    suppliers: [],
    communicationMethods: {
      email: true,
      whatsapp: false
    }
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [newItemForm, setNewItemForm] = useState({
    name: "",
    code: "",
    description: "",
    category: "",
    type: "product" as "product" | "service"
  });

  const filteredProducts = mockProducts.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const suggestedSuppliers = mockSuppliers.filter(supplier => {
    if (formData.items.length === 0) return true;
    
    const categories = formData.items.map(item => item.product.category.toLowerCase());
    const supplierName = supplier.name.toLowerCase();
    
    // Simple matching based on supplier name and product categories
    return categories.some(category => 
      supplierName.includes(category) || 
      (category.includes('limpeza') && supplierName.includes('limpeza')) ||
      (category.includes('materiais') && supplierName.includes('materiais')) ||
      (category.includes('elétrica') && supplierName.includes('elétrica')) ||
      (category.includes('jardinagem') && supplierName.includes('jardinagem'))
    );
  });

  const handleProductSelect = (product: Product, quantity: number = 1) => {
    const existingIndex = formData.items.findIndex(item => item.product.id === product.id);
    if (existingIndex >= 0) {
      const updatedItems = [...formData.items];
      updatedItems[existingIndex].quantity = quantity;
      setFormData(prev => ({ ...prev, items: updatedItems }));
    } else {
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, { product, quantity }]
      }));
    }
  };

  const handleRemoveItem = (productId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.product.id !== productId)
    }));
  };

  const handleCreateNewItem = () => {
    if (!newItemForm.name.trim()) return;

    const newProduct: Product = {
      id: `new-${Date.now()}`,
      name: newItemForm.name,
      code: newItemForm.code || `CODE-${Date.now()}`,
      description: newItemForm.description,
      category: newItemForm.category || "Geral",
      stockQuantity: newItemForm.type === "service" ? 0 : 0,
      status: 'active'
    };

    handleProductSelect(newProduct, 1);
    setNewItemForm({
      name: "",
      code: "",
      description: "",
      category: "",
      type: "product"
    });
  };

  const handleSupplierToggle = (supplier: Supplier) => {
    setFormData(prev => ({
      ...prev,
      suppliers: prev.suppliers.find(s => s.id === supplier.id)
        ? prev.suppliers.filter(s => s.id !== supplier.id)
        : [...prev.suppliers, supplier]
    }));
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    onQuoteCreate(formData);
    onOpenChange(false);
    setCurrentStep(1);
    setFormData({
      title: "",
      description: "",
      deadline: "",
      items: [],
      suppliers: [],
      communicationMethods: {
        email: true,
        whatsapp: false
      }
    });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.title.trim() !== "";
      case 2:
        return formData.items.length > 0;
      case 3:
        return formData.suppliers.length > 0;
      case 4:
        return true;
      case 5:
        return formData.communicationMethods.email || formData.communicationMethods.whatsapp;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Título da Cotação *</label>
              <Input
                placeholder="Ex: Materiais de Construção, Equipamentos de Limpeza..."
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Descrição (opcional)</label>
              <Textarea
                placeholder="Descreva detalhes adicionais da cotação..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Prazo para Respostas</label>
              <Input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Selecionar Itens</h3>
                <p className="text-sm text-muted-foreground">Escolha os itens que deseja cotar e defina as quantidades</p>
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">{formData.items.length} item(s) selecionado(s)</span>
                <br />
                <span>{formData.items.reduce((total, item) => total + item.quantity, 0)} unidades total</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                className="h-20 flex flex-col gap-2"
                onClick={() => {/* Abrir seletor */}}
              >
                <Package className="h-6 w-6" />
                <span>Selecionar Existente</span>
              </Button>
              
              <Button 
                className="h-20 flex flex-col gap-2"
                onClick={() => {/* Mostrar form de novo item */}}
              >
                <Plus className="h-6 w-6" />
                <span>Criar Novo</span>
              </Button>
            </div>

            {/* Lista de produtos disponíveis */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <CardTitle className="text-base">Produtos Disponíveis</CardTitle>
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Buscar produtos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="max-h-60 overflow-y-auto">
                <div className="space-y-2">
                  {filteredProducts.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.code} • {product.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          defaultValue="1"
                          className="w-20 h-8"
                          onChange={(e) => {
                            const quantity = parseInt(e.target.value) || 1;
                            handleProductSelect(product, quantity);
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleProductSelect(product, 1)}
                          disabled={formData.items.some(item => item.product.id === product.id)}
                        >
                          {formData.items.some(item => item.product.id === product.id) ? "Adicionado" : "Adicionar"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Form para criar novo item */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Criar Novo Item</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Nome do item"
                    value={newItemForm.name}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <Input
                    placeholder="Código"
                    value={newItemForm.code}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, code: e.target.value }))}
                  />
                </div>
                <Input
                  placeholder="Descrição"
                  value={newItemForm.description}
                  onChange={(e) => setNewItemForm(prev => ({ ...prev, description: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Categoria"
                    value={newItemForm.category}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, category: e.target.value }))}
                  />
                  <select
                    value={newItemForm.type}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, type: e.target.value as "product" | "service" }))}
                    className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  >
                    <option value="product">Produto</option>
                    <option value="service">Serviço</option>
                  </select>
                </div>
                <Button onClick={handleCreateNewItem} disabled={!newItemForm.name.trim()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Item
                </Button>
              </CardContent>
            </Card>

            {/* Itens selecionados */}
            {formData.items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Itens Selecionados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {formData.items.map(({ product, quantity }) => (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.code} • {product.category}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">{quantity}x</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(product.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">Selecionar Fornecedores</h3>
              <p className="text-sm text-muted-foreground">Escolha os fornecedores que receberão esta cotação</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Fornecedores Sugeridos</CardTitle>
                  <p className="text-sm text-muted-foreground">Baseado nos itens selecionados</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {suggestedSuppliers.map((supplier) => (
                    <div key={supplier.id} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{supplier.name}</p>
                        <p className="text-xs text-muted-foreground">{supplier.email}</p>
                      </div>
                      <Checkbox
                        checked={formData.suppliers.some(s => s.id === supplier.id)}
                        onCheckedChange={() => handleSupplierToggle(supplier)}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Todos os Fornecedores</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 max-h-60 overflow-y-auto">
                  {mockSuppliers.map((supplier) => (
                    <div key={supplier.id} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{supplier.name}</p>
                        <p className="text-xs text-muted-foreground">{supplier.email}</p>
                      </div>
                      <Checkbox
                        checked={formData.suppliers.some(s => s.id === supplier.id)}
                        onCheckedChange={() => handleSupplierToggle(supplier)}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="text-center p-4 bg-secondary/20 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Não encontrou o fornecedor ideal?</p>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Novo Fornecedor
              </Button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">Revisão da Cotação</h3>
              <p className="text-sm text-muted-foreground">Confira todos os dados antes de enviar</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Dados da Cotação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Título</p>
                    <p className="text-sm text-muted-foreground">{formData.title}</p>
                  </div>
                  {formData.description && (
                    <div>
                      <p className="text-sm font-medium">Descrição</p>
                      <p className="text-sm text-muted-foreground">{formData.description}</p>
                    </div>
                  )}
                  {formData.deadline && (
                    <div>
                      <p className="text-sm font-medium">Prazo</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(formData.deadline).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Itens ({formData.items.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-40 overflow-y-auto">
                  {formData.items.map(({ product, quantity }) => (
                    <div key={product.id} className="flex justify-between text-sm">
                      <span>{product.name}</span>
                      <span className="text-muted-foreground">{quantity}x</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Fornecedores ({formData.suppliers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {formData.suppliers.map((supplier) => (
                      <div key={supplier.id} className="p-3 bg-secondary/20 rounded-lg">
                        <p className="font-medium text-sm">{supplier.name}</p>
                        <p className="text-xs text-muted-foreground">{supplier.email}</p>
                        <p className="text-xs text-muted-foreground">{supplier.phone}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold">Opções de Envio</h3>
              <p className="text-sm text-muted-foreground">Escolha como deseja enviar a cotação para os fornecedores</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Métodos de Comunicação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="email"
                    checked={formData.communicationMethods.email}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({
                        ...prev,
                        communicationMethods: { ...prev.communicationMethods, email: !!checked }
                      }))
                    }
                  />
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <label htmlFor="email" className="text-sm font-medium cursor-pointer">
                      Enviar por E-mail
                    </label>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="whatsapp"
                    checked={formData.communicationMethods.whatsapp}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({
                        ...prev,
                        communicationMethods: { ...prev.communicationMethods, whatsapp: !!checked }
                      }))
                    }
                  />
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-green-600" />
                    <label htmlFor="whatsapp" className="text-sm font-medium cursor-pointer">
                      Enviar por WhatsApp
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview do Envio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-secondary/20 rounded-lg">
                  <p className="text-sm font-medium mb-2">Assunto: Nova Cotação - {formData.title}</p>
                  <p className="text-sm text-muted-foreground">
                    Olá! Você foi selecionado para participar de uma nova cotação com {formData.items.length} item(s). 
                    {formData.deadline && ` Prazo para resposta: ${new Date(formData.deadline).toLocaleDateString('pt-BR')}.`}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Cotação</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <Stepper steps={steps} currentStep={currentStep} />
          
          <div className="min-h-[400px]">
            {renderStep()}
          </div>
          
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              Anterior
            </Button>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              
              {currentStep < steps.length ? (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed()}
                >
                  Próximo
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!canProceed()}
                >
                  Enviar Cotação
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}