import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Building2, Shield, BadgeCheck, Wallet, Users, BarChart3, 
  CheckCircle2, ArrowRight, ArrowLeft, Sparkles, TrendingUp,
  Clock, Headphones, CreditCard, Globe, Loader2, AlertCircle, PartyPopper
} from 'lucide-react';
import { useBranding } from '@/contexts/BrandingContext';
import { usePlatformCommission } from '@/hooks/usePlatformCommission';
import { EmailVerificationInput } from '@/components/supplier/EmailVerificationInput';
import { CNPJValidationInput, CompanyData } from '@/components/supplier/CNPJValidationInput';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Step interface
interface FormData {
  // Step 1
  email: string;
  password: string;
  confirmPassword: string;
  emailVerified: boolean;
  
  // Step 2
  cnpj: string;
  cnpjValidated: boolean;
  companyName: string;
  tradeName: string;
  
  // Step 3
  phone: string;
  whatsapp: string;
  website: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  
  // Step 4
  specialties: string;
  bankName: string;
  bankAgency: string;
  bankAccount: string;
  pixKey: string;
}

const initialFormData: FormData = {
  email: '',
  password: '',
  confirmPassword: '',
  emailVerified: false,
  cnpj: '',
  cnpjValidated: false,
  companyName: '',
  tradeName: '',
  phone: '',
  whatsapp: '',
  website: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  specialties: '',
  bankName: '',
  bankAgency: '',
  bankAccount: '',
  pixKey: ''
};

const STEPS = [
  { id: 1, title: 'Acesso', description: 'E-mail e senha' },
  { id: 2, title: 'Empresa', description: 'Dados da empresa' },
  { id: 3, title: 'Contato', description: 'Endereço e contato' },
  { id: 4, title: 'Finalização', description: 'Especialidades e banco' }
];

const ADVANTAGES = [
  { 
    icon: Globe, 
    title: 'Visibilidade Nacional',
    description: 'Acesse clientes de todo o Brasil através da nossa plataforma'
  },
  { 
    icon: BadgeCheck, 
    title: 'Selo de Certificação',
    description: 'Destaque-se com nosso selo de fornecedor verificado'
  },
  { 
    icon: Wallet, 
    title: 'Pagamento Garantido',
    description: 'Sistema escrow protege seu pagamento após entrega'
  },
  { 
    icon: Headphones, 
    title: 'Suporte Dedicado',
    description: 'Atendimento por WhatsApp e e-mail para tirar dúvidas'
  },
  { 
    icon: BarChart3, 
    title: 'Dashboard Completo',
    description: 'Acompanhe cotações, vendas e recebíveis em tempo real'
  },
  { 
    icon: TrendingUp, 
    title: 'Crescimento',
    description: 'Aumente suas vendas com nossa base de clientes ativos'
  }
];

