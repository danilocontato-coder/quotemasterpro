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
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ReleaseEscrowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: any;
  onConfirm: (notes: string, deliveryConfirmed: boolean) => Promise<void>;
}

export function ReleaseEscrowModal({
  open,
  onOpenChange,
  payment,
  onConfirm,
}: ReleaseEscrowModalProps) {
  const [notes, setNotes] = useState('');
  const [deliveryConfirmed, setDeliveryConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (!deliveryConfirmed) return;
    
    setIsLoading(true);
    try {
      await onConfirm(notes, deliveryConfirmed);
      // Só fecha se não deu erro
      onOpenChange(false);
      setNotes('');
      setDeliveryConfirmed(false);
    } catch (error) {
      // Erro já tratado pelo onConfirm (toast), apenas não fechar o modal
      console.error('❌ [MODAL] Erro ao liberar escrow:', error);
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-600" />
            Liberar Fundos do Escrow
          </DialogTitle>
          <DialogDescription>
            Confirme o recebimento da entrega para liberar os fundos retidos ao fornecedor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Payment Details */}
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pagamento:</span>
              <span className="font-mono font-medium">{payment?.id}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor Retido:</span>
              <span className="font-bold text-lg">{formatCurrency(payment?.amount || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Liberação Automática:</span>
              <span className="font-medium">
                {payment?.escrow_release_date ? formatDate(payment.escrow_release_date) : 'Não definida'}
              </span>
            </div>
            <Badge variant="outline" className="w-fit">
              Status: Em Retenção (Escrow)
            </Badge>
          </div>

          {/* Delivery Confirmation */}
          <div className="space-y-3">
            <div className="flex items-start space-x-2 p-3 border border-yellow-200 bg-yellow-50 rounded-lg">
              <Checkbox
                id="delivery-confirm"
                checked={deliveryConfirmed}
                onCheckedChange={(checked) => setDeliveryConfirmed(checked as boolean)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="delivery-confirm"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Confirmo que recebi a entrega completa e conforme o esperado
                </Label>
                <p className="text-xs text-muted-foreground">
                  Ao confirmar, os fundos serão transferidos automaticamente ao fornecedor.
                </p>
              </div>
            </div>

            {/* Optional Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Observações (Opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Adicione comentários sobre a entrega..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Important Notice */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            <p className="font-medium mb-1">⚠️ Atenção:</p>
            <p>Esta ação é irreversível. Certifique-se de que recebeu todos os produtos/serviços antes de liberar os fundos.</p>
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
            disabled={!deliveryConfirmed || isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar e Liberar Fundos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
