import { useState } from "react";
import { Plus, X, FileText, Package, Users, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  { id: 1, title: "Dados Básicos" },
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
            <div>
              <h3 className="text-lg font-semibold">Selecionar Itens</h3>
              <p className="text-sm text-muted-foreground">Escolha os itens que deseja cotar</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                className="h-20 flex flex-col gap-2"
                onClick={() => {
                  // Simular seleção de produtos existentes
                  const randomProduct = mockProducts[Math.floor(Math.random() * mockProducts.length)];
                  setFormData(prev => ({
                    ...prev,
                    items: [...prev.items, { product: randomProduct, quantity: 1 }]
                  }));
                }}
              >
                <Package className="h-6 w-6" />
                <span>Selecionar Existente</span>
              </Button>
              
              <Button 
                className="h-20 flex flex-col gap-2"
                onClick={() => {
                  // Simular criação de novo produto
                  const newProduct: Product = {
                    id: `new-${Date.now()}`,
                    code: `NOVO-${Date.now()}`,
                    name: "Produto Teste",
                    description: "Produto criado no modal",
                    category: "Geral",
                    stockQuantity: 0,
                    status: 'active'
                  };
                  setFormData(prev => ({
                    ...prev,
                    items: [...prev.items, { product: newProduct, quantity: 1 }]
                  }));
                }}
              >
                <Plus className="h-6 w-6" />
                <span>Criar Novo</span>
              </Button>
            </div>

            {/* Itens selecionados */}
            {formData.items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Itens Selecionados ({formData.items.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {formData.items.map(({ product, quantity }, index) => (
                      <div key={`${product.id}-${index}`} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.code} • {product.category}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">{quantity}x</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                items: prev.items.filter((_, i) => i !== index)
                              }));
                            }}
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