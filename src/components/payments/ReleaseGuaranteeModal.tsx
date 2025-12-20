import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ReleaseGuaranteeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: any;
  onConfirm: (notes: string) => Promise<void>;
}

export function ReleaseGuaranteeModal({
  open,
  onOpenChange,
  payment,
  onConfirm,
}: ReleaseGuaranteeModalProps) {
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm(notes);
      onOpenChange(false);
      setNotes('');
    } catch (error) {
      console.error('❌ [MODAL] Erro ao liberar garantia:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-600" />
            Liberar Fundos em Garantia
          </DialogTitle>
          <DialogDescription>
            A entrega já foi confirmada. Confirme a liberação dos fundos ao fornecedor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Payment Details */}
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pagamento:</span>
              <span className="font-mono font-medium">{payment?.local_code || payment?.id}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor em Garantia:</span>
              <span className="font-bold text-lg">{formatCurrency(payment?.amount || 0)}</span>
            </div>
            <Badge variant="outline" className="w-fit">
              Status: Em Garantia
            </Badge>
          </div>

          {/* Optional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (Opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Adicione comentários sobre a liberação..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Important Notice */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <p className="font-medium mb-1">⚠️ Atenção:</p>
            <p>Ao confirmar, os fundos serão transferidos imediatamente ao fornecedor. Esta ação é irreversível.</p>
          </div>
        </div>

        <DialogFooter>
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
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar e Liberar Fundos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Mantém export antigo para compatibilidade
export { ReleaseGuaranteeModal as ReleaseEscrowModal };
