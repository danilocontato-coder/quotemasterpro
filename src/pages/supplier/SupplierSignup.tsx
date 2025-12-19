import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Building2, Shield, BadgeCheck, Wallet, Users, BarChart3, 
  CheckCircle2, ArrowRight, ArrowLeft, TrendingUp,
  Clock, Headphones, CreditCard, Globe, Loader2, PartyPopper,
  Zap, Lock, Award
} from 'lucide-react';
import { useBranding } from '@/contexts/BrandingContext';
import { usePlatformCommission } from '@/hooks/usePlatformCommission';
import { EmailVerificationInput } from '@/components/supplier/EmailVerificationInput';
import { CNPJValidationInput, CompanyData } from '@/components/supplier/CNPJValidationInput';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BrandedLogo } from '@/components/branding/BrandedLogo';

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
      <div className="min-h-screen flex flex-col lg:flex-row">
        {/* Left Side - Branding & Benefits */}
        <div className="lg:w-1/2 bg-gradient-to-br from-primary via-primary/95 to-primary/85 p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
          </div>

          <div className="relative z-10">
            {/* Logo */}
            <div className="flex items-center gap-4 mb-12">
              <div className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-xl">
                <BrandedLogo size="lg" showCompanyName={false} />
              </div>
              <div>
                <p className="text-primary-foreground/70 text-sm">Programa de Fornecedores</p>
                <p className="text-primary-foreground font-semibold">Certificados</p>
              </div>
            </div>

            {/* Main Headline */}
            <div className="space-y-6 mb-12">
              <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-white leading-tight">
                Cresça seu negócio com clientes qualificados
              </h1>
              <p className="text-lg text-primary-foreground/80 max-w-md">
                Conecte-se com empresas e condomínios de todo o Brasil. 
                Receba cotações, feche negócios e tenha pagamentos garantidos.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-12">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-2xl lg:text-3xl font-bold text-white">500+</div>
                <div className="text-xs text-primary-foreground/70">Clientes ativos</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-2xl lg:text-3xl font-bold text-white">R$ 5M+</div>
                <div className="text-xs text-primary-foreground/70">Em transações</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-2xl lg:text-3xl font-bold text-white">98%</div>
                <div className="text-xs text-primary-foreground/70">Satisfação</div>
              </div>
            </div>

            {/* Features List */}
            <div className="space-y-4">
              {[
                { icon: Zap, text: 'Receba cotações em tempo real' },
                { icon: Shield, text: 'Pagamento garantido via escrow' },
                { icon: Award, text: 'Selo de fornecedor certificado' },
                { icon: BarChart3, text: 'Dashboard completo de vendas' }
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <feature.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-primary-foreground/90">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Trust Badge */}
          <div className="relative z-10 mt-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-white" />
                <span className="text-white font-medium text-sm">Dados protegidos</span>
              </div>
              <p className="text-primary-foreground/70 text-xs">
                Criptografia de ponta a ponta e conformidade LGPD
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - CTA & Commission */}
        <div className="lg:w-1/2 bg-background flex flex-col justify-center p-8 lg:p-12">
          <div className="max-w-md mx-auto w-full">
            {/* Commission Card */}
            <Card className={`mb-8 border-2 ${isPromoMode ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20' : 'border-primary/20'}`}>
              <CardContent className="pt-6 pb-6">
                <div className="text-center">
                  {isPromoMode ? (
                    <>
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <PartyPopper className="w-6 h-6 text-green-600" />
                        <Badge className="bg-green-600 text-white px-3">
                          PROMOÇÃO DE LANÇAMENTO
                        </Badge>
                        <PartyPopper className="w-6 h-6 text-green-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-green-700 mb-1">
                        0% DE COMISSÃO
                      </h3>
                      <p className="text-green-600 text-sm">
                        Por tempo limitado, sem taxa nas transações
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold mb-2">Comissão transparente</h3>
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="text-3xl font-bold text-primary">
                          {isLoadingCommission ? '...' : `${commissionPercentage}%`}
                        </span>
                        <span className="text-muted-foreground text-sm">por transação</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Benefits Checklist */}
            <div className="bg-muted/30 rounded-xl p-6 mb-8">
              <h3 className="font-semibold mb-4">O que você ganha:</h3>
              <div className="space-y-3">
                {[
                  'Acesso a centenas de clientes ativos',
                  'Dashboard completo e relatórios',
                  'Suporte via WhatsApp e e-mail',
                  'Selo de fornecedor verificado',
                  'Pagamento garantido via escrow'
                ].map((benefit, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Button */}
            <Button 
              size="lg" 
              className="w-full h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
              onClick={handleNext}
            >
              Começar Cadastro Gratuito
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>

            <p className="text-center text-muted-foreground text-sm mt-4">
              Cadastro leva apenas 5 minutos
            </p>

            {/* Login Link */}
            <div className="text-center mt-8 pt-6 border-t">
              <p className="text-sm text-muted-foreground">
                Já tem uma conta?{' '}
                <Button variant="link" className="p-0 h-auto font-semibold" onClick={() => navigate('/auth')}>
                  Faça login
                </Button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Registration Form (steps 1-4) - Split Layout
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side - Progress & Summary */}
      <div className="lg:w-2/5 bg-gradient-to-br from-primary via-primary/95 to-primary/85 p-6 lg:p-10 flex flex-col relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-lg">
              <BrandedLogo size="md" showCompanyName={false} />
            </div>
            <div>
              <p className="text-primary-foreground/70 text-xs">Cadastro de</p>
              <p className="text-primary-foreground font-semibold">Fornecedor</p>
            </div>
          </div>

          {/* Progress Headline */}
          <div className="mb-8">
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
              {currentStep === 4 ? 'Quase lá!' : 'Complete seu cadastro'}
            </h2>
            <p className="text-primary-foreground/70">
              Passo {currentStep} de 4
            </p>
          </div>

          {/* Vertical Stepper */}
          <div className="space-y-4 mb-10">
            {STEPS.map((step, index) => {
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              
              return (
                <div key={step.id} className="flex items-start gap-4">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0
                    ${isCompleted ? 'bg-white text-primary' : isCurrent ? 'bg-white/20 text-white ring-2 ring-white' : 'bg-white/10 text-white/50'}
                  `}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <div className={isCurrent ? 'text-white' : isCompleted ? 'text-white/90' : 'text-white/50'}>
                    <p className="font-medium">{step.title}</p>
                    <p className="text-sm opacity-70">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary of completed data */}
          {currentStep > 1 && (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <h4 className="text-white font-medium mb-3 text-sm">Dados confirmados:</h4>
              <div className="space-y-2 text-sm">
                {formData.emailVerified && (
                  <div className="flex items-center gap-2 text-primary-foreground/80">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="truncate">{formData.email}</span>
                  </div>
                )}
                {formData.cnpjValidated && formData.companyName && (
                  <div className="flex items-center gap-2 text-primary-foreground/80">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="truncate">{formData.tradeName || formData.companyName}</span>
                  </div>
                )}
                {(formData.phone || formData.whatsapp) && currentStep > 3 && (
                  <div className="flex items-center gap-2 text-primary-foreground/80">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span>{formData.whatsapp || formData.phone}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Back to landing */}
        <div className="relative z-10 mt-auto pt-6">
          {currentStep === 1 && (
            <Button 
              variant="ghost" 
              className="text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => setCurrentStep(0)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao início
            </Button>
          )}
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="lg:w-3/5 bg-background flex flex-col p-6 lg:p-10">
        <div className="max-w-xl mx-auto w-full flex-1 flex flex-col">
          {/* Mobile Stepper */}
          <div className="lg:hidden mb-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>Passo {currentStep} de 4</span>
              <span>{STEPS[currentStep - 1].title}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(currentStep / 4) * 100}%` }}
              />
            </div>
          </div>

          {/* Form Content */}
          <Card className="flex-1 border-0 shadow-xl">
            <CardContent className="p-6 lg:p-8 space-y-6">
              <div className="mb-6">
                <h3 className="text-xl font-bold">{STEPS[currentStep - 1].title}</h3>
                <p className="text-muted-foreground text-sm">{STEPS[currentStep - 1].description}</p>
              </div>

              {/* Step 1: Email & Password */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <EmailVerificationInput
                    email={formData.email}
                    onEmailChange={(email) => handleInputChange('email', email)}
                    onVerified={handleEmailVerified}
                    error={errors.email}
                  />
                  
                  {formData.emailVerified && (
                    <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-700 dark:text-green-400">
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
                      className="h-11"
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
                      className="h-11"
                    />
                    {errors.confirmPassword && (
                      <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: CNPJ & Company */}
              {currentStep === 2 && (
                <div className="space-y-6">
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
                      className="h-11"
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
                      className="h-11"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Contact & Address */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        placeholder="(00) 0000-0000"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="whatsapp">WhatsApp</Label>
                      <Input
                        id="whatsapp"
                        placeholder="(00) 00000-0000"
                        value={formData.whatsapp}
                        onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                        className="h-11"
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
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Endereço</Label>
                    <Input
                      id="address"
                      placeholder="Rua, número, complemento"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="h-11"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="space-y-2 col-span-2 sm:col-span-1">
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">UF</Label>
                      <Input
                        id="state"
                        maxLength={2}
                        value={formData.state}
                        onChange={(e) => handleInputChange('state', e.target.value.toUpperCase())}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zipCode">CEP</Label>
                      <Input
                        id="zipCode"
                        placeholder="00000-000"
                        value={formData.zipCode}
                        onChange={(e) => handleInputChange('zipCode', e.target.value)}
                        className="h-11"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Specialties & Bank */}
              {currentStep === 4 && (
                <div className="space-y-6">
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
                          className="h-11"
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
                            className="h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bankAccount">Conta</Label>
                          <Input
                            id="bankAccount"
                            placeholder="00000-0"
                            value={formData.bankAccount}
                            onChange={(e) => handleInputChange('bankAccount', e.target.value)}
                            className="h-11"
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
                          className="h-11"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  className="h-11"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>

                {currentStep < 4 ? (
                  <Button onClick={handleNext} className="h-11">
                    Próximo
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button 
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="min-w-[160px] h-11"
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

          {/* Terms */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            Ao se cadastrar, você concorda com nossos{' '}
            <Button variant="link" className="p-0 h-auto text-xs">termos de uso</Button>
            {' '}e{' '}
            <Button variant="link" className="p-0 h-auto text-xs">política de privacidade</Button>
          </p>
        </div>
      </div>
    </div>
  );
}