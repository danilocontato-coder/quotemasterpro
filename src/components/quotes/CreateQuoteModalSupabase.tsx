import React, { useState, useEffect } from 'react';
import { X, Plus, Calendar, MessageSquare, Send, ArrowLeft, ArrowRight, AlertCircle, FileText, Package, Users, Mail, MessageCircle, Search } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Stepper } from '@/components/ui/stepper';
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProductSearchModalSupabase } from "./ProductSearchModalSupabase";
import { NewProductFormSupabase } from "./NewProductFormSupabase";
import { useSupabaseProducts } from "@/hooks/useSupabaseProducts";
import { useSupabaseSuppliers } from "@/hooks/useSupabaseSuppliers";
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { Quote } from '@/hooks/useSupabaseQuotes';

interface QuoteFormData {
  title: string;
  description: string;
  deadline: string;
  items: Array<{
    product_name: string;
    quantity: number;
    product_id?: string;
  }>;
  supplier_ids: string[];
  communicationMethods: {
    email: boolean;
    whatsapp: boolean;
  };
}

interface CreateQuoteModalSupabaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuoteCreate: (quoteData: Omit<Quote, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => void;
  editingQuote?: Quote | null;
}

const steps = [
  { id: 1, title: "Dados" },
  { id: 2, title: "Itens" },
  { id: 3, title: "Fornecedor" },
  { id: 4, title: "Revisão" },
  { id: 5, title: "Envio" }
];

