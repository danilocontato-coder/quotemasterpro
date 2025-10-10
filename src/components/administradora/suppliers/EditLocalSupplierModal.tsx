import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { SupplierFormFields } from './SupplierFormFields';
import { toast } from 'sonner';
import { AdministradoraSupplier } from '@/hooks/useAdministradoraSuppliersManagement';

interface EditLocalSupplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: AdministradoraSupplier | null;
  onUpdateSupplier: (id: string, data: any) => Promise<any>;
}

export const EditLocalSupplierModal: React.FC<EditLocalSupplierModalProps> = ({
  open,
  onOpenChange,
  supplier,
  onUpdateSupplier,
}) => {
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        cnpj: supplier.cnpj || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        whatsapp: supplier.whatsapp || '',
        website: supplier.website || '',
        address: supplier.address || {},
        specialties: supplier.specialties || [],
        region: supplier.region || '',
        state: supplier.state || '',
        city: supplier.city || '',
        status: supplier.status || 'active',
      });
    }
  }, [supplier]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.cnpj?.trim()) {
      newErrors.cnpj = 'CNPJ é obrigatório';
    } else if (formData.cnpj.replace(/\D/g, '').length !== 14) {
      newErrors.cnpj = 'CNPJ inválido';
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!supplier) return;

    if (!validateForm()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onUpdateSupplier(supplier.id, formData);
      if (result?.success) {
        handleClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({});
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Fornecedor</DialogTitle>
          <DialogDescription>
            Atualize os dados do fornecedor. Campos com * são obrigatórios.
          </DialogDescription>
        </DialogHeader>

        <SupplierFormFields
          formData={formData}
          onChange={(field, value) => setFormData({ ...formData, [field]: value })}
          errors={errors}
        />

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Alterações'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
