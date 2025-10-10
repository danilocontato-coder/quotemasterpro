import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { addMonths } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type Contract = Database['public']['Tables']['contracts']['Row'];

const contractSchema = z.object({
  title: z.string().trim().min(3, 'Título deve ter no mínimo 3 caracteres').max(200, 'Título muito longo'),
  contract_type: z.string().min(1, 'Tipo é obrigatório'),
  supplier_id: z.string().uuid('Fornecedor é obrigatório'),
  description: z.string().max(2000, 'Descrição muito longa').optional(),
  start_date: z.date(),
  end_date: z.date(),
  total_value: z.number().min(0, 'Valor deve ser positivo'),
  payment_terms: z.string().max(500, 'Termos de pagamento muito longos').optional(),
  payment_frequency: z.string().min(1, 'Periodicidade é obrigatória'),
  status: z.string().min(1, 'Status é obrigatório'),
  cost_center_id: z.string().uuid().optional().nullable(),
  alert_days_before: z.number().min(0).max(365).optional(),
  auto_renewal: z.boolean().optional(),
});

interface UseContractFormProps {
  editingContract?: Contract | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function useContractForm({ editingContract, onSuccess, onCancel }: UseContractFormProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [contractDuration, setContractDuration] = useState('custom');
  const [attachments, setAttachments] = useState<string[]>(() => {
    if (editingContract?.attachments && Array.isArray(editingContract.attachments)) {
      return editingContract.attachments.filter((item): item is string => typeof item === 'string');
    }
    return [];
  });
  const [uploadingFile, setUploadingFile] = useState(false);

  const [formData, setFormData] = useState({
    title: editingContract?.title || '',
    contract_type: editingContract?.contract_type || 'fornecimento',
    supplier_id: editingContract?.supplier_id || '',
    description: editingContract?.description || '',
    start_date: editingContract?.start_date ? new Date(editingContract.start_date) : undefined,
    end_date: editingContract?.end_date ? new Date(editingContract.end_date) : undefined,
    total_value: editingContract?.total_value || 0,
    payment_terms: editingContract?.payment_terms || '',
    payment_frequency: editingContract?.payment_frequency || 'monthly',
    status: editingContract?.status || 'rascunho',
    cost_center_id: editingContract?.cost_center_id || null,
    alert_days_before: editingContract?.alert_days_before || 30,
    auto_renewal: editingContract?.auto_renewal || false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const steps = [
    { id: 1, title: 'Básico', description: 'Informações principais' },
    { id: 2, title: 'Período', description: 'Datas e duração' },
    { id: 3, title: 'Valores', description: 'Financeiro' },
    { id: 4, title: 'Anexos', description: 'Documentos' },
    { id: 5, title: 'Confirmar', description: 'Revisão final' },
  ];

  const updateField = (field: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Se a data de início mudou e temos uma duração selecionada (não custom), recalcular data final
      if (field === 'start_date' && value && contractDuration !== 'custom') {
        const durations = [
          { value: '6m', months: 6 },
          { value: '1y', months: 12 },
          { value: '2y', months: 24 },
          { value: '3y', months: 36 },
          { value: '5y', months: 60 },
        ];
        
        const selectedDuration = durations.find(d => d.value === contractDuration);
        if (selectedDuration) {
          newData.end_date = addMonths(value, selectedDuration.months);
        }
      }
      
      return newData;
    });
    
    // Limpar erro do campo quando atualizado
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleDurationChange = (duration: string) => {
    setContractDuration(duration);
    
    const durations = [
      { value: '6m', months: 6 },
      { value: '1y', months: 12 },
      { value: '2y', months: 24 },
      { value: '3y', months: 36 },
      { value: '5y', months: 60 },
    ];
    
    // Se temos uma data de início e a duração não é custom, calcular data final
    if (duration !== 'custom' && formData.start_date) {
      const selectedDuration = durations.find(d => d.value === duration);
      if (selectedDuration) {
        const endDate = addMonths(formData.start_date, selectedDuration.months);
        setFormData(prev => ({ ...prev, end_date: endDate }));
      }
    } else if (duration === 'custom') {
      // Se mudou para custom, limpar a data de término para permitir seleção manual
      // Mas só se ainda não tiver sido definida manualmente
    }
  };

  const handleFileUpload = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast({
        title: 'Tipo de arquivo inválido',
        description: 'Apenas arquivos PDF são permitidos',
        variant: 'destructive'
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O arquivo deve ter no máximo 10MB',
        variant: 'destructive'
      });
      return;
    }

    setUploadingFile(true);
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `contracts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('contract-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('contract-attachments')
        .getPublicUrl(filePath);

      setAttachments(prev => [...prev, publicUrl]);

      toast({
        title: 'Arquivo enviado',
        description: 'PDF anexado com sucesso'
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Erro no upload',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const removeAttachment = (url: string) => {
    setAttachments(prev => prev.filter(a => a !== url));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.title.trim()) newErrors.title = 'Título é obrigatório';
        if (!formData.contract_type) newErrors.contract_type = 'Tipo é obrigatório';
        if (!formData.supplier_id) newErrors.supplier_id = 'Fornecedor é obrigatório';
        break;
      case 2:
        if (!formData.start_date) newErrors.start_date = 'Data de início é obrigatória';
        if (!formData.end_date) newErrors.end_date = 'Data de término é obrigatória';
        if (formData.start_date && formData.end_date && formData.end_date <= formData.start_date) {
          newErrors.end_date = 'Data de término deve ser posterior à data de início';
        }
        break;
      case 3:
        if (formData.total_value < 0) newErrors.total_value = 'Valor deve ser positivo';
        if (!formData.payment_frequency) newErrors.payment_frequency = 'Periodicidade é obrigatória';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    } else {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos obrigatórios antes de continuar',
        variant: 'destructive'
      });
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const goToStep = (step: number) => {
    if (step <= currentStep || step === currentStep - 1) {
      setCurrentStep(step);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      toast({
        title: 'Erro de validação',
        description: 'Verifique os campos obrigatórios',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', user.id)
        .single();

      if (!profile?.client_id) throw new Error('Cliente não encontrado');

      const contractData: any = {
        title: formData.title.trim(),
        contract_type: formData.contract_type,
        supplier_id: formData.supplier_id,
        client_id: profile.client_id,
        description: formData.description?.trim() || null,
        start_date: formData.start_date!.toISOString(),
        end_date: formData.end_date!.toISOString(),
        total_value: formData.total_value,
        payment_terms: formData.payment_terms?.trim() || null,
        payment_frequency: formData.payment_frequency,
        status: formData.status,
        cost_center_id: formData.cost_center_id || null,
        alert_days_before: formData.alert_days_before || 30,
        auto_renewal: formData.auto_renewal || false,
        attachments: attachments,
        created_by: user.id,
      };

      if (editingContract) {
        const { error } = await supabase
          .from('contracts')
          .update(contractData)
          .eq('id', editingContract.id);

        if (error) throw error;

        toast({
          title: 'Contrato atualizado',
          description: 'Contrato atualizado com sucesso'
        });
      } else {
        const { error } = await supabase
          .from('contracts')
          .insert(contractData);

        if (error) throw error;

        toast({
          title: 'Contrato criado',
          description: 'Contrato criado com sucesso'
        });
      }

      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/contracts');
      }
    } catch (error: any) {
      console.error('Error saving contract:', error);
      toast({
        title: 'Erro ao salvar contrato',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/contracts');
    }
  };

  const canGoNext = currentStep < steps.length;
  const canGoPrev = currentStep > 1;
  const isLastStep = currentStep === steps.length;
  const isEditMode = !!editingContract;

  return {
    formData,
    errors,
    currentStep,
    isLoading,
    steps,
    contractDuration,
    attachments,
    uploadingFile,
    updateField,
    handleDurationChange,
    handleFileUpload,
    removeAttachment,
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
}
