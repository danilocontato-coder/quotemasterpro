import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Building2, Mail, Phone, MapPin, FileText, Loader2, ChevronRight, ChevronLeft, CheckCircle2, CreditCard, AlertTriangle, Wallet } from 'lucide-react';
import { supplierRegistrationSchema, type SupplierRegistrationData } from '@/lib/validations/supplierRegistration';
import { formatDocument, normalizeDocument } from '@/utils/documentValidation';
import { formatPhoneNumber } from '@/utils/phoneUtils';
import { SpecialtiesInput } from '@/components/common/SpecialtiesInput';
import { detectPixKeyType, getPixKeyTypeLabel, BRAZILIAN_BANKS } from '@/utils/pixKeyValidation';

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
    description: '',
    // Dados bancários
    payment_method: 'pix',
    pix_key: '',
    bank_code: '',
    bank_name: '',
    agency: '',
    agency_digit: '',
    account_number: '',
    account_digit: '',
    account_type: 'corrente',
    account_holder_name: '',
    account_holder_document: ''
  });

  // Detectar tipo de chave PIX em tempo real
  const detectedPixType = formData.pix_key ? detectPixKeyType(formData.pix_key) : null;

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
          specialties: data.supplier.specialties || [],
          // Pré-preencher titular da conta com nome do fornecedor
          account_holder_name: data.supplier.name || '',
          account_holder_document: data.supplier.document_number || data.supplier.cnpj || ''
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

    if (step === 4) {
      if (formData.payment_method === 'pix') {
        if (!formData.pix_key || formData.pix_key.trim() === '') {
          newErrors.pix_key = 'Chave PIX é obrigatória';
        } else if (!detectedPixType) {
          newErrors.pix_key = 'Formato de chave PIX inválido';
        }
      } else {
        if (!formData.bank_code) newErrors.bank_code = 'Selecione o banco';
        if (!formData.agency) newErrors.agency = 'Agência é obrigatória';
        if (!formData.account_number) newErrors.account_number = 'Número da conta é obrigatório';
        if (!formData.account_holder_name) newErrors.account_holder_name = 'Nome do titular é obrigatório';
        if (!formData.account_holder_document) newErrors.account_holder_document = 'CPF/CNPJ do titular é obrigatório';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar etapa final
    if (!validateStep(4)) return;

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
      
      // Redirecionar para tela de resposta rápida
      const redirectUrl = `/supplier/quick-response/${data.quote_id}/${token}`;
      console.log('✅ Cadastro concluído, redirecionando para:', redirectUrl);
      
      sessionStorage.setItem('redirectAfterLogin', redirectUrl);
      // Marcar que o registro acabou de ser completado
      sessionStorage.setItem('supplier_registration_completed', 'true');
      
      toast({
        title: "Cadastro Concluído!",
        description: "Redirecionando para a cotação...",
      });

      setTimeout(() => {
        navigate(redirectUrl);
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
        <p className="text-xs text-muted-foreground mt-1">
          Use um número de celular (com 9 após o DDD)
        </p>
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

  const renderStep4 = () => (
    <div className="space-y-4">
      <Alert className="border-primary/20 bg-primary/5">
        <Wallet className="h-4 w-4" />
        <AlertDescription>
          Esses dados são necessários para que você receba pagamentos após a entrega ser confirmada pelo cliente.
        </AlertDescription>
      </Alert>

      <div>
        <Label>Como deseja receber? *</Label>
        <RadioGroup
          value={formData.payment_method}
          onValueChange={(value: 'pix' | 'bank_account') => {
            setFormData({...formData, payment_method: value});
            setErrors({});
          }}
          className="flex gap-4 mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="pix" id="pix" />
            <Label htmlFor="pix" className="cursor-pointer">Chave PIX (mais rápido)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="bank_account" id="bank_account" />
            <Label htmlFor="bank_account" className="cursor-pointer">Conta Bancária</Label>
          </div>
        </RadioGroup>
      </div>

      {formData.payment_method === 'pix' ? (
        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
          <div>
            <Label htmlFor="pix_key">Chave PIX *</Label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="pix_key"
                value={formData.pix_key}
                onChange={(e) => {
                  setFormData({...formData, pix_key: e.target.value});
                  if (errors.pix_key) setErrors({...errors, pix_key: undefined});
                }}
                placeholder="CPF, CNPJ, e-mail, celular ou chave aleatória"
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Tipos aceitos: CPF, CNPJ, E-mail, Celular ou Chave Aleatória
            </p>
            {detectedPixType && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Chave identificada: {getPixKeyTypeLabel(detectedPixType)}
              </p>
            )}
            {errors.pix_key && (
              <p className="text-sm text-destructive mt-1">{errors.pix_key}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
          <div>
            <Label htmlFor="bank_code">Banco *</Label>
            <Select
              value={formData.bank_code}
              onValueChange={(value) => {
                const bank = BRAZILIAN_BANKS.find(b => b.code === value);
                setFormData({
                  ...formData, 
                  bank_code: value,
                  bank_name: bank?.name || ''
                });
                if (errors.bank_code) setErrors({...errors, bank_code: undefined});
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o banco" />
              </SelectTrigger>
              <SelectContent>
                {BRAZILIAN_BANKS.map((bank) => (
                  <SelectItem key={bank.code} value={bank.code}>
                    {bank.code} - {bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.bank_code && (
              <p className="text-sm text-destructive mt-1">{errors.bank_code}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="agency">Agência *</Label>
              <div className="flex gap-2">
                <Input
                  id="agency"
                  value={formData.agency}
                  onChange={(e) => {
                    setFormData({...formData, agency: e.target.value.replace(/\D/g, '')});
                    if (errors.agency) setErrors({...errors, agency: undefined});
                  }}
                  placeholder="0000"
                  className="flex-1"
                  maxLength={6}
                />
                <Input
                  value={formData.agency_digit}
                  onChange={(e) => setFormData({...formData, agency_digit: e.target.value})}
                  placeholder="Dígito"
                  className="w-16"
                  maxLength={2}
                />
              </div>
              {errors.agency && (
                <p className="text-sm text-destructive mt-1">{errors.agency}</p>
              )}
            </div>

            <div>
              <Label htmlFor="account_number">Conta *</Label>
              <div className="flex gap-2">
                <Input
                  id="account_number"
                  value={formData.account_number}
                  onChange={(e) => {
                    setFormData({...formData, account_number: e.target.value.replace(/\D/g, '')});
                    if (errors.account_number) setErrors({...errors, account_number: undefined});
                  }}
                  placeholder="00000000"
                  className="flex-1"
                  maxLength={15}
                />
                <Input
                  value={formData.account_digit}
                  onChange={(e) => setFormData({...formData, account_digit: e.target.value})}
                  placeholder="Dígito"
                  className="w-16"
                  maxLength={2}
                />
              </div>
              {errors.account_number && (
                <p className="text-sm text-destructive mt-1">{errors.account_number}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="account_type">Tipo de Conta *</Label>
            <Select
              value={formData.account_type}
              onValueChange={(value: 'corrente' | 'poupanca') => 
                setFormData({...formData, account_type: value})
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="corrente">Conta Corrente</SelectItem>
                <SelectItem value="poupanca">Conta Poupança</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="account_holder_name">Nome do Titular *</Label>
            <Input
              id="account_holder_name"
              value={formData.account_holder_name}
              onChange={(e) => {
                setFormData({...formData, account_holder_name: e.target.value});
                if (errors.account_holder_name) setErrors({...errors, account_holder_name: undefined});
              }}
              placeholder="Nome completo do titular"
            />
            {errors.account_holder_name && (
              <p className="text-sm text-destructive mt-1">{errors.account_holder_name}</p>
            )}
          </div>

          <div>
            <Label htmlFor="account_holder_document">CPF/CNPJ do Titular *</Label>
            <Input
              id="account_holder_document"
              value={formData.account_holder_document}
              onChange={(e) => {
                const formatted = formatDocument(e.target.value, e.target.value.replace(/\D/g, '').length > 11 ? 'cnpj' : 'cpf');
                setFormData({...formData, account_holder_document: formatted});
                if (errors.account_holder_document) setErrors({...errors, account_holder_document: undefined});
              }}
              placeholder="000.000.000-00"
              maxLength={18}
            />
            {errors.account_holder_document && (
              <p className="text-sm text-destructive mt-1">{errors.account_holder_document}</p>
            )}
          </div>
        </div>
      )}

      <Alert variant="default" className="border-amber-200 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          Certifique-se de que os dados estão corretos. Erros nos dados bancários podem atrasar o recebimento dos pagamentos.
        </AlertDescription>
      </Alert>
    </div>
  );

  const totalSteps = 4;
  const stepTitles = [
    { icon: FileText, label: 'Documento' },
    { icon: MapPin, label: 'Endereço' },
    { icon: Building2, label: 'Empresa' },
    { icon: CreditCard, label: 'Recebimento' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Building2 className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold text-primary">COTIZ</span>
          </div>
          <CardTitle className="text-xl">
            Complete seu Cadastro
          </CardTitle>
          <CardDescription>
            {supplierData?.name && (
              <span className="font-medium text-foreground">{supplierData.name}</span>
            )}
            {' • '}
            {supplierData?.email}
          </CardDescription>

          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {stepTitles.map((step, index) => {
              const StepIcon = step.icon;
              const stepNum = index + 1;
              const isActive = currentStep === stepNum;
              const isCompleted = currentStep > stepNum;
              
              return (
                <div key={index} className="flex items-center">
                  <div className={`
                    flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                    ${isCompleted ? 'bg-green-500 text-white' : 
                      isActive ? 'bg-primary text-primary-foreground' : 
                      'bg-muted text-muted-foreground'}
                  `}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <StepIcon className="w-4 h-4" />
                    )}
                  </div>
                  {index < totalSteps - 1 && (
                    <div className={`w-8 h-0.5 mx-1 ${isCompleted ? 'bg-green-500' : 'bg-muted'}`} />
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Etapa {currentStep} de {totalSteps}: {stepTitles[currentStep - 1].label}
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit}>
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}

            <div className="flex justify-between mt-6">
              {currentStep > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={loading}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Voltar
                </Button>
              ) : (
                <div />
              )}

              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={loading}
                >
                  Próximo
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Finalizando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Concluir Cadastro
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
