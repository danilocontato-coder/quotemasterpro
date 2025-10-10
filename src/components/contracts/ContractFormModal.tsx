import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Stepper } from '@/components/ui/stepper';
import { ArrowLeft, ArrowRight, Save, X, CheckCircle } from 'lucide-react';
import { useContractForm } from '@/hooks/useContractForm';
import { BasicInfoStep } from './forms/BasicInfoStep';
import { PeriodStep } from './forms/PeriodStep';
import { ValuesStep } from './forms/ValuesStep';
import { AttachmentsStep } from './forms/AttachmentsStep';
import { ConfirmationStep } from './forms/ConfirmationStep';
import type { Database } from '@/integrations/supabase/types';

type Contract = Database['public']['Tables']['contracts']['Row'];

interface ContractFormModalProps {
  open: boolean;
  onClose: () => void;
  editingContract?: Contract | null;
  onSuccess?: () => void;
}

export function ContractFormModal({ 
  open, 
  onClose, 
  editingContract,
  onSuccess 
}: ContractFormModalProps) {
  const {
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
  } = useContractForm({
    editingContract,
    onSuccess: () => {
      onClose();
      if (onSuccess) onSuccess();
    },
    onCancel: () => {
      onClose();
    },
  });

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <BasicInfoStep data={formData} errors={errors} onChange={updateField} />;
      case 2:
        return (
          <PeriodStep 
            data={formData} 
            errors={errors} 
            contractDuration={contractDuration}
            onChange={updateField}
            onDurationChange={handleDurationChange}
          />
        );
      case 3:
        return <ValuesStep data={formData} errors={errors} onChange={updateField} />;
      case 4:
        return (
          <AttachmentsStep
            attachments={attachments}
            uploadingFile={uploadingFile}
            onFileUpload={handleFileUpload}
            onRemoveAttachment={removeAttachment}
          />
        );
      case 5:
        return <ConfirmationStep data={formData} attachments={attachments} />;
      default:
        return null;
    }
  };

  const handleClose = () => {
    handleCancel();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              {isEditMode ? 'Editar Contrato' : 'Novo Contrato'}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="mt-4">
            <Stepper
              steps={steps}
              currentStep={currentStep}
              onStepClick={goToStep}
              className="w-full"
            />
          </div>
        </DialogHeader>

        <div className="py-6">
          {renderStepContent()}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Passo {currentStep} de {steps.length}</span>
            {isLastStep && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Pronto para finalizar</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>

            {canGoPrev && (
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={isLoading}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>
            )}

            {!isLastStep ? (
              <Button
                onClick={nextStep}
                disabled={isLoading}
              >
                Próximo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {isEditMode ? 'Atualizar Contrato' : 'Criar Contrato'}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
