import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Stepper } from '@/components/ui/stepper';
import { UserPlus, MessageCircle, Building, CheckCircle, ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useSupabaseSuppliers } from '@/hooks/useSupabaseSuppliers';

interface ClientSupplierModalProps {
  open: boolean;
  onClose: () => void;
}

const supplierTypes = [
  { value: 'local', label: 'Local', description: 'Fornecedor da região' },
  { value: 'national', label: 'Nacional', description: 'Atende todo o país' },
  { value: 'international', label: 'Internacional', description: 'Fornecedor internacional' }
];

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

const regions = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];

const steps = [
  { id: 1, title: 'Dados Básicos', description: 'Nome e identificação' },
  { id: 2, title: 'Contato', description: 'WhatsApp e email para cotações' },
  { id: 3, title: 'Especialidades', description: 'Produtos e serviços' },
  { id: 4, title: 'Confirmação', description: 'Revisar e finalizar' }
];

export function ClientSupplierModal({ open, onClose }: ClientSupplierModalProps) {
  const { createSupplier } = useSupabaseSuppliers();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    whatsapp: '',
    website: '',
    specialties: [] as string[],
    type: 'local' as const,
    region: '',
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
      email: '',
      phone: '',
      whatsapp: '',
      website: '',
      specialties: [],
      type: 'local',
      region: '',
      status: 'active'
    });
    setErrors({});
    setCurrentStep(1);
    setNewSpecialty('');
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    
    setIsLoading(true);
    try {
      await createSupplier(formData);
      
      toast({
        title: "Fornecedor cadastrado com sucesso!",
        description: `${formData.name} foi adicionado e receberá cotações via WhatsApp.`
      });

      resetForm();
      onClose();
    } catch (error) {
      console.error('Error creating supplier:', error);
      toast({
        title: "Erro ao cadastrar fornecedor",
        description: "Não foi possível cadastrar o fornecedor. Tente novamente.",
        variant: "destructive"
      });
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
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                  placeholder="00.000.000/0000-00"
                  className={errors.cnpj ? "border-destructive" : ""}
                />
                {errors.cnpj && <p className="text-xs text-destructive">{errors.cnpj}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de Fornecedor</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as any }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {supplierTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-muted-foreground">{type.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="region">Região</Label>
                  <Select value={formData.region} onValueChange={(value) => setFormData(prev => ({ ...prev, region: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map(region => (
                        <SelectItem key={region} value={region}>
                          {region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                <Label htmlFor="email">Email * (Backup e documentos)</Label>
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
                  <p className="text-xs text-muted-foreground">CNPJ: {formData.cnpj}</p>
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Cadastrar Novo Fornecedor
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Cadastre fornecedores para receber cotações automaticamente
          </p>
        </DialogHeader>

        <div className="flex-1 flex flex-col">
          {/* Stepper */}
          <div className="flex-shrink-0 py-4">
            <Stepper currentStep={currentStep} steps={steps} />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {renderStepContent()}
          </div>

          {/* Navigation */}
          <div className="flex-shrink-0 flex justify-between items-center pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={currentStep === 1 ? onClose : prevStep}
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
                "Cadastrando..."
              ) : currentStep === steps.length ? (
                "Finalizar Cadastro"
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