import { useState, useCallback, useEffect } from 'react';
import { 
  supplierFormSchema, 
  basicInfoSchema, 
  contactSchema, 
  locationSchema, 
  specialtiesSchema,
  SupplierFormData 
} from '@/components/suppliers/forms/SupplierFormSchema';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseSuppliers } from '@/hooks/useSupabaseSuppliers';
import { supabase } from '@/integrations/supabase/client';
import { normalizeDocument } from '@/utils/documentValidation';
import { brazilStates } from '@/data/brazilStates';

// Função auxiliar para normalizar telefones (remove código do país se presente)
const normalizePhone = (phone?: string): string | undefined => {
  if (!phone) return undefined;
  const cleaned = phone.replace(/\D/g, '');
  // Se começa com 55 e tem 12+ dígitos, remover código do país
  if (cleaned.startsWith('55') && cleaned.length >= 12) {
    return cleaned.slice(2);
  }
  return cleaned;
};

// Função auxiliar para formatar telefones
const formatPhone = (phone: string): string => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  
  return phone;
};

// Função para normalizar UF (aceita nome ou código)
const normalizeUF = (value?: string): string => {
  if (!value) return '';
  const v = String(value).trim();
  
  // Tentar encontrar por código (SP, RJ, etc.)
  const byCode = brazilStates.find(s => s.code.toLowerCase() === v.toLowerCase());
  if (byCode) return byCode.code;
  
  // Tentar encontrar por nome (São Paulo, Rio de Janeiro, etc.)
  const byName = brazilStates.find(s => s.name.toLowerCase() === v.toLowerCase());
  if (byName) return byName.code;
  
  // Fallback: retornar primeiras 2 letras maiúsculas
  return v.toUpperCase().slice(0, 2);
};

// Função para construir string de endereço a partir de objeto/string
const buildAddressString = (addr: any): string => {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  
  const street = addr.street || addr.logradouro || '';
  const number = addr.number || addr.numero || '';
  const neighborhood = addr.neighborhood || addr.bairro || '';
  const city = addr.city || '';
  const state = addr.state || '';
  const zip = addr.zipCode || addr.postal_code || addr.cep || '';
  
  const parts = [
    [street, number].filter(Boolean).join(', '),
    neighborhood,
    [city, state].filter(Boolean).join(' / '),
    zip
  ].filter(Boolean);
  
  return parts.join(' - ');
};

