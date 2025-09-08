import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface TenantOnboardingProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TenantOnboarding({ open, onOpenChange }: TenantOnboardingProps) {
  // Componente simplificado - não precisa mais de onboarding complexo
  // Apenas fecha o modal automaticamente
  React.useEffect(() => {
    if (open && onOpenChange) {
      onOpenChange(false);
    }
  }, [open, onOpenChange]);

  return (
    <Dialog open={false}>
      <DialogContent>
        {/* Componente vazio - onboarding sempre completo */}
      </DialogContent>
    </Dialog>
  );
}