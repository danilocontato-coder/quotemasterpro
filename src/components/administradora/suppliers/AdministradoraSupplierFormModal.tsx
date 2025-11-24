import React, { useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { Stepper } from '@/components/ui/stepper';
import { ArrowLeft, ArrowRight, Save, X, CheckCircle, Loader2 } from 'lucide-react';
import { useAdministradoraSupplierForm } from '@/hooks/useAdministradoraSupplierForm';
import { BasicInfoStep } from '@/components/suppliers/forms/BasicInfoStep';
import { ContactStep } from '@/components/suppliers/forms/ContactStep';
import { LocationStep } from '@/components/suppliers/forms/LocationStep';
import { SpecialtiesStep } from '@/components/suppliers/forms/SpecialtiesStep';
import { ConfirmationStep } from '@/components/suppliers/forms/ConfirmationStep';
import { SupplierCreationProgressBar } from '@/components/suppliers/SupplierCreationProgressBar';
import { ProgressTracker } from '@/components/ui/progress-tracker';

interface AdministradoraSupplierFormModalProps {
  open: boolean;
  onClose: () => void;
  administradoraId: string;
  editingSupplier?: any;
}

export function AdministradoraSupplierFormModal({ 
  open, 
  onClose, 
  administradoraId,
  editingSupplier 
}: AdministradoraSupplierFormModalProps) {
  const {
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
    submissionProgress,
    completionPercentage,
  } = useAdministradoraSupplierForm({
    administradoraId,
    editingSupplier,
    onSuccess: () => {
      onClose();
    },
    onCancel: () => {
      onClose();
    },
  });

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <BasicInfoStep
            data={formData}
            errors={errors}
            onChange={updateField}
            onSelectExistingSupplier={selectExistingSupplier}
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
            <div className="flex-1">
              <DialogTitle className="text-xl font-semibold">
                {isEditMode ? 'Editar Fornecedor' : 'Novo Fornecedor'}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                {isEditMode 
                  ? 'Atualize as informações do fornecedor nos campos abaixo.' 
                  : 'Preencha as informações do fornecedor em cada etapa do formulário.'}
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-4">
            <SupplierCreationProgressBar completionPercentage={completionPercentage} />
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
          
          {/* Progress Tracker durante submissão */}
          {isLoading && submissionProgress.step !== 'idle' && (
            <div className="mt-6">
              <ProgressTracker
                steps={[
                  { id: '1', label: 'Validação completa', status: submissionProgress.step === 'validating' ? 'inProgress' : 'completed' },
                  { id: '2', label: 'Fornecedor criado', status: submissionProgress.step === 'creating_supplier' ? 'inProgress' : submissionProgress.step === 'validating' ? 'pending' : 'completed' },
                  { id: '3', label: 'Criando usuário de acesso...', status: submissionProgress.step === 'creating_user' ? 'inProgress' : ['validating', 'creating_supplier'].includes(submissionProgress.step) ? 'pending' : 'completed' },
                  { id: '4', label: 'Aguardando sincronização', status: submissionProgress.step === 'syncing_profile' ? 'inProgress' : ['validating', 'creating_supplier', 'creating_user'].includes(submissionProgress.step) ? 'pending' : 'completed' },
                  { id: '5', label: 'Enviando notificações', status: submissionProgress.step === 'sending_notifications' ? 'inProgress' : submissionProgress.step === 'completed' ? 'completed' : 'pending' },
                ]}
              />
            </div>
          )}
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
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>

            {canGoPrev && (
              <Button
                type="button"
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
                type="button"
                onClick={nextStep}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                Próximo
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <LoadingButton
                type="button"
                onClick={handleSubmit}
                isLoading={isLoading}
                loadingText={submissionProgress.message || 'Salvando...'}
                disabled={isLoading}
                className="flex items-center gap-2 bg-success hover:bg-success/90 text-white"
              >
                <Save className="h-4 w-4" />
                {isEditMode ? 'Atualizar' : 'Cadastrar'} Fornecedor
              </LoadingButton>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
