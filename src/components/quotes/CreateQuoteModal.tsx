import { useState } from "react";
import { Plus, X, FileText, Package, Users, Mail, MessageCircle, Search, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Stepper } from "@/components/ui/stepper";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ProductSearchModal } from "./ProductSearchModal";
import { NewProductForm } from "./NewProductForm";
import { NewSupplierModal } from "@/components/suppliers/NewSupplierModal";
import { mockSuppliers, mockSupplierGroups, Product, Supplier, SupplierGroup } from "@/data/mockData";

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
  { id: 5, title: "Forma de Envio" }
];

export function CreateQuoteModal({ open, onOpenChange, onQuoteCreate }: CreateQuoteModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false);
  
  const [suppliers, setSuppliers] = useState(mockSuppliers);
  const [supplierGroups, setSupplierGroups] = useState(mockSupplierGroups);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [showEditSupplierModal, setShowEditSupplierModal] = useState(false);
  const [contactValidationErrors, setContactValidationErrors] = useState<{email: string[], whatsapp: string[]}>({
    email: [],
    whatsapp: []
  });
  
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

  const suggestedSuppliers = mockSuppliers.filter(supplier => {
    if (formData.items.length === 0) return false;
    
    // Get categories from selected items
    const itemCategories = formData.items.map(item => item.product.category.toLowerCase());
    
    // If supplier has specialties that match item categories
    if (supplier.specialties && supplier.specialties.length > 0) {
      return supplier.specialties.some(specialty => 
        itemCategories.some(category => 
          specialty.toLowerCase().includes(category) || 
          category.includes(specialty.toLowerCase()) ||
          (category.includes('construção') && specialty.toLowerCase().includes('construção')) ||
          (category.includes('limpeza') && specialty.toLowerCase().includes('limpeza')) ||
          (category.includes('elétrica') && specialty.toLowerCase().includes('elétrica')) ||
          (category.includes('jardinagem') && specialty.toLowerCase().includes('jardinagem'))
        )
      );
    }
    
    // Fallback to simple name matching
    const supplierName = supplier.name.toLowerCase();
    return itemCategories.some(category => 
      supplierName.includes(category) || 
      (category.includes('limpeza') && supplierName.includes('limpeza')) ||
      (category.includes('materiais') && supplierName.includes('materiais')) ||
      (category.includes('elétrica') && supplierName.includes('elétrica')) ||
      (category.includes('jardinagem') && supplierName.includes('jardinagem'))
    );
  }).filter(supplier => supplier.status === 'active');

  const getGroupName = (groupId?: string) => {
    if (!groupId) return null;
    const group = mockSupplierGroups.find(g => g.id === groupId);
    return group;
  };

  const handleStepClick = (stepId: number) => {
    // Only allow navigation to current or completed steps
    if (stepId <= currentStep) {
      setCurrentStep(stepId);
      setContactValidationErrors({ email: [], whatsapp: [] }); // Clear validation errors when navigating
    }
  };

  const validateSupplierContacts = () => {
    const emailErrors: string[] = [];
    const whatsappErrors: string[] = [];
    
    if (formData.communicationMethods.email) {
      formData.suppliers.forEach(supplier => {
        if (!supplier.email || supplier.email.trim() === '') {
          emailErrors.push(supplier.name);
        }
      });
    }
    
    if (formData.communicationMethods.whatsapp) {
      formData.suppliers.forEach(supplier => {
        if (!supplier.phone || supplier.phone.trim() === '') {
          whatsappErrors.push(supplier.name);
        }
      });
    }
    
    return { emailErrors, whatsappErrors };
  };

  const updateContactValidationErrors = () => {
    const { emailErrors, whatsappErrors } = validateSupplierContacts();
    setContactValidationErrors({ email: emailErrors, whatsapp: whatsappErrors });
    return emailErrors.length === 0 && whatsappErrors.length === 0;
  };

  const handleNext = () => {
    if (currentStep === 5) {
      // Validate contacts before proceeding
      if (!updateContactValidationErrors()) {
        return;
      }
    }
    
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

  const handleSupplierCreate = (supplier: Supplier) => {
    setSuppliers(prev => [...prev, supplier]);
    setFormData(prev => ({
      ...prev,
      suppliers: [...prev.suppliers, supplier]
    }));
  };

  const handleSupplierUpdate = (updatedSupplier: Supplier) => {
    setSuppliers(prev => prev.map(s => s.id === updatedSupplier.id ? updatedSupplier : s));
    setFormData(prev => ({
      ...prev,
      suppliers: prev.suppliers.map(s => s.id === updatedSupplier.id ? updatedSupplier : s)
    }));
    setEditingSupplier(null);
    setShowEditSupplierModal(false);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setShowEditSupplierModal(true);
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = () => {
    if (!updateContactValidationErrors()) {
      return;
    }
    
    onQuoteCreate(formData);
    onOpenChange(false);
    setCurrentStep(1);
    setContactValidationErrors({ email: [], whatsapp: [] });
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

            {/* Fornecedores Sugeridos */}
            {suggestedSuppliers.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Fornecedores Sugeridos</CardTitle>
                    <p className="text-xs text-muted-foreground">Baseado nos itens selecionados</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {suggestedSuppliers.slice(0, 3).map((supplier) => (
                    <div key={supplier.id} className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        {supplier.groupId && getGroupName(supplier.groupId) && (
                          <div className={`w-3 h-3 rounded-full ${getGroupName(supplier.groupId)?.color}`}></div>
                        )}
                        <div>
                          <p className="font-medium text-sm">{supplier.name}</p>
                          <p className="text-xs text-muted-foreground">{supplier.email}</p>
                          {supplier.specialties && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {supplier.specialties.slice(0, 2).map((specialty) => (
                                <Badge key={specialty} variant="secondary" className="text-xs py-0">
                                  {specialty}
                                </Badge>
                              ))}
                              {supplier.specialties.length > 2 && (
                                <Badge variant="secondary" className="text-xs py-0">
                                  +{supplier.specialties.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
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
            )}

            {/* Todos os Fornecedores */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Todos os Fornecedores</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowNewSupplierModal(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Fornecedor
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 max-h-60 overflow-y-auto">
                {mockSuppliers.filter(s => s.status === 'active').map((supplier) => (
                  <div key={supplier.id} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      {supplier.groupId && getGroupName(supplier.groupId) && (
                        <div className={`w-3 h-3 rounded-full ${getGroupName(supplier.groupId)?.color}`}></div>
                      )}
                      <div>
                        <p className="font-medium text-sm">{supplier.name}</p>
                        <p className="text-xs text-muted-foreground">{supplier.email}</p>
                      </div>
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
                         <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2 mb-1">
                             {supplier.groupId && getGroupName(supplier.groupId) && (
                               <div className={`w-3 h-3 rounded-full ${getGroupName(supplier.groupId)?.color}`}></div>
                             )}
                             <p className="font-medium text-sm">{supplier.name}</p>
                           </div>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => handleEditSupplier(supplier)}
                             className="text-xs px-2 py-1 h-auto"
                           >
                             Editar
                           </Button>
                         </div>
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
                {/* Validation Errors */}
                {(contactValidationErrors.email.length > 0 || contactValidationErrors.whatsapp.length > 0) && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <p className="text-sm font-medium text-destructive">Dados de contato incompletos</p>
                    </div>
                    
                    {contactValidationErrors.email.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs text-destructive">
                          Fornecedores sem e-mail: {contactValidationErrors.email.join(', ')}
                        </p>
                      </div>
                    )}
                    
                    {contactValidationErrors.whatsapp.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs text-destructive">
                          Fornecedores sem WhatsApp: {contactValidationErrors.whatsapp.join(', ')}
                        </p>
                      </div>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentStep(3)}
                      className="text-xs mt-2"
                    >
                      Ir para Fornecedores
                    </Button>
                  </div>
                )}

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
            <Stepper steps={steps} currentStep={currentStep} onStepClick={handleStepClick} />
            
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

      <NewSupplierModal
        open={showNewSupplierModal}
        onOpenChange={setShowNewSupplierModal}
        onSupplierCreate={handleSupplierCreate}
        availableGroups={supplierGroups}
      />
      
      {/* Edit Supplier Modal */}
      {editingSupplier && (
        <NewSupplierModal
          open={showEditSupplierModal}
          onOpenChange={setShowEditSupplierModal}
          onSupplierCreate={handleSupplierUpdate}
          availableGroups={supplierGroups}
          editingSupplier={editingSupplier}
        />
      )}
    </>
  );
}