import React, { useState, useEffect } from 'react';
import { X, Plus, Calendar, Search, ArrowLeft, ArrowRight, AlertCircle, FileText, Package, Users, Building2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Stepper } from '@/components/ui/stepper';
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ProductSearchModalSupabase } from "../quotes/ProductSearchModalSupabase";
import { CreateItemModal } from "../items/CreateItemModal";
import { useSupabaseProducts } from "@/hooks/useSupabaseProducts";
import { useSupabaseSuppliers } from "@/hooks/useSupabaseSuppliers";
import { supabase } from "@/integrations/supabase/client";
import { useCostCenters } from "@/hooks/useCostCenters";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useCondominiosVinculados } from '@/hooks/useCondominiosVinculados';

interface QuoteFormData {
  title: string;
  description: string;
  deadline: string;
  cost_center_id?: string;
  targetType: 'self' | 'condominio';
  targetCondominioId: string;
  items: Array<{
    product_name: string;
    quantity: number;
    product_id?: string;
  }>;
  supplier_ids: string[];
  supplierScope: 'local' | 'all';
}

interface AdministradoraQuoteFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  administradoraId: string;
  administradoraName: string;
  onSuccess?: () => void;
}

const steps = [
  { id: 1, title: "Dados" },
  { id: 2, title: "Itens" },
  { id: 3, title: "Fornecedores" },
  { id: 4, title: "Revisão" }
];

