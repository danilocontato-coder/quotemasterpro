import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { XCircle } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface RevokeAcceptanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  onConfirm: () => Promise<boolean>;
}

export const RevokeAcceptanceDialog: React.FC<RevokeAcceptanceDialogProps> = ({
  open,
  onOpenChange,
  userName,
  onConfirm,
}) => {
  const [isRevoking, setIsRevoking] = useState(false);

  const handleConfirm = async () => {
    setIsRevoking(true);
    const success = await onConfirm();
    setIsRevoking(false);
    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Revogar Aceite de Termos
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Você está prestes a revogar o aceite de termos de <strong>{userName}</strong>.
            </p>
            <p className="text-destructive font-medium">
              ⚠️ O usuário precisará aceitar os termos novamente no próximo login.
            </p>
            <p>Esta ação será registrada no log de auditoria.</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRevoking}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isRevoking}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isRevoking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Revogando...
              </>
            ) : (
              'Confirmar Revogação'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
