import { useState, useCallback } from 'react';
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
  const [formData, setFormData] = useState<Partial<SupplierFormData>>({
    name: editingSupplier?.name || '',
    cnpj: editingSupplier?.cnpj || '',
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
    setFormData({
      name: supplier.name || '',
      cnpj: supplier.cnpj || '', 
      email: supplier.email || '',
      whatsapp: supplier.whatsapp || '',
      phone: supplier.phone || '',
      website: supplier.website || '',
      state: supplier.state || '',
      city: supplier.city || '',
      address: supplier.address?.street || '',
      specialties: supplier.specialties || [],
      type: supplier.type || 'local',
      status: supplier.status || 'active',
    });
    setErrors({});
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
      
      const validatedData = supplierFormSchema.parse(formData);
      console.log('✅ [SUPPLIER-FORM] Dados validados:', validatedData);
      
      setIsLoading(true);

      let result;
      if (editingSupplier) {
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
          description: "Ocorreu um erro inesperado. Tente novamente.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentStep, validateStep, formData, editingSupplier, updateSupplier, createSupplier, toast, onSuccess]);

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      cnpj: '',
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