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
import { useToast } from "@/hooks/use-toast";
import { ProductSearchModalSupabase } from "./ProductSearchModalSupabase";
import { CreateItemModal } from "../items/CreateItemModal";
import { useSupabaseProducts } from "@/hooks/useSupabaseProducts";
import { useSupabaseSuppliers } from "@/hooks/useSupabaseSuppliers";
import { useSupabaseSubscriptionGuard } from '@/hooks/useSupabaseSubscriptionGuard';
import { Quote } from '@/hooks/useSupabaseQuotes';
import { supabase } from "@/integrations/supabase/client";
import { useCostCenters } from "@/hooks/useCostCenters";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface QuoteFormData {
  title: string;
  description: string;
  deadline: string;
  cost_center_id?: string;
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
  supplierScope: 'local' | 'all';
  requires_visit?: boolean;
  visit_deadline?: string;
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
  { id: 4, title: "Revisão" }
];

export function CreateQuoteModalSupabase({ open, onOpenChange, onQuoteCreate, editingQuote }: CreateQuoteModalSupabaseProps) {
  const { enforceLimit, refreshUsage } = useSupabaseSubscriptionGuard();
  const { products, addProduct, isLoading: productsLoading } = useSupabaseProducts();
  const { suppliers, isLoading: suppliersLoading } = useSupabaseSuppliers();
  const { costCenters = [] } = useCostCenters();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showCreateItem, setShowCreateItem] = useState(false);
  
  const [formData, setFormData] = useState<QuoteFormData>({
    title: "",
    description: "",
    deadline: "",
    cost_center_id: "",
    items: [],
    supplier_ids: [],
    communicationMethods: {
      email: true,
      whatsapp: false
    },
    supplierScope: 'local'
  });

  // Load existing quote items when editing
  const loadQuoteItems = async (quoteId: string) => {
    try {
      const { data: items, error } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', quoteId);

      if (error) {
        console.error('Error loading quote items:', error);
        return [];
      }

      return items.map(item => ({
        product_name: item.product_name,
        quantity: item.quantity,
        product_id: item.product_id || undefined
      }));
    } catch (error) {
      console.error('Error loading quote items:', error);
      return [];
    }
  };

  // Initialize form with editing data
  useEffect(() => {
    const initializeForm = async () => {
      if (editingQuote && open) {
        console.log('Initializing form with editing quote:', editingQuote);
        
        // Load items if editing
        const items = await loadQuoteItems(editingQuote.id);
        console.log('Loaded items for editing:', items);
        
        setFormData({
          title: editingQuote.title,
          description: editingQuote.description || "",
          deadline: editingQuote.deadline ? editingQuote.deadline.split('T')[0] : '',
          items: items,
          supplier_ids: editingQuote.supplier_id ? [editingQuote.supplier_id] : [],
          communicationMethods: {
            email: true,
            whatsapp: false,
          },
          supplierScope: 'local'
        });
      } else if (!editingQuote && open) {
        // Reset form for new quote
        setFormData({
          title: "",
          description: "",
          deadline: "",
          cost_center_id: "",
          items: [],
          supplier_ids: [],
          communicationMethods: {
            email: true,
            whatsapp: false
          },
          supplierScope: 'local'
        });
        setCurrentStep(1);
      }
    };

    if (open) {
      initializeForm();
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

  // Função para lidar com a criação de produto a partir do CreateItemModal
  const handleProductCreate = (product: any) => {
    const item = {
      product_name: product.name,
      product_id: product.id,
      quantity: 1  // Quantidade padrão, pode ser editada depois
    };
    
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, item]
    }));
    
    // O CreateItemModal não precisa ser fechado manualmente pois ele se auto-gerencia
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (asDraft: boolean = true) => {
    console.log('=== INICIO handleSubmit ===', { asDraft });
    console.log('🔍 DEBUG: Form data atual:', formData);
    console.log('🔍 DEBUG: Current step:', currentStep);
    console.log('🔍 DEBUG: Can proceed?', canProceed());
    
    try {
      // Verificar limites apenas para novas cotações (não edições)
      if (!editingQuote && !enforceLimit('CREATE_QUOTE')) {
        console.log('=== LIMITE ATINGIDO ===');
        return;
      }

      // DEBUG: Validar dados antes de criar
      console.log('🔍 DEBUG: Validando dados...');
      if (!formData.title || !formData.title.trim()) {
        console.error('❌ Título não preenchido');
        toast({
          title: "Erro",
          description: "Título da cotação é obrigatório",
          variant: "destructive"
        });
        return;
      }

      if (!formData.items || formData.items.length === 0) {
        console.error('❌ Nenhum item adicionado');
        toast({
          title: "Erro",
          description: "Adicione pelo menos um item à cotação",
          variant: "destructive"
        });
        return;
      }

      if (!formData.supplier_ids || formData.supplier_ids.length === 0) {
        console.error('❌ Nenhum fornecedor selecionado');
        toast({
          title: "Erro",
          description: "Selecione pelo menos um fornecedor",
          variant: "destructive"
        });
        return;
      }

      console.log('✅ Dados validados, criando cotação...');
      
      // Convert form data to quote format
      const quoteData: any = {
        title: formData.title,
        description: formData.description,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
        status: asDraft ? 'draft' : 'sent',
        total: 0,
        items_count: formData.items.length,
        responses_count: 0,
        suppliers_sent_count: asDraft ? 0 : formData.supplier_ids.length,
        supplier_scope: formData.supplierScope,
        supplier_ids: formData.supplier_ids,
        requires_visit: formData.requires_visit || false,
        visit_deadline: formData.visit_deadline ? new Date(formData.visit_deadline).toISOString() : null,
        items: formData.items.map(item => ({
          product_name: item.product_name,
          quantity: item.quantity || 1,
          product_id: item.product_id || null,
          unit_price: 0,
          total: 0
        }))
      };
      
      console.log('🔍 DEBUG: Dados da cotação preparados:', quoteData);
      console.log('=== CHAMANDO onQuoteCreate ===');
      await onQuoteCreate(quoteData);
      console.log('=== SUCESSO ===');
      
      // Atualizar contadores após criação
      console.log('[CreateQuote] Atualizando contadores após criação...');
      await refreshUsage();
      
    } catch (error) {
      console.error('=== ERRO ===', error);
    }
  };

  const canProceed = () => {
    // DEBUG: Log do estado atual
    console.log('🔍 DEBUG canProceed - Current step:', currentStep);
    console.log('🔍 DEBUG canProceed - Form data:', {
      title: formData.title,
      titleLength: formData.title.length,
      itemsCount: formData.items.length,
      suppliersCount: formData.supplier_ids.length,
      emailMethod: formData.communicationMethods.email,
      whatsappMethod: formData.communicationMethods.whatsapp
    });
    
    // Sempre permitir se estivermos na última etapa (Revisão)
    if (currentStep === steps.length) {
      const canProceedFinal = formData.title.trim() !== "" && formData.items.length > 0;
      console.log('🔍 DEBUG canProceed - Final step result:', canProceedFinal);
      return canProceedFinal;
    }
    
    let result = false;
    switch (currentStep) {
      case 1:
        result = formData.title.trim() !== "";
        break;
      case 2:
        result = formData.items.length > 0;
        break;
      case 3:
        result = formData.supplier_ids.length > 0;
        break;
      case 4:
        result = true;
        break;
      case 5:
        result = formData.communicationMethods.email || formData.communicationMethods.whatsapp;
        break;
      default:
        result = false;
    }
    
    console.log('🔍 DEBUG canProceed - Step', currentStep, 'result:', result);
    return result;
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
            <div>
              <Label htmlFor="cost_center">Centro de Custo (opcional)</Label>
              <Select 
                value={formData.cost_center_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, cost_center_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um centro de custo" />
                </SelectTrigger>
                <SelectContent>
                  {costCenters?.map((center) => (
                    <SelectItem key={center.id} value={center.id}>
                      {center.name} ({center.code})
                    </SelectItem>
                  )) || []}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requires_visit"
                  checked={formData.requires_visit || false}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, requires_visit: checked as boolean }))
                  }
                />
                <label htmlFor="requires_visit" className="text-sm font-medium cursor-pointer">
                  Esta cotação requer visita técnica prévia
                </label>
              </div>
              
              {formData.requires_visit && (
                <div className="space-y-2 pl-6">
                  <Label>Prazo desejado para a visita</Label>
                  <Input
                    type="date"
                    value={formData.visit_deadline || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      visit_deadline: e.target.value 
                    }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <p className="text-xs text-muted-foreground">
                    Os fornecedores deverão agendar e realizar visita técnica antes de enviar proposta
                  </p>
                </div>
              )}
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
                onClick={() => setShowCreateItem(true)}
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
        const filteredSuppliers = suppliers.filter(s => s.status === 'active').filter(supplier => {
          if (formData.supplierScope === 'local') {
            return !supplier.is_certified; // Fornecedores locais (não certificados)
          } else {
            return true; // Todos os fornecedores (locais + certificados)
          }
        });

        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">Selecionar Fornecedores</h3>
              <p className="text-sm text-muted-foreground">Escolha os fornecedores para enviar a cotação</p>
            </div>

            {/* Seleção de escopo de fornecedores */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Tipo de Fornecedores</label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="local"
                    checked={formData.supplierScope === 'local'}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFormData(prev => ({ ...prev, supplierScope: 'local', supplier_ids: [] }));
                      }
                    }}
                  />
                  <label htmlFor="local" className="text-sm">
                    Apenas Locais
                    <span className="block text-xs text-muted-foreground">Fornecedores cadastrados por você</span>
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="all"
                    checked={formData.supplierScope === 'all'}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFormData(prev => ({ ...prev, supplierScope: 'all', supplier_ids: [] }));
                      }
                    }}
                  />
                  <label htmlFor="all" className="text-sm">
                    Locais + Certificados
                    <span className="block text-xs text-muted-foreground">Inclui fornecedores verificados pelo sistema</span>
                  </label>
                </div>
              </div>
            </div>

            {suppliersLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Carregando fornecedores...</p>
              </div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {formData.supplierScope === 'local' 
                    ? 'Nenhum fornecedor local cadastrado'
                    : 'Nenhum fornecedor disponível'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    {filteredSuppliers.length} fornecedor(es) disponível(is)
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allSelected = filteredSuppliers.every(s => formData.supplier_ids.includes(s.id));
                      setFormData(prev => ({
                        ...prev,
                        supplier_ids: allSelected ? [] : filteredSuppliers.map(s => s.id)
                      }));
                    }}
                  >
                    {filteredSuppliers.every(s => formData.supplier_ids.includes(s.id)) ? 'Desmarcar' : 'Selecionar'} Todos
                  </Button>
                </div>
                
                {filteredSuppliers.map((supplier) => (
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
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{supplier.name}</p>
                          {supplier.is_certified && (
                            <Badge variant="outline" className="text-xs">Certificado</Badge>
                          )}
                        </div>
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

            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Próximo passo:</strong> Após criar a cotação, você poderá enviá-la aos fornecedores selecionados através da tela de cotações.
              </AlertDescription>
            </Alert>
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
          <div className="sr-only">
            Formulário para criar ou editar uma cotação de produtos e serviços
          </div>
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
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => handleSubmit(true)}
                  disabled={!canProceed()}
                >
                  Salvar Rascunho
                </Button>
                <Button 
                  onClick={() => handleSubmit(false)}
                  disabled={!canProceed()}
                >
                  Enviar para Fornecedores
                </Button>
              </div>
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

        {/* Create Item Modal - Mesma tela do módulo Produtos */}
        <CreateItemModal 
          open={showCreateItem}
          onOpenChange={setShowCreateItem}
          onItemCreate={(item) => {
            handleProductCreate(item);
            setShowCreateItem(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}