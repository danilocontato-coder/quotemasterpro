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
import { supabase } from '@/integrations/supabase/client';
import { normalizeDocument } from '@/utils/documentValidation';
import { brazilStates } from '@/data/brazilStates';

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

export interface UseAdministradoraSupplierFormProps {
  administradoraId: string;
  editingSupplier?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const useAdministradoraSupplierForm = ({ 
  administradoraId,
  editingSupplier, 
  onSuccess, 
  onCancel 
}: UseAdministradoraSupplierFormProps) => {
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [existingSupplierId, setExistingSupplierId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<SupplierFormData>>(() => {
    if (editingSupplier) {
      console.log('[useAdministradoraSupplierForm] 📥 Inicializando com editingSupplier:', editingSupplier);
      
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
      
      console.log('[useAdministradoraSupplierForm] ✅ Dados normalizados:', { uf, city, addressString });
      
      return {
        name: editingSupplier.name || '',
        document_type: (editingSupplier.document_type as 'cpf' | 'cnpj') || 'cnpj',
        document_number: editingSupplier.document_number || '',
        email: editingSupplier.email || '',
        whatsapp: editingSupplier.whatsapp || undefined,
        phone: editingSupplier.phone || undefined,
        website: editingSupplier.website || undefined,
        state: uf,
        city,
        address: addressString,
        specialties: editingSupplier.specialties || [],
        type: 'local',
        status: editingSupplier.status || 'active',
        client_id: administradoraId,
      };
    }
    return {
      type: 'local',
      document_type: 'cnpj',
      status: 'active',
      specialties: [],
      client_id: administradoraId,
    };
  });
  
  const [errors, setErrors] = useState<Partial<Record<keyof SupplierFormData, string>>>({});

  // Atualizar formData quando editingSupplier mudar
  useEffect(() => {
    if (editingSupplier) {
      console.log('[useAdministradoraSupplierForm] 📥 Carregando dados de edição:', editingSupplier);
      
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
      
      setFormData({
        name: editingSupplier.name || '',
        document_type: (editingSupplier.document_type as 'cpf' | 'cnpj') || 'cnpj',
        document_number: editingSupplier.document_number || '',
        email: editingSupplier.email || '',
        whatsapp: editingSupplier.whatsapp || undefined,
        phone: editingSupplier.phone || undefined,
        website: editingSupplier.website || undefined,
        state: uf,
        city,
        address: addressString,
        specialties: editingSupplier.specialties || [],
        type: 'local',
        status: editingSupplier.status || 'active',
        client_id: administradoraId,
      });
      
      console.log('[useAdministradoraSupplierForm] ✅ FormData atualizado');
      
      setErrors({});
      setCurrentStep(1);
    }
  }, [editingSupplier, administradoraId]);

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
    console.log('[useAdministradoraSupplierForm] Selecionando fornecedor existente:', supplier);
    
    // Guardar ID do fornecedor existente para associação
    setExistingSupplierId(supplier.id);
    
    // Inferir document_type e document_number
    const doc = supplier.document_number || supplier.cnpj || '';
    const normalized = normalizeDocument(doc);
    const inferredType = normalized.length === 11 ? 'cpf' : 'cnpj';
    const inferredDocType = supplier.document_type || inferredType;
    const inferredDocNumber = supplier.document_number || normalized;
    
    // Normalizar UF e construir endereço completo
    const uf = normalizeUF(supplier.state || supplier.address?.state);
    const city = supplier.city || supplier.address?.city || '';
    const addressLine = buildAddressString(supplier.address);
    
    console.log('[useAdministradoraSupplierForm] 🗺️ Endereço extraído:', {
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
      type: 'local',
      status: 'active',
      client_id: administradoraId,
    });
    setErrors({});
    
    console.log('[useAdministradoraSupplierForm] Formulário preenchido. client_id:', administradoraId);
    
    toast({
      title: 'Fornecedor encontrado',
      description: 'Dados carregados. Revise e confirme para associar à administradora.'
    });
  }, [administradoraId, toast]);