export function AdministradoraQuoteForm({ 
  open, 
  onOpenChange, 
  administradoraId,
  administradoraName,
  onSuccess 
}: AdministradoraQuoteFormProps) {
  const { products } = useSupabaseProducts();
  const { suppliers, isLoading: suppliersLoading } = useSupabaseSuppliers();
  const { costCenters = [] } = useCostCenters();
  const { condominios } = useCondominiosVinculados(administradoraId);
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<QuoteFormData>({
    title: "",
    description: "",
    deadline: "",
    cost_center_id: "",
    targetType: 'self',
    targetCondominioId: "",
    items: [],
    supplier_ids: [],
    supplierScope: 'local'
  });

  useEffect(() => {
    if (!open) {
      // Reset form quando fechar
      setFormData({
        title: "",
        description: "",
        deadline: "",
        cost_center_id: "",
        targetType: 'self',
        targetCondominioId: "",
        items: [],
        supplier_ids: [],
        supplierScope: 'local'
      });
      setCurrentStep(1);
    }
  }, [open]);

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
        product_name: product.name || product.description,
        product_id: product.id,
        quantity: quantity
      }]
    }));
    setShowProductSearch(false);
  };

  const handleProductCreate = (product: any) => {
    const item = {
      product_name: product.name || product.description,
      product_id: product.id,
      quantity: 1
    };
    
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, item]
    }));
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateQuantity = (index: number, quantity: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, quantity: Math.max(1, quantity) } : item
      )
    }));
  };

  const handleSubmit = async () => {
    console.log('🏗️ AdministradoraQuoteForm: Criando cotação');
    setIsSubmitting(true);

    try {
      // Validações
      if (!formData.title || !formData.title.trim()) {
        toast({
          title: "Título obrigatório",
          description: "Informe o título da cotação",
          variant: "destructive"
        });
        return;
      }

      if (!formData.items || formData.items.length === 0) {
        toast({
          title: "Itens obrigatórios",
          description: "Adicione pelo menos um item à cotação",
          variant: "destructive"
        });
        return;
      }

      if (!formData.supplier_ids || formData.supplier_ids.length === 0) {
        toast({
          title: "Fornecedores obrigatórios",
          description: "Selecione pelo menos um fornecedor",
          variant: "destructive"
        });
        return;
      }

      if (formData.targetType === 'condominio' && !formData.targetCondominioId) {
        toast({
          title: "Condomínio obrigatório",
          description: "Selecione o condomínio para esta cotação",
          variant: "destructive"
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Definir client_id e on_behalf_of_client_id
      const clientId = administradoraId;
      const onBehalfOfClientId = formData.targetType === 'condominio' ? formData.targetCondominioId : null;

      // Gerar ID temporário
      const tempId = `RFQ${Date.now().toString().slice(-6)}`;
      
      // Criar cotação
      const { data: quotes, error: quoteError } = await supabase
        .from('quotes')
        .insert([{
          id: tempId,
          client_id: clientId,
          client_name: administradoraName,
          title: formData.title,
          description: formData.description || null,
          deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
          cost_center_id: formData.cost_center_id || null,
          on_behalf_of_client_id: onBehalfOfClientId,
          created_by: user.id,
          status: 'draft',
          total: 0,
          items_count: formData.items.length,
          supplier_scope: formData.supplierScope,
          selected_supplier_ids: formData.supplier_ids
        }])
        .select();

      if (quoteError || !quotes || quotes.length === 0) {
        console.error('❌ Erro ao criar cotação:', quoteError);
        throw quoteError || new Error('Falha ao criar cotação');
      }

      const quote = quotes[0];
      console.log('✅ Cotação criada:', quote.id);

      // Criar itens
      const itemsToInsert = formData.items.map(item => ({
        quote_id: quote.id,
        product_name: item.product_name,
        product_id: item.product_id || null,
        quantity: item.quantity,
        unit_price: 0,
        total: 0,
        client_id: clientId
      }));

      const { error: itemsError } = await supabase
        .from('quote_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('❌ Erro ao criar itens:', itemsError);
        throw itemsError;
      }

      console.log('✅ Itens criados com sucesso');

      toast({
        title: "Cotação criada!",
        description: `${formData.title} foi criada com sucesso.`
      });

      onOpenChange(false);
      onSuccess?.();

    } catch (error: any) {
      console.error('❌ Erro:', error);
      toast({
        title: "Erro ao criar cotação",
        description: error.message || "Não foi possível criar a cotação. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        if (formData.targetType === 'condominio' && !formData.targetCondominioId) {
          return false;
        }
        return formData.title.trim() !== "";
      case 2:
        return formData.items.length > 0;
      case 3:
        return formData.supplier_ids.length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetType">Cotação para *</Label>
                <Select
                  value={formData.targetType}
                  onValueChange={(value: 'self' | 'condominio') => 
                    setFormData(prev => ({ ...prev, targetType: value, targetCondominioId: '' }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="self">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Administradora
                      </div>
                    </SelectItem>
                    <SelectItem value="condominio">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Condomínio Vinculado
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.targetType === 'condominio' && (
                <div className="space-y-2">
                  <Label htmlFor="condominio">Selecione o Condomínio *</Label>
                  <Select
                    value={formData.targetCondominioId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, targetCondominioId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {condominios.map(cond => (
                        <SelectItem key={cond.id} value={cond.id}>
                          {cond.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

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
            
            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="cost_center">Centro de Custo</Label>
                <Select 
                  value={formData.cost_center_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, cost_center_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Opcional" />
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
                    <div className="flex-1">
                      <p className="font-medium">{item.product_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-muted-foreground">Qtd:</span>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateQuantity(index, parseInt(e.target.value) || 1)}
                          className="w-20 h-8"
                        />
                      </div>
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
            return !supplier.is_certified;
          } else {
            return true;
          }
        });

        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">Selecionar Fornecedores</h3>
              <p className="text-sm text-muted-foreground">Escolha os fornecedores para enviar a cotação</p>
            </div>

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
                  <label htmlFor="local" className="text-sm cursor-pointer">
                    Apenas Locais
                    <span className="block text-xs text-muted-foreground">Fornecedores cadastrados</span>
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
                  <label htmlFor="all" className="text-sm cursor-pointer">
                    Locais + Certificados
                    <span className="block text-xs text-muted-foreground">Inclui verificados</span>
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
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredSuppliers.map((supplier) => (
                  <div key={supplier.id} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-secondary/20">
                    <Checkbox
                      id={supplier.id}
                      checked={formData.supplier_ids.includes(supplier.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData(prev => ({ ...prev, supplier_ids: [...prev.supplier_ids, supplier.id] }));
                        } else {
                          setFormData(prev => ({ 
                            ...prev, 
                            supplier_ids: prev.supplier_ids.filter(id => id !== supplier.id) 
                          }));
                        }
                      }}
                    />
                    <label htmlFor={supplier.id} className="flex-1 cursor-pointer">
                      <p className="font-medium">{supplier.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{supplier.email}</span>
                        {supplier.is_certified && (
                          <Badge variant="secondary" className="text-xs">Certificado</Badge>
                        )}
                      </div>
                    </label>
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
              <p className="text-sm text-muted-foreground">Confira os dados antes de criar</p>
            </div>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Destinatário</p>
                  <p className="font-medium">
                    {formData.targetType === 'self' 
                      ? 'Administradora' 
                      : condominios.find(c => c.id === formData.targetCondominioId)?.name}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Título</p>
                  <p className="font-medium">{formData.title}</p>
                </div>

                {formData.description && (
                  <div>
                    <p className="text-sm text-muted-foreground">Descrição</p>
                    <p className="text-sm">{formData.description}</p>
                  </div>
                )}

                {formData.deadline && (
                  <div>
                    <p className="text-sm text-muted-foreground">Prazo</p>
                    <p className="font-medium">
                      {new Date(formData.deadline).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground">Itens</p>
                  <div className="mt-2 space-y-1">
                    {formData.items.map((item, idx) => (
                      <div key={idx} className="text-sm flex justify-between">
                        <span>{item.product_name}</span>
                        <span className="text-muted-foreground">Qtd: {item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Fornecedores Selecionados</p>
                  <p className="font-medium">{formData.supplier_ids.length} fornecedor(es)</p>
                </div>
              </CardContent>
            </Card>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                A cotação será criada como rascunho. Você poderá enviá-la aos fornecedores posteriormente.
              </AlertDescription>
            </Alert>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Nova Cotação - Administradora
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="px-6 pb-6">
              {/* Stepper */}
              <div className="mb-6">
                <Stepper steps={steps} currentStep={currentStep} />
              </div>

              {/* Conteúdo da etapa */}
              <div className="min-h-[400px]">
                {renderStep()}
              </div>
            </div>
          </div>

          {/* Footer fixo */}
          <div className="border-t p-6 flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1 || isSubmitting}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>

            {currentStep < steps.length ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed() || isSubmitting}
              >
                Próximo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
              >
                {isSubmitting ? "Criando..." : "Criar Cotação"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modais auxiliares */}
      <ProductSearchModalSupabase
        open={showProductSearch}
        onClose={() => setShowProductSearch(false)}
        onProductSelect={handleProductSelect}
      />

      <CreateItemModal
        open={showCreateItem}
        onOpenChange={setShowCreateItem}
        onItemCreate={handleProductCreate}
      />
    </>
  );
}
