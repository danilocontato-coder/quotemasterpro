import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Stepper } from '@/components/ui/stepper';
import { UserPlus, MessageCircle, Building, CheckCircle, ArrowLeft, ArrowRight, X, MapPin, Check, ChevronsUpDown, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useSupabaseSuppliers } from '@/hooks/useSupabaseSuppliers';
import { brazilStates } from '@/data/brazilStates';
import { CNPJSearchModal } from './CNPJSearchModal';
import { useSupplierAssociation } from '@/hooks/useSupplierAssociation';

interface ClientSupplierModalProps {
  open: boolean;
  onClose: (open: boolean) => void;
  editingSupplier?: any;
}


const commonSpecialties = [
  'Materiais de Construção',
  'Produtos de Limpeza', 
  'Elétrica e Iluminação',
  'Ferramentas',
  'Jardinagem',
  'Serviços de Manutenção',
  'Segurança',
  'Alimentação',
  'Móveis e Decoração',
  'Pintura e Acabamento',
  'Hidráulica',
  'Climatização'
];



const steps = [
  { id: 1, title: 'Dados Básicos', description: 'Nome e identificação' },
  { id: 2, title: 'Contato', description: 'WhatsApp e email para cotações' },
  { id: 3, title: 'Especialidades', description: 'Produtos e serviços' },
  { id: 4, title: 'Confirmação', description: 'Revisar e finalizar' }
];