  const validateStep = useCallback((step: number) => {
    const newErrors: Partial<Record<keyof SupplierFormData, string>> = {};
    
    console.log('[useAdministradoraSupplierForm] Validando step:', step, 'formData:', formData);
    
    try {
      switch (step) {
        case 1:
          basicInfoSchema.parse(formData);
          break;
        case 2:
          console.log('[useAdministradoraSupplierForm] Validando contato', {
            email: formData.email,
            whatsapp: formData.whatsapp,
            phone: formData.phone,
            website: formData.website
          });
          contactSchema.parse(formData);
          break;
        case 3:
          console.log('[useAdministradoraSupplierForm] Validando localização', {
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
          console.log('[useAdministradoraSupplierForm] 🔍 Validando formulário completo', {
            formData,
            client_id: formData.client_id,
            type: formData.type
          });
          supplierFormSchema.parse(formData);
          break;
      }
      console.log('[useAdministradoraSupplierForm] Validação OK para step:', step);
    } catch (error: any) {
      if (error.errors) {
        error.errors.forEach((err: any) => {
          newErrors[err.path[0] as keyof SupplierFormData] = err.message;
        });
      }
      console.log('[useAdministradoraSupplierForm] Erros de validação:', newErrors);
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

  const resetForm = () => {
    setFormData({
      type: 'local',
      document_type: 'cnpj',
      status: 'active',
      specialties: [],
      client_id: administradoraId,
    });
    setErrors({});
    setCurrentStep(1);
    setExistingSupplierId(null);
  };

  const handleSubmit = useCallback(async () => {
    if (!validateStep(currentStep)) return;

    // Final validation
    try {
      console.log('📝 [ADMINISTRADORA-SUPPLIER-FORM] Iniciando submissão');
      console.log('📝 [ADMINISTRADORA-SUPPLIER-FORM] Dados:', formData);
      console.log('🆔 [ADMINISTRADORA-SUPPLIER-FORM] Existing supplier ID:', existingSupplierId);
      
      const validatedData = supplierFormSchema.parse(formData);
      console.log('✅ [ADMINISTRADORA-SUPPLIER-FORM] Dados validados:', validatedData);
      
      setIsLoading(true);

      // Cenário 1: Associar fornecedor existente
      if (existingSupplierId && !editingSupplier) {
        console.log('[useAdministradoraSupplierForm] Associando fornecedor existente:', existingSupplierId);
        
        // Verificar se já existe associação
        const { data: existingAssoc } = await supabase
          .from('client_suppliers')
          .select('id')
          .eq('client_id', administradoraId)
          .eq('supplier_id', existingSupplierId)
          .maybeSingle();

        if (existingAssoc) {
          toast({
            title: 'Fornecedor já associado',
            description: 'Este fornecedor já está associado à administradora.',
            variant: 'destructive'
          });
          setIsLoading(false);
          return;
        }

        // Criar associação
        const { error: assocError } = await supabase
          .from('client_suppliers')
          .insert({
            client_id: administradoraId,
            supplier_id: existingSupplierId,
            status: 'active'
          });

        if (assocError) {
          console.error('[useAdministradoraSupplierForm] Erro ao associar:', assocError);
          throw assocError;
        }

        console.log('[useAdministradoraSupplierForm] Fornecedor associado com sucesso');

        toast({
          title: 'Fornecedor associado!',
          description: `${validatedData.name} foi associado à administradora.`
        });

        resetForm();
        onSuccess?.();
        return;
      }

      // Cenário 2: Atualizar fornecedor existente
      if (editingSupplier) {
        console.log('[useAdministradoraSupplierForm] Atualizando fornecedor:', editingSupplier.id);

        const { error: updateError } = await supabase
          .from('suppliers')
          .update({
            name: validatedData.name,
            document_type: validatedData.document_type,
            document_number: validatedData.document_number,
            email: validatedData.email,
            whatsapp: validatedData.whatsapp,
            phone: validatedData.phone,
            website: validatedData.website,
            state: validatedData.state,
            city: validatedData.city,
            specialties: validatedData.specialties,
            status: validatedData.status,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingSupplier.id);

        if (updateError) {
          console.error('[useAdministradoraSupplierForm] Erro ao atualizar:', updateError);
          throw updateError;
        }

        console.log('[useAdministradoraSupplierForm] ✅ Fornecedor atualizado');

        toast({
          title: 'Fornecedor atualizado!',
          description: `${validatedData.name} foi atualizado com sucesso.`
        });

        resetForm();
        onSuccess?.();
        return;
      }

      // Cenário 3: Criar novo fornecedor
      console.log('[useAdministradoraSupplierForm] Criando novo fornecedor');

      const cleanDoc = normalizeDocument(validatedData.document_number);

      // Verificar se fornecedor já existe
      const { data: existingSupplier } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('document_number', cleanDoc)
        .maybeSingle();

      if (existingSupplier) {
        // Fornecedor existe, perguntar se quer associar
        toast({
          title: 'Fornecedor já existe',
          description: `${existingSupplier.name} já está cadastrado. Deseja associá-lo à administradora?`,
        });

        setExistingSupplierId(existingSupplier.id);
        setIsLoading(false);
        return;
      }

      // Criar novo fornecedor
      const { data: newSupplier, error: createError } = await supabase
        .from('suppliers')
        .insert({
          name: validatedData.name,
          document_type: validatedData.document_type,
          document_number: cleanDoc,
          cnpj: validatedData.document_type === 'cnpj' ? cleanDoc : '',
          email: validatedData.email,
          whatsapp: validatedData.whatsapp,
          phone: validatedData.phone,
          website: validatedData.website,
          state: validatedData.state,
          city: validatedData.city,
          specialties: validatedData.specialties,
          type: 'local',
          status: 'active',
          client_id: administradoraId,
        })
        .select()
        .single();

      if (createError || !newSupplier) {
        console.error('[useAdministradoraSupplierForm] Erro ao criar:', createError);
        throw createError || new Error('Falha ao criar fornecedor');
      }

      console.log('[useAdministradoraSupplierForm] Fornecedor criado:', newSupplier.id);

      // Criar associação
      const { error: assocError } = await supabase
        .from('client_suppliers')
        .insert({
          client_id: administradoraId,
          supplier_id: newSupplier.id,
          status: 'active'
        });

      if (assocError) {
        console.error('[useAdministradoraSupplierForm] Erro ao associar:', assocError);
        throw assocError;
      }

      console.log('[useAdministradoraSupplierForm] Fornecedor criado e associado com sucesso');
      
      // Enviar notificações (email + WhatsApp)
      const { sendSupplierWelcomeNotifications } = await import('@/services/supplierNotificationService');
      const notificationResult = await sendSupplierWelcomeNotifications({
        supplierId: newSupplier.id,
        supplierName: validatedData.name,
        supplierEmail: validatedData.email,
        supplierWhatsApp: validatedData.whatsapp,
        administradoraName: 'Administradora', // TODO: Pegar do contexto
      });

      const notificationStatus = notificationResult.results;
      const statusMsg = [
        notificationStatus.email ? '✅ Email' : '❌ Email',
        notificationStatus.whatsapp ? '✅ WhatsApp' : '❌ WhatsApp',
      ].join(' | ');

      toast({
        title: 'Fornecedor criado!',
        description: `${validatedData.name} foi criado e notificado. ${statusMsg}`
      });

      resetForm();
      onSuccess?.();

    } catch (error: any) {
      console.error('[useAdministradoraSupplierForm] Erro completo:', error);
      
      // Mensagens de erro específicas
      let errorMessage = 'Não foi possível salvar o fornecedor.';
      
      if (error.code === '23505') {
        errorMessage = 'Já existe um fornecedor com este documento.';
      } else if (error.code === '23503') {
        errorMessage = 'Erro de referência no banco de dados. Verifique os dados.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Erro ao cadastrar fornecedor',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentStep, validateStep, formData, existingSupplierId, editingSupplier, administradoraId, toast, onSuccess]);

  const handleCancel = useCallback(() => {
    resetForm();
    onCancel?.();
  }, [onCancel]);

  const canGoNext = currentStep < steps.length;
  const canGoPrev = currentStep > 1;
  const isLastStep = currentStep === steps.length;
  const isEditMode = !!editingSupplier;

  return {
    formData,
    errors,
    currentStep,
    isLoading,
    steps,
    updateField,
    selectExistingSupplier,
    nextStep,
    prevStep,
    goToStep,
    handleSubmit,
    handleCancel,
    canGoNext,
    canGoPrev,
    isLastStep,
    isEditMode,
  };
};
