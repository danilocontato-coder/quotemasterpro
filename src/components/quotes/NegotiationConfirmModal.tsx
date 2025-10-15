import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

interface NegotiationConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  proposalDetails: {
    supplierName: string;
    totalPrice: number;
    currentScore: number;
  };
}

export const NegotiationConfirmModal: React.FC<NegotiationConfirmModalProps> = ({
  open,
  onClose,
  onConfirm,
  proposalDetails
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Negociar com IA - Sem Garantias
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p className="text-base">
              A IA tentará negociar <strong>melhores condições</strong> com{' '}
              <strong>{proposalDetails.supplierName}</strong> via WhatsApp:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>💰 Redução de preço</li>
              <li>⏱️ Melhoria no prazo de entrega</li>
              <li>🛡️ Extensão de garantia</li>
            </ul>
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mt-3">
              <p className="text-sm font-medium text-amber-800">
                ⚠️ <strong>Importante:</strong> Não há garantia de que o fornecedor aceitará negociar.
                Você terá no máximo 2 tentativas.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-blue-600 hover:bg-blue-700">
            Sim, Negociar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
