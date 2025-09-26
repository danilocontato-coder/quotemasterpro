import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Stepper } from '@/components/ui/stepper';
import { ArrowLeft, ArrowRight, Save, X, CheckCircle } from 'lucide-react';
import { useSupplierForm } from '@/hooks/useSupplierForm';
import { BasicInfoStep } from './forms/BasicInfoStep';
import { ContactStep } from './forms/ContactStep';
import { LocationStep } from './forms/LocationStep';
import { SpecialtiesStep } from './forms/SpecialtiesStep';
import { ConfirmationStep } from './forms/ConfirmationStep';

interface SupplierFormModalProps {
  open: boolean;
  onClose: () => void;
  editingSupplier?: any;
}

export function SupplierFormModal({ open, onClose, editingSupplier }: SupplierFormModalProps) {
  const {
    formData,
    errors,
    currentStep,
    isLoading,
    steps,
    updateField,
    nextStep,
    prevStep,
    goToStep,
    handleSubmit,
    handleCancel,
    canGoNext,
    canGoPrev,
    isLastStep,
    isEditMode,
  } = useSupplierForm({
    editingSupplier,
    onSuccess: onClose,
    onCancel: onClose,
  });

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <BasicInfoStep
            data={formData}
            errors={errors}
            onChange={updateField}
          />
        );
      case 2:
        return (
          <ContactStep
            data={formData}
            errors={errors}
            onChange={updateField}
          />
        );
      case 3:
        return (
          <LocationStep
            data={formData}
            errors={errors}
            onChange={updateField}
          />
        );
        case 4:
          return (
            <SpecialtiesStep
              data={formData}
              errors={errors}
              onChange={updateField}
            />
          );
        case 5:
          return (
            <ConfirmationStep
              data={formData}
            />
          );
      default:
        return null;
    }
  };

  const handleClose = () => {
    handleCancel();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              {isEditMode ? 'Editar Fornecedor' : 'Novo Fornecedor'}
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
              steps={steps.map(step => ({
                id: step.id,
                title: step.title,
                description: step.description,
                status: currentStep > step.id ? 'completed' : currentStep === step.id ? 'current' : 'upcoming'
              }))}
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
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            )}

            {canGoNext ? (
              <Button
                onClick={nextStep}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                Próximo
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex items-center gap-2 bg-success hover:bg-success/90 text-white"
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {isEditMode ? 'Atualizar' : 'Cadastrar'} Fornecedor
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