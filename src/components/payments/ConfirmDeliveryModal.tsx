import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, AlertTriangle } from "lucide-react";
import SupplierRatingModal from "@/components/ratings/SupplierRatingModal";

interface ConfirmDeliveryModalProps {
  payment: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (notes?: string) => void;
  deliveryId?: string;
  supplierId?: string;
  supplierName?: string;
  quoteId?: string;
}

export function ConfirmDeliveryModal({ 
  payment, 
  open, 
  onOpenChange, 
  onConfirm,
  deliveryId,
  supplierId,
  supplierName,
  quoteId
}: ConfirmDeliveryModalProps) {
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm(notes.trim() || undefined);
      setNotes("");
      onOpenChange(false);
      
      // Abrir modal de avaliação após confirmação
      if (supplierId && quoteId) {
        setTimeout(() => setShowRatingModal(true), 300);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  if (!payment) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Confirmar Entrega
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-green-900 mb-1">
                  Confirmar recebimento dos produtos/serviços
                </p>
                <p className="text-sm text-green-800">
                  Ao confirmar, o valor de <strong>{formatCurrency(payment.amount)}</strong> será 
                  liberado imediatamente para o fornecedor <strong>{payment.supplierName}</strong>.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-yellow-900 mb-1">Atenção</p>
                <p className="text-sm text-yellow-800">
                  Esta ação não pode ser desfeita. Certifique-se de que recebeu tudo conforme acordado.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="delivery-notes">
              Observações sobre a entrega (opcional)
            </Label>
            <Textarea
              id="delivery-notes"
              placeholder="Descreva como foi a entrega, qualidade dos produtos/serviços, etc..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="bg-muted p-3 rounded-lg text-sm">
            <p className="font-medium mb-1">Detalhes do pagamento:</p>
            <p>• Cotação: {payment.quoteName}</p>
            <p>• Fornecedor: {payment.supplierName}</p>
            <p>• Valor: {formatCurrency(payment.amount)}</p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isLoading ? "Confirmando..." : "Confirmar Entrega"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Modal de Avaliação */}
    {showRatingModal && supplierId && quoteId && (
      <SupplierRatingModal
        open={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        supplierId={supplierId}
        supplierName={supplierName || 'Fornecedor'}
        quoteId={quoteId}
        deliveryId={deliveryId}
        onRatingSubmitted={() => setShowRatingModal(false)}
      />
    )}
    </>
  );
}