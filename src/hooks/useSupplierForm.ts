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
  const [existingSupplierId, setExistingSupplierId] = useState<string | null>(null); // Para rastrear fornecedor existente
  const [formData, setFormData] = useState<Partial<SupplierFormData>>({
    name: editingSupplier?.name || '',
    document_type: (editingSupplier?.document_type as 'cpf' | 'cnpj') || 'cnpj',
    document_number: editingSupplier?.document_number || '',
    email: editingSupplier?.email || '',
    whatsapp: editingSupplier?.whatsapp || '',
    phone: editingSupplier?.phone || '',
    website: editingSupplier?.website || '',
    state: editingSupplier?.state || '',
    city: editingSupplier?.city || '',
    address: editingSupplier?.address || '',
    specialties: editingSupplier?.specialties || [],
    type: editingSupplier?.type || 'local',
    status: editingSupplier?.status || 'active',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof SupplierFormData, string>>>({});

  // Atualizar formData quando editingSupplier mudar
  useEffect(() => {
    if (editingSupplier) {
      setFormData({
        name: editingSupplier.name || '',
        document_type: (editingSupplier.document_type as 'cpf' | 'cnpj') || 'cnpj',
        document_number: editingSupplier.document_number || '',
        email: editingSupplier.email || '',
        whatsapp: editingSupplier.whatsapp || '',
        phone: editingSupplier.phone || '',
        website: editingSupplier.website || '',
        state: editingSupplier.state || '',
        city: editingSupplier.city || '',
        address: editingSupplier.address || '',
        specialties: editingSupplier.specialties || [],
        type: editingSupplier.type || 'local',
        status: editingSupplier.status || 'active',
      });
      setErrors({});
      setCurrentStep(1);
    }
  }, [editingSupplier]);

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
    // Guardar ID do fornecedor existente para associação
    setExistingSupplierId(supplier.id);
    
    // Preencher formulário com dados do fornecedor existente (apenas para visualização)
    setFormData({
      name: supplier.name || '',
      document_type: supplier.document_type || 'cnpj',
      document_number: supplier.document_number || '', 
      email: supplier.email || '',
      whatsapp: supplier.whatsapp || '',
      phone: supplier.phone || '',
      website: supplier.website || '',
      state: supplier.state || '',
      city: supplier.city || '',
      address: supplier.address?.street || '',
      specialties: supplier.specialties || [],
      type: supplier.type || 'local',
      status: 'active',
    });
    setErrors({});
    
    console.log('📋 [SUPPLIER-FORM] Fornecedor existente selecionado:', supplier.name);
    console.log('🔗 [SUPPLIER-FORM] Será criada apenas a associação com o cliente atual');
    console.log('🆔 [SUPPLIER-FORM] Supplier ID:', supplier.id);
  }, []);

  const validateStep = useCallback((step: number) => {
    const newErrors: Partial<Record<keyof SupplierFormData, string>> = {};
    
    try {
      switch (step) {
        case 1:
          basicInfoSchema.parse(formData);
          break;
        case 2:
          contactSchema.parse(formData);
          break;
        case 3:
          locationSchema.parse(formData);
          break;
        case 4:
          specialtiesSchema.parse(formData);
          break;
        case 5:
          // Validation for confirmation step (full form)
          supplierFormSchema.parse(formData);
          break;
      }
    } catch (error: any) {
      if (error.errors) {
        error.errors.forEach((err: any) => {
          newErrors[err.path[0] as keyof SupplierFormData] = err.message;
        });
      }
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
      
      // Se estamos reutilizando um fornecedor existente, apenas criar associação
      if (existingSupplierId && !editingSupplier) {
        console.log('🔗 [SUPPLIER-FORM] Associando fornecedor existente ao cliente atual');
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase
          .from('profiles')
          .select('client_id')
          .eq('id', user?.id)
          .single();

        if (!profile?.client_id) {
          throw new Error('Cliente não identificado');
        }

        const { data: association, error: assocError } = await supabase
          .from('client_suppliers')
          .upsert({
            client_id: profile.client_id,
            supplier_id: existingSupplierId,
            status: 'active'
          }, {
            onConflict: 'client_id,supplier_id'
          })
          .select()
          .single();

        if (assocError) throw assocError;

        toast({
          title: "Fornecedor associado!",
          description: `${validatedData.name} foi associado ao seu cliente com sucesso.`,
        });
        
        result = association;
      } else if (editingSupplier) {
        console.log('🔄 [SUPPLIER-FORM] Modo edição - atualizando fornecedor:', editingSupplier.id);
        result = await updateSupplier(editingSupplier.id, validatedData);
        if (result) {
          toast({
            title: "Fornecedor atualizado!",
            description: `${validatedData.name} foi atualizado com sucesso.`,
          });
        }
      } else {
        console.log('🆕 [SUPPLIER-FORM] Modo criação - criando novo fornecedor');
        result = await createSupplier(validatedData);
        if (result) {
          toast({
            title: "Fornecedor cadastrado!",
            description: `${validatedData.name} foi cadastrado e receberá cotações.`,
          });
        }
      }

      if (result) {
        console.log('🎉 [SUPPLIER-FORM] Operação concluída com sucesso');
        resetForm();
        setExistingSupplierId(null);
        onSuccess?.();
      } else {
        console.log('❌ [SUPPLIER-FORM] Operação falhou - resultado nulo');
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