export interface UseSupplierFormProps {
  editingSupplier?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const useSupplierForm = ({ editingSupplier, onSuccess, onCancel }: UseSupplierFormProps = {}) => {
  const { toast } = useToast();
  const { createSupplier, updateSupplier } = useSupabaseSuppliers();

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [existingSupplierId, setExistingSupplierId] = useState<string | null>(null);
  
  // Buscar profile do usuário para client_id
  const [profile, setProfile] = useState<any>(null);
  
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('client_id, role')
          .eq('id', user.id)
          .single();
        setProfile(data);
      }
    };
    fetchProfile();
  }, []);
  
  const [formData, setFormData] = useState<Partial<SupplierFormData>>(() => {
    if (editingSupplier) {
      console.log('[useSupplierForm] 📥 Inicializando com editingSupplier:', editingSupplier);
      
      // Extrair address corretamente (JSONB ou string)
      let addressString = '';
      if (editingSupplier.address) {
        if (typeof editingSupplier.address === 'string') {
          addressString = editingSupplier.address;
        } else {
          addressString = buildAddressString(editingSupplier.address);
        }
      }
      
      // Normalizar UF e city com fallbacks
      const uf = normalizeUF(editingSupplier.state || editingSupplier.address?.state);
      const city = editingSupplier.city || editingSupplier.address?.city || '';
      
      console.log('[useSupplierForm] ✅ Dados normalizados:', { uf, city, addressString });
      
      return {
        name: editingSupplier.name || '',
        document_type: (editingSupplier.document_type as 'cpf' | 'cnpj') || 'cnpj',
        document_number: editingSupplier.document_number || '',
        email: editingSupplier.email || '',
        whatsapp: normalizePhone(editingSupplier.whatsapp),
        phone: normalizePhone(editingSupplier.phone),
        website: editingSupplier.website || undefined,
        state: uf,
        city,
        address: addressString,
        specialties: editingSupplier.specialties || [],
        type: editingSupplier.type || 'local',
        status: editingSupplier.status || 'active',
        client_id: editingSupplier.client_id || '',
      };
    }
    return {
      type: 'local',
      document_type: 'cnpj',
      status: 'active',
      specialties: [],
      client_id: '',
    };
  });
  const [errors, setErrors] = useState<Partial<Record<keyof SupplierFormData, string>>>({});

  // Auto-popular client_id quando profile for carregado
  useEffect(() => {
    if (profile?.client_id && !formData.client_id && !editingSupplier) {
      console.log('[useSupplierForm] Auto-populando client_id do profile:', profile.client_id);
      setFormData(prev => ({
        ...prev,
        client_id: profile.client_id
      }));
    }
  }, [profile, editingSupplier, formData.client_id]);

  // Atualizar formData quando editingSupplier mudar
  useEffect(() => {
    if (editingSupplier) {
      console.log('[useSupplierForm] 📥 Carregando dados de edição:', editingSupplier);
      
      // Extrair address corretamente (JSONB ou string)
      let addressString = '';
      if (editingSupplier.address) {
        if (typeof editingSupplier.address === 'string') {
          addressString = editingSupplier.address;
        } else {
          // Se for JSONB, usar buildAddressString()
          addressString = buildAddressString(editingSupplier.address);
        }
      }
      
      // Normalizar UF e city com fallbacks
      const uf = normalizeUF(editingSupplier.state || editingSupplier.address?.state);
      const city = editingSupplier.city || editingSupplier.address?.city || '';
      
      setFormData({
        name: editingSupplier.name || '',
        document_type: (editingSupplier.document_type as 'cpf' | 'cnpj') || 'cnpj',
        document_number: editingSupplier.document_number || '',
        email: editingSupplier.email || '',
        whatsapp: normalizePhone(editingSupplier.whatsapp),
        phone: normalizePhone(editingSupplier.phone),
        website: editingSupplier.website || undefined,
        state: uf,
        city,
        address: addressString,
        specialties: editingSupplier.specialties || [],
        type: editingSupplier.type || 'local',
        status: editingSupplier.status || 'active',
        client_id: editingSupplier.client_id || profile?.client_id || '',
      });
      
      console.log('[useSupplierForm] ✅ FormData atualizado:', {
        address: addressString,
        whatsapp: editingSupplier.whatsapp || undefined,
        state: uf,
        city
      });
      
      setErrors({});
      setCurrentStep(1);
    }
  }, [editingSupplier, profile]);

  const steps = [
    { id: 1, title: 'Dados Básicos', description: 'Nome e identificação' },
    { id: 2, title: 'Contato', description: 'WhatsApp e email' },
    { id: 3, title: 'Localização', description: 'Estado e cidade' },
    { id: 4, title: 'Especialidades', description: 'Produtos e serviços' },
    { id: 5, title: 'Confirmação', description: 'Revisar dados' },
  ];

  const updateField = useCallback((field: keyof SupplierFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  const selectExistingSupplier = useCallback((supplier: any) => {
    console.log('[useSupplierForm] Selecionando fornecedor existente:', supplier);
    
    // Guardar ID do fornecedor existente para associação
    setExistingSupplierId(supplier.id);
    
    // Inferir document_type e document_number se não estiverem presentes
    const doc = supplier.document_number || supplier.cnpj || '';
    const normalized = normalizeDocument(doc);
    const inferredType = normalized.length === 11 ? 'cpf' : 'cnpj';
    const inferredDocType = supplier.document_type || inferredType;
    const inferredDocNumber = supplier.document_number || normalized;
    
    // Preencher client_id: formData.client_id (admin já selecionou) > supplier.client_id > profile.client_id
    const targetClientId = formData.client_id || supplier.client_id || profile?.client_id || '';
    
    // ✅ Normalizar UF e construir endereço completo
    const uf = normalizeUF(supplier.state || supplier.address?.state);
    const city = supplier.city || supplier.address?.city || '';
    const addressLine = buildAddressString(supplier.address);
    
    console.log('[useSupplierForm] 🗺️ Endereço extraído:', {
      raw_state: supplier.state,
      raw_address: supplier.address,
      normalized_uf: uf,
      city: city,
      address_string: addressLine
    });
    
    // Preencher formulário com dados do fornecedor
    setFormData({
      name: supplier.name || '',
      document_type: inferredDocType as 'cpf' | 'cnpj',
      document_number: inferredDocNumber,
      email: supplier.email || '',
      whatsapp: formatPhone(supplier.whatsapp || ''),
      phone: formatPhone(supplier.phone || ''),
      website: supplier.website || '',
      state: uf,
      city: city,
      address: addressLine,
      specialties: supplier.specialties || [],
      type: supplier.type || 'local',
      status: 'active',
      client_id: targetClientId,
    });
    setErrors({});
    
    console.log('[useSupplierForm] Formulário preenchido. client_id:', targetClientId);
    
    toast({
      title: 'Fornecedor encontrado',
      description: 'Dados carregados. Revise e confirme para associar ao cliente.'
    });
  }, [formData.client_id, profile, toast]);

  const validateStep = useCallback((step: number) => {
    const newErrors: Partial<Record<keyof SupplierFormData, string>> = {};
    
    console.log('[useSupplierForm] Validando step:', step, 'formData:', formData);
    
    try {
      switch (step) {
        case 1:
          basicInfoSchema.parse(formData);
          break;
        case 2:
          console.log('[useSupplierForm] Validando contato', {
            email: formData.email,
            whatsapp: formData.whatsapp,
            phone: formData.phone,
            website: formData.website
          });
          contactSchema.parse(formData);
          break;
        case 3:
          console.log('[useSupplierForm] Validando localização', {
            state: formData.state,
            city: formData.city,
            address: formData.address
          });
          locationSchema.parse(formData);
          break;
        case 4:
          specialtiesSchema.parse(formData);
          break;
        case 5:
          // Validation for confirmation step (full form)
          console.log('[useSupplierForm] 🔍 Validando formulário completo', {
            formData,
            client_id: formData.client_id,
            profile_client_id: profile?.client_id,
            type: formData.type
          });
          supplierFormSchema.parse(formData);
          break;
      }
      console.log('[useSupplierForm] Validação OK para step:', step);
    } catch (error: any) {
      if (error.errors) {
        error.errors.forEach((err: any) => {
          newErrors[err.path[0] as keyof SupplierFormData] = err.message;
        });
      }
      console.log('[useSupplierForm] Erros de validação:', newErrors);
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const nextStep = useCallback(() => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  }, [currentStep, validateStep, steps.length]);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setErrors({});
  }, []);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
    setErrors({});
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!validateStep(currentStep)) return;

    // Final validation
    try {
      console.log('📝 [SUPPLIER-FORM] Iniciando submissão do formulário');
      console.log('📝 [SUPPLIER-FORM] Dados do formulário:', formData);
      console.log('🆔 [SUPPLIER-FORM] Existing supplier ID:', existingSupplierId);
      
      const validatedData = supplierFormSchema.parse(formData);
      console.log('✅ [SUPPLIER-FORM] Dados validados:', validatedData);
      
      setIsLoading(true);

      let result;
      
      // Cenário 1: Associar fornecedor existente ao cliente
      if (existingSupplierId && !editingSupplier) {
        console.log('[useSupplierForm] Associando fornecedor existente ao cliente:', existingSupplierId);
        
        // Determinar o cliente alvo: formData.client_id (admin) ou profile.client_id (manager)
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase
          .from('profiles')
          .select('client_id')
          .eq('id', user?.id)
          .single();
        
        const targetClientId = formData.client_id || profile?.client_id;
        
        if (!targetClientId) {
          throw new Error('Cliente não identificado. Não foi possível associar o fornecedor.');
        }
        
        console.log('[useSupplierForm] Cliente alvo:', targetClientId);
        
        // Usar RPC para associação (valida status, audita, ignora RLS)
        const { error: associationError } = await supabase.rpc('associate_supplier_to_client', {
          p_supplier_id: existingSupplierId,
          p_client_id: targetClientId
        });
        
        if (associationError) {
          console.error('[useSupplierForm] Erro ao associar:', associationError);
          throw associationError;
        }
        
        console.log('[useSupplierForm] Fornecedor associado com sucesso');
        
        toast({
          title: 'Fornecedor associado com sucesso!',
          description: `${validatedData.name} foi associado ao cliente.`
        });
        
        resetForm();
        setExistingSupplierId(null);
        onSuccess?.();
        return;
      }
      
      // Cenário 3: Atualizar fornecedor existente
      if (editingSupplier) {
        console.log('[useSupplierForm] Modo edição - atualizando fornecedor:', editingSupplier.id);
        console.log('[useSupplierForm] 📝 Dados validados que serão enviados:', validatedData);
        console.log('[useSupplierForm] 📱 Campos de contato:', {
          whatsapp: validatedData.whatsapp,
          phone: validatedData.phone,
          website: validatedData.website
        });
        
        result = await updateSupplier(editingSupplier.id, validatedData);
        
        if (result) {
          console.log('[useSupplierForm] ✅ Update bem-sucedido');
          toast({
            title: "Fornecedor atualizado!",
            description: `${validatedData.name} foi atualizado com sucesso.`,
          });
        } else {
          console.error('[useSupplierForm] ❌ Update falhou');
        }
        
        resetForm();
        setExistingSupplierId(null);
        onSuccess?.();
        return;
      }
      
      // Cenário 2: Criar novo fornecedor
      console.log('[useSupplierForm] Criando novo fornecedor');
      
      // Construir bank_data se houver dados bancários
      const bank_data = formData.bank_code ? {
        bank_code: formData.bank_code,
        bank_name: formData.bank_name,
        agency: formData.agency,
        agency_digit: formData.agency_digit,
        account_number: formData.account_number,
        account_digit: formData.account_digit,
        account_type: formData.account_type,
        account_holder_name: formData.account_holder_name,
        account_holder_document: formData.account_holder_document,
        pix_key: formData.pix_key,
        verified: false,
        verified_at: null
      } : null;
      
      // Se formData.client_id existe (admin selecionou cliente), usar serviço completo
      if (formData.client_id) {
        console.log('[useSupplierForm] Admin criando fornecedor com auth e notificações para cliente:', formData.client_id);
        
        // Importar serviço de criação completa
        const { createSupplierWithAuth } = await import('@/services/supplierCreationService');
        
        const result = await createSupplierWithAuth({
          name: validatedData.name,
          email: validatedData.email,
          document_number: validatedData.document_number,
          phone: validatedData.phone,
          whatsapp: validatedData.whatsapp,
          website: validatedData.website,
          state: validatedData.state,
          city: validatedData.city,
          address: validatedData.address,
          specialties: validatedData.specialties,
          clientId: formData.client_id,
          type: validatedData.type || 'local',
          bank_data,
        });
        
        console.log('[useSupplierForm] ✅ Criação completa finalizada:', result);
        
        // Feedback detalhado ao usuário
        const notifMessages = [];
        if (result.notifications.email) notifMessages.push('✅ Email');
        if (result.notifications.whatsapp) notifMessages.push('✅ WhatsApp');
        if (result.notifications.inApp) notifMessages.push('✅ In-app');
        
        toast({
          title: 'Fornecedor criado com sucesso! 🎉',
          description: `${validatedData.name} foi criado, autenticado e notificado.\n${notifMessages.join(' | ')}`
        });
        
        resetForm();
        setExistingSupplierId(null);
        onSuccess?.();
        return;
      }
      
      // Manager: usar fluxo existente com createSupplier
      console.log('[useSupplierForm] Manager criando fornecedor local');
      result = await createSupplier(validatedData);
      if (result) {
        toast({
          title: "Fornecedor cadastrado!",
          description: `${validatedData.name} foi cadastrado e receberá cotações.`,
        });
        
        resetForm();
        setExistingSupplierId(null);
        onSuccess?.();
      }
    } catch (error: any) {
      console.error('💥 [SUPPLIER-FORM] Erro na validação/submissão:', error);
      
      if (error.errors) {
        const newErrors: Partial<Record<keyof SupplierFormData, string>> = {};
        error.errors.forEach((err: any) => {
          newErrors[err.path[0] as keyof SupplierFormData] = err.message;
        });
        setErrors(newErrors);
        
        toast({
          title: "Dados inválidos",
          description: "Verifique os campos destacados e tente novamente.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao salvar",
          description: error.message || "Ocorreu um erro inesperado. Tente novamente.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentStep, validateStep, formData, existingSupplierId, editingSupplier, updateSupplier, createSupplier, toast, onSuccess]);

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      document_type: 'cnpj',
      document_number: '',
      email: '',
      whatsapp: '',
      phone: '',
      website: '',
      state: '',
      city: '',
      address: '',
      specialties: [],
      type: 'local',
      status: 'active',
    });
    setErrors({});
    setCurrentStep(1);
    setExistingSupplierId(null);
  }, []);

  const handleCancel = useCallback(() => {
    resetForm();
    onCancel?.();
  }, [resetForm, onCancel]);

  const canGoNext = currentStep < steps.length;
  const canGoPrev = currentStep > 1;
  const isLastStep = currentStep === steps.length;

  return {
    // Form state
    formData,
    errors,
    currentStep,
    isLoading,
    steps,

    // Form actions
    updateField,
    selectExistingSupplier,
    nextStep,
    prevStep,
    goToStep,
    handleSubmit,
    handleCancel,
    resetForm,

    // Form status
    canGoNext,
    canGoPrev,
    isLastStep,
    isEditMode: !!editingSupplier,
  };
};