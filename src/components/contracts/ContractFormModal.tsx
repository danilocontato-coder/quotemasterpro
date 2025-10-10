import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ContractForm } from './ContractForm';
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
  const handleSuccess = () => {
    onClose();
    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">
              {editingContract ? 'Editar Contrato' : 'Novo Contrato'}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {editingContract 
              ? 'Atualize as informações do contrato' 
              : 'Preencha as informações para criar um novo contrato'}
          </p>
        </DialogHeader>

        <div className="mt-6">
          <ContractForm
            contract={editingContract}
            mode={editingContract ? 'edit' : 'create'}
            onSuccess={handleSuccess}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