export function ClientSupplierModal({ open, onClose, editingSupplier }: ClientSupplierModalProps) {
  const { createSupplier, updateSupplier, refetch } = useSupabaseSuppliers();
  const { toast } = useToast();
  const { associateSupplierToClient } = useSupplierAssociation();

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    address: '',
    email: '',
    phone: '',
    whatsapp: '',
    website: '',
    specialties: [] as string[],
    type: 'local' as const,
    state: '',
    city: '',
    status: 'active' as const
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newSpecialty, setNewSpecialty] = useState('');

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    
    switch (step) {
      case 1:
        if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório';
        if (!formData.cnpj.trim()) newErrors.cnpj = 'CNPJ é obrigatório';
        if (!formData.state.trim()) newErrors.state = 'Estado é obrigatório';
        if (!formData.city.trim()) newErrors.city = 'Cidade é obrigatória';
        break;
      case 2:
        if (!formData.email.trim()) newErrors.email = 'Email é obrigatório';
        if (!formData.whatsapp.trim()) newErrors.whatsapp = 'WhatsApp é obrigatório';
        break;
      case 3:
        if (formData.specialties.length === 0) newErrors.specialties = 'Selecione pelo menos uma especialidade';
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const addSpecialty = (specialty: string) => {
    if (specialty.trim() && !formData.specialties.includes(specialty.trim())) {
      setFormData(prev => ({
        ...prev,
        specialties: [...prev.specialties, specialty.trim()]
      }));
      setNewSpecialty('');
    }
  };

  const removeSpecialty = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s !== specialty)
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      cnpj: '',
      address: '',
      email: '',
      phone: '',
      whatsapp: '',
      website: '',
      specialties: [],
      type: 'local',
      state: '',
      city: '',
      status: 'active'
    });
    setErrors({});
    setCurrentStep(1);
    setNewSpecialty('');
  };

  // Load editing supplier data when modal opens
  React.useEffect(() => {
    if (open && editingSupplier) {
      const addressData = editingSupplier.address || {};
      setFormData({
        name: editingSupplier.name || '',
        cnpj: editingSupplier.cnpj || '',
        address: typeof addressData === 'string' ? addressData : (addressData.street || ''),
        email: editingSupplier.email || '',
        phone: editingSupplier.phone || '',
        whatsapp: editingSupplier.whatsapp || '',
        website: editingSupplier.website || '',
        specialties: editingSupplier.specialties || [],
        type: editingSupplier.type || 'local',
        state: editingSupplier.state || '',
        city: editingSupplier.city || '',
        status: editingSupplier.status || 'active'
      });
      setCurrentStep(1);
      setErrors({});
    } else if (open && !editingSupplier) {
      resetForm();
    }
  }, [open, editingSupplier]);

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    
    setIsLoading(true);
    try {
      let result;
      
      if (editingSupplier) {
        // Update existing supplier
        result = await updateSupplier(editingSupplier.id, formData);
        if (result) {
          toast({
            title: "Fornecedor atualizado com sucesso!",
            description: `${formData.name} foi atualizado.`
          });
        }
      } else {
        // Create new supplier
        result = await createSupplier(formData);
        if (result) {
          toast({
            title: "Fornecedor cadastrado com sucesso!",
            description: `${formData.name} foi adicionado e receberá cotações via WhatsApp.`
          });
        }
      }
      
      if (result) {
        // Force immediate refetch to update the UI
        await refetch();
        resetForm();
        onClose(false);
      }
    } catch (error: any) {
      console.error('Error saving supplier:', error);
      
      // Check for duplicate CNPJ error
      if (error?.code === '23505' && error?.message?.includes('suppliers_cnpj_key')) {
        toast({
          title: "CNPJ já cadastrado",
          description: "Este CNPJ já está cadastrado no sistema. Use um CNPJ diferente ou verifique se o fornecedor já existe.",
          variant: "destructive"
        });
      } else if (error?.code === '23505' && error?.message?.includes('suppliers_cnpj_client_unique')) {
        toast({
          title: "Fornecedor já cadastrado",
          description: "Este fornecedor já está cadastrado para este cliente. Use um CNPJ diferente ou edite o fornecedor existente.",
          variant: "destructive"
        });
      } else {
        toast({
          title: editingSupplier ? "Erro ao atualizar fornecedor" : "Erro ao cadastrar fornecedor",
          description: "Não foi possível salvar o fornecedor. Tente novamente.",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Dados Básicos do Fornecedor
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Informe o nome e identificação da empresa
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Empresa *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Construções Silva Ltda"
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ *</Label>
                <CNPJSearchModal
                  cnpj={formData.cnpj}
                  onCNPJChange={(cnpj) => setFormData(prev => ({ ...prev, cnpj }))}
                  onReuseData={async (supplier) => {
                    try {
                      await associateSupplierToClient(supplier.id);
                      toast({
                        title: "Fornecedor associado",
                        description: `O fornecedor ${supplier.name} foi associado ao seu cliente.`,
                      });
                      onClose(false);
                      await refetch();
                    } catch (err) {
                      toast({
                        title: "Erro na associação",
                        description: "Não foi possível associar o fornecedor. Tente novamente.",
                        variant: "destructive",
                      });
                    }
                  }}
                />
                {errors.cnpj && <p className="text-xs text-destructive">{errors.cnpj}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Estado *
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={`w-full justify-between ${errors.state ? "border-destructive" : ""}`}
                      >
                        {formData.state
                          ? brazilStates.find(state => state.code === formData.state)?.name
                          : "Selecione o estado..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 z-50">
                      <Command>
                        <CommandInput placeholder="Buscar estado..." />
                        <CommandEmpty>Nenhum estado encontrado.</CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-auto">
                          {brazilStates.map((state) => (
                            <CommandItem
                              key={state.code}
                              value={state.name}
                              onSelect={() => {
                                setFormData(prev => ({ ...prev, state: state.code, city: '' }));
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  formData.state === state.code ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              {state.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {errors.state && <p className="text-xs text-destructive">{errors.state}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">Cidade *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={`w-full justify-between ${errors.city ? "border-destructive" : ""} ${!formData.state ? "opacity-50 cursor-not-allowed" : ""}`}
                        disabled={!formData.state}
                      >
                        {formData.city || (formData.state ? "Selecione a cidade..." : "Selecione o estado primeiro")}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 z-50">
                      <Command>
                        <CommandInput placeholder="Buscar cidade..." />
                        <CommandEmpty>Nenhuma cidade encontrada.</CommandEmpty>
                        <CommandGroup className="max-h-[300px] overflow-auto">
                          {formData.state && brazilStates
                            .find(state => state.code === formData.state)
                            ?.cities.map(city => (
                              <CommandItem
                                key={city}
                                value={city}
                                onSelect={() => {
                                  setFormData(prev => ({ ...prev, city }));
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    formData.city === city ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                {city}
                              </CommandItem>
                            ))
                          }
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Endereço Completo (Opcional)</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Rua, número, bairro, CEP..."
                />
                <p className="text-xs text-muted-foreground">
                  Rua, número, bairro e CEP para localização precisa
                </p>
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-green-600" />
                Informações de Contato
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                WhatsApp e email são essenciais para o envio de cotações
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp" className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-green-600" />
                  WhatsApp * (Principal meio de envio)
                </Label>
                <Input
                  id="whatsapp"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  className={`${errors.whatsapp ? "border-destructive" : "border-green-200"} focus:border-green-400`}
                />
                {errors.whatsapp && <p className="text-xs text-destructive">{errors.whatsapp}</p>}
                <p className="text-xs text-green-600">
                  ✓ As cotações serão enviadas automaticamente para este número
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email * (Usado para cotações)</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="contato@empresa.com"
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                <p className="text-xs text-muted-foreground">
                  Usado para envio de documentos e comunicações formais
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone Fixo (Opcional)</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(11) 3333-4444"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website (Opcional)</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://www.empresa.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Especialidades e Produtos</CardTitle>
              <p className="text-sm text-muted-foreground">
                Selecione as áreas de atuação para direcionar as cotações corretas
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label>Especialidades Comuns</Label>
                <div className="flex flex-wrap gap-2">
                  {commonSpecialties.map((specialty) => (
                    <Badge
                      key={specialty}
                      variant={formData.specialties.includes(specialty) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => 
                        formData.specialties.includes(specialty) 
                          ? removeSpecialty(specialty)
                          : addSpecialty(specialty)
                      }
                    >
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Adicionar Especialidade Personalizada</Label>
                <div className="flex gap-2">
                  <Input
                    value={newSpecialty}
                    onChange={(e) => setNewSpecialty(e.target.value)}
                    placeholder="Digite uma especialidade específica"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty(newSpecialty))}
                  />
                  <Button 
                    type="button" 
                    onClick={() => addSpecialty(newSpecialty)} 
                    variant="outline"
                    disabled={!newSpecialty.trim()}
                  >
                    Adicionar
                  </Button>
                </div>
              </div>

              {formData.specialties.length > 0 && (
                <div className="space-y-2">
                  <Label>Especialidades Selecionadas ({formData.specialties.length})</Label>
                  <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg">
                    {formData.specialties.map((specialty) => (
                      <Badge key={specialty} variant="secondary" className="flex items-center gap-1">
                        {specialty}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeSpecialty(specialty)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {errors.specialties && (
                <p className="text-xs text-destructive">{errors.specialties}</p>
              )}
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Confirmar Cadastro
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Revise as informações antes de finalizar
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Empresa</Label>
                  <p className="text-sm">{formData.name}</p>
                  <p className="text-xs text-muted-foreground">
                    CNPJ: {formData.cnpj}
                    {formData.state && formData.city && (
                      <span className="ml-2">
                        • {formData.city}/{formData.state}
                      </span>
                    )}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Contato para Cotações</Label>
                  <div className="flex items-center gap-2 text-sm">
                    <MessageCircle className="h-4 w-4 text-green-600" />
                    {formData.whatsapp}
                  </div>
                  <p className="text-xs text-muted-foreground">Email: {formData.email}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Especialidades ({formData.specialties.length})</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {formData.specialties.map((specialty) => (
                      <Badge key={specialty} variant="outline" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">Pronto para receber cotações!</span>
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    Este fornecedor receberá cotações automaticamente via WhatsApp quando houver solicitações nas especialidades selecionadas.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => onClose(open)}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {editingSupplier ? 'Editar Fornecedor' : 'Cadastrar Novo Fornecedor'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {editingSupplier 
              ? 'Atualize as informações do fornecedor'
              : 'Cadastre fornecedores para receber cotações automaticamente'
            }
          </p>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Stepper */}
          <div className="flex-shrink-0 py-4">
            <Stepper currentStep={currentStep} steps={steps} />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-1">
            {renderStepContent()}
          </div>

          {/* Navigation */}
          <div className="flex-shrink-0 flex justify-between items-center pt-4 border-t bg-background">
            <Button
              type="button"
              variant="outline"
              onClick={currentStep === 1 ? () => onClose(false) : prevStep}
              disabled={isLoading}
            >
              {currentStep === 1 ? (
                "Cancelar"
              ) : (
                <>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Anterior
                </>
              )}
            </Button>

            <div className="text-xs text-muted-foreground">
              Passo {currentStep} de {steps.length}
            </div>

            <Button
              onClick={currentStep === steps.length ? handleSubmit : nextStep}
              disabled={isLoading}
              className="btn-corporate"
            >
              {isLoading ? (
                editingSupplier ? "Atualizando..." : "Cadastrando..."
              ) : currentStep === steps.length ? (
                editingSupplier ? "Atualizar Fornecedor" : "Finalizar Cadastro"
              ) : (
                <>
                  Próximo
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}