export function CreateQuoteModalSupabase({ open, onOpenChange, onQuoteCreate, editingQuote }: CreateQuoteModalSupabaseProps) {
  const { enforceLimit } = useSubscriptionGuard();
  const { products, addProduct, isLoading: productsLoading } = useSupabaseProducts();
  const { suppliers, isLoading: suppliersLoading } = useSupabaseSuppliers();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  
  const [formData, setFormData] = useState<QuoteFormData>({
    title: "",
    description: "",
    deadline: "",
    items: [],
    supplier_ids: [],
    communicationMethods: {
      email: true,
      whatsapp: false
    }
  });

  // Initialize form with editing data
  useEffect(() => {
    if (editingQuote && open) {
      setFormData({
        title: editingQuote.title,
        description: editingQuote.description || "",
        deadline: editingQuote.deadline ? editingQuote.deadline.split('T')[0] : '',
        items: [], // Will be loaded from quote_items
        supplier_ids: editingQuote.supplier_id ? [editingQuote.supplier_id] : [],
        communicationMethods: {
          email: true,
          whatsapp: false,
        },
      });
    } else if (!editingQuote && open) {
      // Reset form for new quote
      setFormData({
        title: "",
        description: "",
        deadline: "",
        items: [],
        supplier_ids: [],
        communicationMethods: {
          email: true,
          whatsapp: false
        }
      });
      setCurrentStep(1);
    }
  }, [editingQuote, open]);

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

  const handleProductSelect = (product: any, quantity: number) => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        product_name: product.name,
        product_id: product.id,
        quantity: quantity
      }]
    }));
    setShowProductSearch(false);
  };

  const handleProductCreate = (product: any, quantity: number) => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        product_name: product.name,
        product_id: product.id,
        quantity: quantity
      }]
    }));
    setShowNewProductForm(false);
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    // Verificar limites antes de criar cotação
    if (!enforceLimit('CREATE_QUOTE')) {
      return;
    }
    
    // Convert form data to quote format
    const quoteData: Omit<Quote, 'id' | 'created_at' | 'updated_at' | 'created_by'> = {
      title: formData.title,
      description: formData.description,
      deadline: formData.deadline ? new Date(formData.deadline).toISOString() : undefined,
      status: 'draft',
      client_id: '', // Will be set by the hook
      client_name: '', // Will be set by the hook
      supplier_id: formData.supplier_ids[0] || undefined,
      supplier_name: formData.supplier_ids[0] ? suppliers.find(s => s.id === formData.supplier_ids[0])?.name : undefined,
      total: 0,
      items_count: formData.items.length,
      responses_count: 0
    };
    
    onQuoteCreate(quoteData);
    
    // Reset form
    setFormData({
      title: "",
      description: "",
      deadline: "",
      items: [],
      supplier_ids: [],
      communicationMethods: {
        email: true,
        whatsapp: false
      }
    });
    setCurrentStep(1);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.title.trim() !== "";
      case 2:
        return formData.items.length > 0;
      case 3:
        return formData.supplier_ids.length > 0;
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
                min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">Adicionar Itens</h3>
              <p className="text-sm text-muted-foreground">Adicione os produtos que deseja cotar</p>
            </div>

            {/* Botões de ação */}
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="h-12"
                onClick={() => setShowProductSearch(true)}
              >
                <Search className="h-4 w-4 mr-2" />
                Buscar Produtos
              </Button>
              
              <Button 
                className="h-12"
                onClick={() => setShowNewProductForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Novo
              </Button>
            </div>

            {formData.items.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum item adicionado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {formData.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-sm text-muted-foreground">Quantidade: {item.quantity}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">Selecionar Fornecedores</h3>
              <p className="text-sm text-muted-foreground">Escolha os fornecedores para enviar a cotação</p>
            </div>

            {suppliersLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Carregando fornecedores...</p>
              </div>
            ) : suppliers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum fornecedor cadastrado</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {suppliers.filter(s => s.status === 'active').map((supplier) => (
                  <div key={supplier.id} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.supplier_ids.includes(supplier.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData(prev => ({
                              ...prev,
                              supplier_ids: [...prev.supplier_ids, supplier.id]
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              supplier_ids: prev.supplier_ids.filter(id => id !== supplier.id)
                            }));
                          }
                        }}
                      />
                      <div>
                        <p className="font-medium">{supplier.name}</p>
                        <p className="text-sm text-muted-foreground">{supplier.email}</p>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {supplier.rating}/5 ⭐
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">Revisão da Cotação</h3>
              <p className="text-sm text-muted-foreground">Confirme os dados antes de enviar</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-medium">Título:</p>
                  <p className="text-muted-foreground">{formData.title}</p>
                </div>
                
                <div>
                  <p className="font-medium">Itens ({formData.items.length}):</p>
                  <div className="space-y-1">
                    {formData.items.map((item, index) => (
                      <p key={index} className="text-sm text-muted-foreground">
                        • {item.product_name} (Qtd: {item.quantity})
                      </p>
                    ))}
                  </div>
                </div>
                
                <div>
                  <p className="font-medium">Fornecedores ({formData.supplier_ids.length}):</p>
                  <div className="space-y-1">
                    {formData.supplier_ids.map(id => {
                      const supplier = suppliers.find(s => s.id === id);
                      return supplier ? (
                        <p key={id} className="text-sm text-muted-foreground">
                          • {supplier.name}
                        </p>
                      ) : null;
                    })}
                  </div>
                </div>
                
                {formData.deadline && (
                  <div>
                    <p className="font-medium">Prazo:</p>
                    <p className="text-muted-foreground">
                      {new Date(formData.deadline).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">Forma de Envio</h3>
              <p className="text-sm text-muted-foreground">Escolha como enviar a cotação aos fornecedores</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="email"
                  checked={formData.communicationMethods.email}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({
                      ...prev,
                      communicationMethods: {
                        ...prev.communicationMethods,
                        email: checked === true
                      }
                    }))
                  }
                />
                <label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  E-mail
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="whatsapp"
                  checked={formData.communicationMethods.whatsapp}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({
                      ...prev,
                      communicationMethods: {
                        ...prev.communicationMethods,
                        whatsapp: checked === true
                      }
                    }))
                  }
                />
                <label htmlFor="whatsapp" className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </label>
              </div>
            </div>

            {!formData.communicationMethods.email && !formData.communicationMethods.whatsapp && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Selecione pelo menos um método de comunicação para enviar a cotação.
                </AlertDescription>
              </Alert>
            )}
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
          <DialogTitle>
            {editingQuote ? 'Editar Cotação' : 'Nova Cotação'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Stepper
            steps={steps}
            currentStep={currentStep}
            onStepClick={(stepId) => {
              if (stepId <= currentStep) {
                setCurrentStep(stepId);
              }
            }}
          />

          <div className="min-h-[400px]">
            {renderStep()}
          </div>

          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Anterior
            </Button>

            {currentStep === steps.length ? (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed()}
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {editingQuote ? 'Atualizar' : 'Criar'} Cotação
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
              >
                Próximo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>

        {/* Product Search Modal */}
        <ProductSearchModalSupabase
          open={showProductSearch}
          onClose={() => setShowProductSearch(false)}
          onProductSelect={handleProductSelect}
        />

        {/* New Product Form Modal */}
        <NewProductFormSupabase
          open={showNewProductForm}
          onClose={() => setShowNewProductForm(false)}
          onProductCreate={handleProductCreate}
        />
      </DialogContent>
    </Dialog>
  );
}