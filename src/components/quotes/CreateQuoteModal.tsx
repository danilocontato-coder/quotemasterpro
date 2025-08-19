import { useState } from "react";
import { Plus, X, FileText, Package, Users, Mail, MessageCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Stepper } from "@/components/ui/stepper";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ProductSearchModal } from "./ProductSearchModal";
import { NewProductForm } from "./NewProductForm";
import { mockSuppliers, Product, Supplier } from "@/data/mockData";

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
  { id: 3, title: "Fornecedor" },
  { id: 4, title: "Revisão" },
  { id: 5, title: "Propos..." },
  { id: 6, title: "Forma de Envio" }
];

export function CreateQuoteModal({ open, onOpenChange, onQuoteCreate }: CreateQuoteModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  
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

  const handleProductSelect = (product: Product, quantity: number) => {
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

  const handleProductCreate = (product: Product, quantity: number) => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { product, quantity }]
    }));
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
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

  const getTotalUnits = () => {
    return formData.items.reduce((total, item) => total + item.quantity, 0);
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
      case 5:
        return true;
      case 6:
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
            <div>
              <h3 className="text-lg font-semibold">Selecionar Itens</h3>
              <p className="text-sm text-muted-foreground">Escolha os itens que deseja cotar e defina as quantidades</p>
            </div>

            {/* Contadores */}
            <div className="flex gap-6 text-sm">
              <div>
                <span className="font-medium">{formData.items.length} item(ns) selecionado(s)</span>
              </div>
              <div>
                <span className="font-medium">{getTotalUnits()} unidades total</span>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                className="flex-1 h-12"
                onClick={() => setShowProductSearch(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Selecionar Existente
              </Button>
              
              <Button 
                className="flex-1 h-12"
                onClick={() => setShowNewProductForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Novo
              </Button>
            </div>

            {/* Campo de busca (visual apenas) */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar itens..."
                className="pl-10"
                disabled
              />
            </div>

            {/* Estado vazio ou lista de itens */}
            {formData.items.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">Nenhum item selecionado</h3>
                <p className="text-sm text-muted-foreground">
                  Use os botões acima para selecionar itens existentes ou criar novos produtos
                </p>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Itens Selecionados ({formData.items.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {formData.items.map(({ product, quantity }, index) => (
                    <div key={`${product.id}-${index}`} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.code} • {product.category}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">{quantity}x</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
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

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fornecedores Disponíveis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mockSuppliers.slice(0, 5).map((supplier) => (
                  <div key={supplier.id} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{supplier.name}</p>
                      <p className="text-xs text-muted-foreground">{supplier.email}</p>
                    </div>
                    <Checkbox
                      checked={formData.suppliers.some(s => s.id === supplier.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData(prev => ({
                            ...prev,
                            suppliers: [...prev.suppliers, supplier]
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            suppliers: prev.suppliers.filter(s => s.id !== supplier.id)
                          }));
                        }
                      }}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
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
                  {formData.items.map(({ product, quantity }, index) => (
                    <div key={`${product.id}-${index}`} className="flex justify-between text-sm">
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
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">Propostas</h3>
            <p className="text-muted-foreground mb-4">Aguardando implementação das propostas dos fornecedores</p>
            <Package className="h-12 w-12 text-muted-foreground mx-auto" />
          </div>
        );

      case 6:
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
    <>
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
                {currentStep === 2 && (
                  <Button variant="outline">
                    Salvar Rascunho
                  </Button>
                )}
                
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

      {/* Modals auxiliares */}
      <ProductSearchModal
        open={showProductSearch}
        onOpenChange={setShowProductSearch}
        onProductSelect={handleProductSelect}
        selectedProductIds={formData.items.map(item => item.product.id)}
      />

      <NewProductForm
        open={showNewProductForm}
        onOpenChange={setShowNewProductForm}
        onProductCreate={handleProductCreate}
      />
    </>
  );
}