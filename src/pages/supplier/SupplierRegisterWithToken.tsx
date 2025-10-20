import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Building2, Mail, Phone, MapPin, FileText, Loader2, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { supplierRegistrationSchema, type SupplierRegistrationData } from '@/lib/validations/supplierRegistration';
import { formatDocument, normalizeDocument } from '@/utils/documentValidation';
import { formatPhoneNumber } from '@/utils/phoneUtils';
import { SpecialtiesInput } from '@/components/common/SpecialtiesInput';

export default function SupplierRegisterWithToken() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [supplierData, setSupplierData] = useState<any>(null);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Partial<Record<keyof SupplierRegistrationData, string>>>({});
  
  const [formData, setFormData] = useState<SupplierRegistrationData>({
    document_type: 'cnpj',
    document_number: '',
    whatsapp: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    specialties: [],
    website: '',
    description: ''
  });

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      setValidating(true);
      
      const { data, error } = await supabase.functions.invoke('validate-quote-token', {
        body: { token }
      });

      if (error || !data?.valid) {
        toast({
          title: data?.expired ? 'Link expirado' : 'Link inválido',
          description: data?.error || 'Link de cadastro inválido ou expirado.',
          variant: 'destructive'
        });
        navigate('/');
        return;
      }

      setSupplierData(data.supplier);
      setQuoteId(data.quote_id);
      
      // Pré-preencher com dados existentes
      if (data.supplier) {
        setFormData(prev => ({
          ...prev,
          document_number: data.supplier.document_number || data.supplier.cnpj || '',
          document_type: data.supplier.document_type || 'cnpj',
          whatsapp: formatPhoneNumber(data.supplier.whatsapp || data.supplier.phone || ''),
          city: data.supplier.city || '',
          state: data.supplier.state || '',
          specialties: data.supplier.specialties || []
        }));
      }

    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao validar convite.',
        variant: 'destructive'
      });
      navigate('/');
    } finally {
      setValidating(false);
    }
  };

  const handleCEPBlur = async () => {
    const cep = formData.cep.replace(/\D/g, '');
    if (cep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            street: data.logradouro || prev.street,
            neighborhood: data.bairro || prev.neighborhood,
            city: data.localidade || prev.city,
            state: data.uf || prev.state
          }));
          
          toast({
            title: 'CEP encontrado! ✅',
            description: 'Endereço preenchido automaticamente.'
          });
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      }
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof SupplierRegistrationData, string>> = {};
    
    if (step === 1) {
      // Validar documento
      const normalized = normalizeDocument(formData.document_number);
      if (!normalized) {
        newErrors.document_number = 'Documento é obrigatório';
      } else if (formData.document_type === 'cpf' && normalized.length !== 11) {
        newErrors.document_number = 'CPF deve ter 11 dígitos';
      } else if (formData.document_type === 'cnpj' && normalized.length !== 14) {
        newErrors.document_number = 'CNPJ deve ter 14 dígitos';
      }
      
      if (!formData.whatsapp) {
        newErrors.whatsapp = 'WhatsApp é obrigatório';
      }
    }
    
    if (step === 2) {
      if (!formData.cep) newErrors.cep = 'CEP é obrigatório';
      if (!formData.street) newErrors.street = 'Logradouro é obrigatório';
      if (!formData.number) newErrors.number = 'Número é obrigatório';
      if (!formData.neighborhood) newErrors.neighborhood = 'Bairro é obrigatório';
      if (!formData.city) newErrors.city = 'Cidade é obrigatória';
      if (!formData.state || formData.state.length !== 2) newErrors.state = 'UF inválida';
    }
    
    if (step === 3) {
      if (formData.specialties.length === 0) {
        newErrors.specialties = 'Selecione ao menos uma especialidade';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar etapa final
    if (!validateStep(3)) return;

    try {
      setLoading(true);

      // Validação final com Zod
      const validatedData = supplierRegistrationSchema.parse(formData);

      const { data, error } = await supabase.functions.invoke('complete-supplier-registration', {
        body: {
          invitation_token: token,
          supplier_data: validatedData
        }
      });

      console.log('📥 Registration response:', { 
        hasError: !!error, 
        errorMessage: error?.message,
        hasData: !!data,
        dataSuccess: data?.success,
        hasSession: !!data?.session,
        hasTokens: !!(data?.session?.access_token && data?.session?.refresh_token)
      });

      // Validar erro explícito da Edge Function
      if (error && error.message) {
        console.error('Edge function error:', error);
        throw new Error(error.message);
      }

      // Validar estrutura da resposta
      if (!data || !data.success) {
        console.error('Invalid response structure:', data);
        throw new Error(data?.error || 'Erro ao completar cadastro');
      }

      // Validar tokens de sessão
      if (!data.session || !data.session.access_token || !data.session.refresh_token) {
        console.error('Missing session tokens:', data);
        throw new Error('Sessão não foi criada corretamente');
      }

      // Tentar login automático via setSession
      try {
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        });

        if (setSessionError) {
          console.warn('⚠️ setSession failed, trying signInWithPassword fallback:', setSessionError);
          
          // Fallback: login manual com senha temporária
          if (data.temporary_password && formData.whatsapp) {
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email: supplierData.email,
              password: data.temporary_password
            });
            
            if (signInError) {
              console.error('❌ signInWithPassword also failed:', signInError);
              throw signInError;
            }
            
            console.log('✅ Logged in via signInWithPassword fallback');
          } else {
            throw setSessionError;
          }
        } else {
          console.log('✅ Session set successfully');
        }
      } catch (authError: any) {
        console.error('❌ Authentication error:', authError);
        throw new Error('Não foi possível fazer login automaticamente');
      }

      setLoading(false);
      
      // Guardar destino no sessionStorage ANTES de setSession para que RoleBasedRedirect use
      sessionStorage.setItem('redirectAfterLogin', `/supplier/quotes/${data.quote_id}`);
      
      toast({
        title: "Cadastro Concluído!",
        description: "Redirecionando para a cotação...",
      });

      setTimeout(() => {
        navigate(`/supplier/quotes/${data.quote_id}`);
      }, 1500);

    } catch (error: any) {
      console.error('Registration error:', error);
      const errorMessage = error.message || "Não foi possível completar o cadastro.";
      const isAuthError = errorMessage.includes('Database error') || errorMessage.includes('Failed to handle');
      
      toast({
        variant: "destructive",
        title: isAuthError ? "Erro de Autenticação" : "Erro no Cadastro",
        description: isAuthError 
          ? "Seu e-mail já está cadastrado. Entre em contato com o suporte se precisar de ajuda."
          : errorMessage,
      });
      setLoading(false);
    }
  };


  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Validando convite...</p>
        </div>
      </div>
    );
  }

  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <Label>Tipo de Documento *</Label>
        <RadioGroup
          value={formData.document_type}
          onValueChange={(value: 'cpf' | 'cnpj') => 
            setFormData({...formData, document_type: value})
          }
          className="flex gap-4 mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="cnpj" id="cnpj" />
            <Label htmlFor="cnpj" className="cursor-pointer">CNPJ (Empresa)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="cpf" id="cpf" />
            <Label htmlFor="cpf" className="cursor-pointer">CPF (Pessoa Física)</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label htmlFor="document_number">
          {formData.document_type === 'cpf' ? 'CPF' : 'CNPJ'} *
        </Label>
        <div className="relative">
          <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="document_number"
            value={formData.document_number}
            onChange={(e) => {
              const formatted = formatDocument(e.target.value, formData.document_type);
              setFormData({...formData, document_number: formatted});
              if (errors.document_number) setErrors({...errors, document_number: undefined});
            }}
            placeholder={formData.document_type === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
            className="pl-10"
            maxLength={formData.document_type === 'cpf' ? 14 : 18}
          />
        </div>
        {errors.document_number && (
          <p className="text-sm text-destructive mt-1">{errors.document_number}</p>
        )}
      </div>

      <div>
        <Label htmlFor="whatsapp">WhatsApp *</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="whatsapp"
                value={formData.whatsapp}
                onChange={(e) => {
                  const formatted = formatPhoneNumber(e.target.value);
                  setFormData({...formData, whatsapp: formatted});
                  if (errors.whatsapp) setErrors({...errors, whatsapp: undefined});
                }}
                placeholder="(00) 00000-0000"
                className="pl-10"
                maxLength={15}
              />
        </div>
        {errors.whatsapp && (
          <p className="text-sm text-destructive mt-1">{errors.whatsapp}</p>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="cep">CEP *</Label>
        <Input
          id="cep"
          value={formData.cep}
          onChange={(e) => setFormData({...formData, cep: e.target.value})}
          onBlur={handleCEPBlur}
          placeholder="00000-000"
          maxLength={9}
        />
        {errors.cep && <p className="text-sm text-destructive mt-1">{errors.cep}</p>}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Label htmlFor="street">Logradouro *</Label>
          <Input
            id="street"
            value={formData.street}
            onChange={(e) => setFormData({...formData, street: e.target.value})}
            placeholder="Rua, Avenida..."
          />
          {errors.street && <p className="text-sm text-destructive mt-1">{errors.street}</p>}
        </div>
        <div>
          <Label htmlFor="number">Número *</Label>
          <Input
            id="number"
            value={formData.number}
            onChange={(e) => setFormData({...formData, number: e.target.value})}
            placeholder="123"
          />
          {errors.number && <p className="text-sm text-destructive mt-1">{errors.number}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="complement">Complemento</Label>
        <Input
          id="complement"
          value={formData.complement}
          onChange={(e) => setFormData({...formData, complement: e.target.value})}
          placeholder="Apto, Sala, Bloco..."
        />
      </div>

      <div>
        <Label htmlFor="neighborhood">Bairro *</Label>
        <Input
          id="neighborhood"
          value={formData.neighborhood}
          onChange={(e) => setFormData({...formData, neighborhood: e.target.value})}
          placeholder="Centro"
        />
        {errors.neighborhood && <p className="text-sm text-destructive mt-1">{errors.neighborhood}</p>}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Label htmlFor="city">Cidade *</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData({...formData, city: e.target.value})}
            placeholder="São Paulo"
          />
          {errors.city && <p className="text-sm text-destructive mt-1">{errors.city}</p>}
        </div>
        <div>
          <Label htmlFor="state">UF *</Label>
          <Input
            id="state"
            value={formData.state}
            onChange={(e) => setFormData({...formData, state: e.target.value.toUpperCase()})}
            placeholder="SP"
            maxLength={2}
          />
          {errors.state && <p className="text-sm text-destructive mt-1">{errors.state}</p>}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <SpecialtiesInput
        value={formData.specialties}
        onChange={(specialties) => {
          setFormData(prev => ({ ...prev, specialties }));
          if (errors.specialties) setErrors({ ...errors, specialties: undefined });
        }}
        error={errors.specialties}
        maxSelections={10}
        allowCustom={true}
        showAsBadges={true}
        showTip={true}
        label="Especialidades *"
        description="Selecione ao menos uma especialidade"
      />

      <div>
        <Label htmlFor="website">Website (opcional)</Label>
        <Input
          id="website"
          value={formData.website}
          onChange={(e) => setFormData({...formData, website: e.target.value})}
          placeholder="https://www.seusite.com.br"
        />
      </div>

      <div>
        <Label htmlFor="description">Descrição Breve (opcional)</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          placeholder="Conte um pouco sobre sua empresa e seus serviços..."
          rows={4}
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {formData.description?.length || 0}/500 caracteres
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <Building2 className="w-6 h-6" />
              Complete seu Cadastro
            </CardTitle>
            
            {supplierData && (
              <div className="mt-4 p-4 bg-primary/10 rounded-lg space-y-2">
                <p className="text-sm font-medium text-primary">{supplierData.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="w-3 h-3" />
                  {supplierData.email}
                </div>
              </div>
            )}

            {/* Progress Stepper */}
            <div className="flex items-center justify-between mt-6 px-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div className={`
                    flex items-center justify-center w-8 h-8 rounded-full border-2 
                    ${currentStep >= step 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'bg-background text-muted-foreground border-muted'
                    }
                  `}>
                    {currentStep > step ? <CheckCircle2 className="w-5 h-5" /> : step}
                  </div>
                  {step < 3 && (
                    <div className={`
                      flex-1 h-0.5 mx-2
                      ${currentStep > step ? 'bg-primary' : 'bg-muted'}
                    `} />
                  )}
                </div>
              ))}
            </div>

            <CardDescription className="text-center mt-3">
              {currentStep === 1 && 'Dados Básicos'}
              {currentStep === 2 && 'Endereço Completo'}
              {currentStep === 3 && 'Especialidades e Informações'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit}>
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}

              <div className="flex gap-3 mt-6">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={loading}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Voltar
                  </Button>
                )}
                
                {currentStep < 3 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="flex-1"
                  >
                    Próximo
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Finalizando...
                      </>
                    ) : (
                      'Completar Cadastro'
                    )}
                  </Button>
                )}
              </div>

              {currentStep === 3 && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mt-4">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    🔑 Uma senha temporária será gerada e enviada para seu WhatsApp.
                  </p>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