export default function SupplierSignup() {
  const navigate = useNavigate();
  const { settings: brandingSettings } = useBranding();
  const { percentage: commissionPercentage, isPromoMode, isLoading: isLoadingCommission } = usePlatformCommission();
  
  const [currentStep, setCurrentStep] = useState(0); // 0 = landing, 1-4 = form steps
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleEmailVerified = () => {
    handleInputChange('emailVerified', true);
  };

  const handleCNPJValidated = (valid: boolean, data?: CompanyData) => {
    handleInputChange('cnpjValidated', valid);
    if (valid && data) {
      const endereco = data.endereco;
      setFormData(prev => ({
        ...prev,
        cnpjValidated: true,
        companyName: data.razao_social || '',
        tradeName: data.nome_fantasia || '',
        address: endereco ? `${endereco.logradouro}, ${endereco.numero || 'S/N'}` : '',
        city: endereco?.municipio || '',
        state: endereco?.uf || '',
        zipCode: endereco?.cep || ''
      }));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<FormData> = {};
    
    switch (step) {
      case 1:
        if (!formData.email) newErrors.email = 'E-mail obrigatório';
        if (!formData.emailVerified) newErrors.email = 'E-mail precisa ser verificado';
        if (!formData.password) newErrors.password = 'Senha obrigatória';
        if (formData.password.length < 6) newErrors.password = 'Senha deve ter no mínimo 6 caracteres';
        if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Senhas não conferem';
        break;
      case 2:
        if (!formData.cnpj) newErrors.cnpj = 'CNPJ obrigatório';
        if (!formData.cnpjValidated) newErrors.cnpj = 'CNPJ precisa ser validado';
        if (!formData.companyName) newErrors.companyName = 'Razão social obrigatória';
        break;
      case 3:
        if (!formData.phone && !formData.whatsapp) newErrors.phone = 'Informe telefone ou WhatsApp';
        break;
      case 4:
        // Optional fields
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 0) {
      setCurrentStep(1);
      return;
    }
    
    if (!validateStep(currentStep)) return;
    
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else if (currentStep === 1) {
      setCurrentStep(0);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;
    
    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('register-supplier-public', {
        body: {
          email: formData.email,
          password: formData.password,
          cnpj: formData.cnpj.replace(/\D/g, ''),
          companyName: formData.companyName,
          tradeName: formData.tradeName,
          phone: formData.phone,
          whatsapp: formData.whatsapp,
          website: formData.website,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          specialties: formData.specialties,
          bankData: {
            bankName: formData.bankName,
            agency: formData.bankAgency,
            account: formData.bankAccount,
            pixKey: formData.pixKey
          }
        }
      });

      if (error) {
        console.error('Registration error:', error);
        toast.error(error.message || 'Erro ao realizar cadastro');
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success('Cadastro realizado com sucesso!');
      navigate('/supplier/pending-approval');
      
    } catch (err) {
      console.error('Submit error:', err);
      toast.error('Erro inesperado ao processar cadastro');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Landing page (step 0)
  if (currentStep === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzBoLTZ2Nmg2di02em0tNiA2aC02djZoNnYtNnptLTYtNmgtNnY2aDZ2LTZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20" />
          <div className="container mx-auto px-4 max-w-6xl relative">
            <div className="flex items-center gap-4 mb-8">
              {brandingSettings.logo && brandingSettings.logo !== '/placeholder.svg' && (
                <div className="bg-white rounded-xl p-3 shadow-lg">
                  <img 
                    src={brandingSettings.logo} 
                    alt={brandingSettings.companyName}
                    className="h-14 w-auto object-contain"
                  />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold">{brandingSettings.companyName}</h1>
              </div>
            </div>
            
            <div className="max-w-3xl">
              <Badge variant="secondary" className="mb-4 bg-white/20 text-white border-0">
                <Sparkles className="w-3 h-3 mr-1" />
                Programa de Fornecedores Certificados
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                Torne-se um Fornecedor Certificado
              </h2>
              <p className="text-xl text-primary-foreground/90 mb-8">
                Conecte-se com empresas e condomínios de todo o Brasil. 
                Aumente suas vendas e receba pagamentos garantidos.
              </p>
              <Button 
                size="lg" 
                variant="secondary"
                className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all"
                onClick={handleNext}
              >
                Quero me Cadastrar
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* How it Works Section */}
        <div className="py-16 bg-background">
          <div className="container mx-auto px-4 max-w-6xl">
            <h3 className="text-3xl font-bold text-center mb-12">Como Funciona</h3>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: 1, title: 'Cadastre-se', desc: 'Preencha seus dados e valide seu CNPJ na Receita Federal', icon: Building2 },
                { step: 2, title: 'Aprovação', desc: 'Nossa equipe analisa seu cadastro em até 48h', icon: Clock },
                { step: 3, title: 'Receba Cotações', desc: 'Comece a receber e responder cotações de clientes', icon: CheckCircle2 }
              ].map((item) => (
                <div key={item.step} className="relative text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-8 h-8 text-primary" />
                  </div>
                  <div className="absolute top-8 left-1/2 w-full h-0.5 bg-primary/20 -z-10 hidden md:block" 
                    style={{ display: item.step === 3 ? 'none' : undefined }} />
                  <Badge variant="outline" className="mb-2">Passo {item.step}</Badge>
                  <h4 className="text-xl font-semibold mb-2">{item.title}</h4>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Advantages Section */}
        <div className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 max-w-6xl">
            <h3 className="text-3xl font-bold text-center mb-4">Vantagens Exclusivas</h3>
            <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              Faça parte de uma rede de fornecedores verificados e aproveite todos os benefícios
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ADVANTAGES.map((advantage, index) => (
                <Card key={index} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <advantage.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h4 className="font-semibold mb-2">{advantage.title}</h4>
                    <p className="text-sm text-muted-foreground">{advantage.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Commission Section */}
        <div className="py-16 bg-background">
          <div className="container mx-auto px-4 max-w-4xl">
            <Card className={`border-2 ${isPromoMode ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20' : 'border-primary/20'}`}>
              <CardContent className="pt-8 pb-8">
                <div className="text-center">
                  {isPromoMode ? (
                    <>
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <PartyPopper className="w-8 h-8 text-green-600" />
                        <Badge className="bg-green-600 text-white text-lg px-4 py-1">
                          PROMOÇÃO DE LANÇAMENTO
                        </Badge>
                        <PartyPopper className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="text-3xl font-bold text-green-700 mb-2">
                        SEM TAXA DE COMISSÃO!
                      </h3>
                      <p className="text-green-600 mb-6">
                        Por tempo limitado, aproveite 0% de comissão em todas as transações
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-2xl font-bold mb-2">Transparência Total</h3>
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <span className="text-4xl font-bold text-primary">
                          {isLoadingCommission ? '...' : `${commissionPercentage}%`}
                        </span>
                        <span className="text-muted-foreground">por transação aprovada</span>
                      </div>
                    </>
                  )}
                  
                  <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                    {[
                      { icon: CheckCircle2, text: 'Acesso à plataforma' },
                      { icon: BarChart3, text: 'Dashboard completo' },
                      { icon: Headphones, text: 'Suporte WhatsApp' },
                      { icon: Shield, text: 'Pagamento escrow' }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 justify-center text-sm">
                        <item.icon className="w-4 h-4 text-green-600" />
                        <span>{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-16 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h3 className="text-3xl font-bold mb-4">Pronto para começar?</h3>
            <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              O cadastro leva menos de 5 minutos. Valide seu CNPJ na Receita Federal 
              e comece a receber cotações de clientes qualificados.
            </p>
            <Button 
              size="lg" 
              variant="secondary"
              className="text-lg px-8 py-6"
              onClick={handleNext}
            >
              Começar Cadastro Gratuito
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="py-8 bg-muted/50 text-center">
          <p className="text-sm text-muted-foreground">
            Já tem uma conta?{' '}
            <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/auth')}>
              Faça login
            </Button>
          </p>
        </div>
      </div>
    );
  }

  // Registration Form (steps 1-4)
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-6 shadow-lg">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center gap-4">
            {brandingSettings.logo && brandingSettings.logo !== '/placeholder.svg' && (
              <div className="bg-white rounded-lg p-2 shadow-md">
                <img 
                  src={brandingSettings.logo} 
                  alt={brandingSettings.companyName}
                  className="h-10 w-auto object-contain"
                />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold">{brandingSettings.companyName}</h1>
              <p className="text-primary-foreground/80 text-sm">Cadastro de Fornecedor</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-2xl py-8">
        {/* Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
                    ${currentStep >= step.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                    }
                  `}>
                    {currentStep > step.id ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <span className={`text-xs mt-1 hidden sm:block ${currentStep >= step.id ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    {step.title}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`w-12 sm:w-24 h-0.5 mx-2 ${currentStep > step.id ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
            <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Email & Password */}
            {currentStep === 1 && (
              <>
                <EmailVerificationInput
                  email={formData.email}
                  onEmailChange={(email) => handleInputChange('email', email)}
                  onVerified={handleEmailVerified}
                  error={errors.email}
                />
                
                {formData.emailVerified && (
                  <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700">
                      E-mail verificado com sucesso!
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    disabled={!formData.emailVerified}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Digite a senha novamente"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    disabled={!formData.emailVerified}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                  )}
                </div>
              </>
            )}

            {/* Step 2: CNPJ & Company */}
            {currentStep === 2 && (
              <>
                <CNPJValidationInput
                  cnpj={formData.cnpj}
                  onCNPJChange={(cnpj) => handleInputChange('cnpj', cnpj)}
                  onValidated={handleCNPJValidated}
                  error={errors.cnpj}
                />

                <div className="space-y-2">
                  <Label htmlFor="companyName">Razão Social</Label>
                  <Input
                    id="companyName"
                    placeholder="Nome da empresa"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                  />
                  {errors.companyName && (
                    <p className="text-sm text-destructive">{errors.companyName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tradeName">Nome Fantasia (opcional)</Label>
                  <Input
                    id="tradeName"
                    placeholder="Nome comercial"
                    value={formData.tradeName}
                    onChange={(e) => handleInputChange('tradeName', e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Step 3: Contact & Address */}
            {currentStep === 3 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      placeholder="(00) 0000-0000"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp</Label>
                    <Input
                      id="whatsapp"
                      placeholder="(00) 00000-0000"
                      value={formData.whatsapp}
                      onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                    />
                  </div>
                </div>
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone}</p>
                )}

                <div className="space-y-2">
                  <Label htmlFor="website">Website (opcional)</Label>
                  <Input
                    id="website"
                    placeholder="https://www.suaempresa.com.br"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    placeholder="Rua, número, complemento"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">UF</Label>
                    <Input
                      id="state"
                      maxLength={2}
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value.toUpperCase())}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">CEP</Label>
                    <Input
                      id="zipCode"
                      placeholder="00000-000"
                      value={formData.zipCode}
                      onChange={(e) => handleInputChange('zipCode', e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Step 4: Specialties & Bank */}
            {currentStep === 4 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="specialties">Especialidades / Produtos</Label>
                  <Textarea
                    id="specialties"
                    placeholder="Descreva os produtos ou serviços que você oferece..."
                    value={formData.specialties}
                    onChange={(e) => handleInputChange('specialties', e.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Isso ajuda os clientes a encontrarem você nas buscas
                  </p>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-medium mb-4 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Dados Bancários (opcional)
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Você pode preencher depois nas configurações
                  </p>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="bankName">Banco</Label>
                      <Input
                        id="bankName"
                        placeholder="Nome do banco"
                        value={formData.bankName}
                        onChange={(e) => handleInputChange('bankName', e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bankAgency">Agência</Label>
                        <Input
                          id="bankAgency"
                          placeholder="0000"
                          value={formData.bankAgency}
                          onChange={(e) => handleInputChange('bankAgency', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bankAccount">Conta</Label>
                        <Input
                          id="bankAccount"
                          placeholder="00000-0"
                          value={formData.bankAccount}
                          onChange={(e) => handleInputChange('bankAccount', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pixKey">Chave PIX</Label>
                      <Input
                        id="pixKey"
                        placeholder="CPF, CNPJ, e-mail ou chave aleatória"
                        value={formData.pixKey}
                        onChange={(e) => handleInputChange('pixKey', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={handlePrevious}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>

              {currentStep < 4 ? (
                <Button onClick={handleNext}>
                  Próximo
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="min-w-[140px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      Finalizar Cadastro
                      <CheckCircle2 className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Ao se cadastrar, você concorda com nossos{' '}
          <Button variant="link" className="p-0 h-auto text-sm">termos de uso</Button>
          {' '}e{' '}
          <Button variant="link" className="p-0 h-auto text-sm">política de privacidade</Button>
        </p>
      </div>
    </div>
  );
}
