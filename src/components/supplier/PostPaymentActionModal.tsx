import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Package, DollarSign, Clock } from 'lucide-react';

interface PostPaymentActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteLocalCode: string;
  quoteTitle: string;
  clientName: string;
  paymentAmount: number;
  onScheduleNow: () => void;
}

export function PostPaymentActionModal({
  open,
  onOpenChange,
  quoteLocalCode,
  quoteTitle,
  clientName,
  paymentAmount,
  onScheduleNow,
}: PostPaymentActionModalProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleScheduleNow = () => {
    onOpenChange(false);
    onScheduleNow();
  };

  const handleLater = () => {
    // Salvar no localStorage para não mostrar novamente
    const dismissedQuotes = JSON.parse(
      localStorage.getItem('dismissed_payment_modals') || '[]'
    );
    dismissedQuotes.push(quoteLocalCode);
    localStorage.setItem('dismissed_payment_modals', JSON.stringify(dismissedQuotes));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            🎉 Pagamento Confirmado!
          </DialogTitle>
          <DialogDescription className="text-center">
            O pagamento foi realizado e está em custódia segura até a entrega
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Quote Info */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Cotação</div>
                <div className="font-semibold">#{quoteLocalCode} - {quoteTitle}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Cliente</div>
                <div className="font-medium">{clientName}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Valor em Custódia</div>
                <div className="font-semibold text-green-700 text-lg">
                  {formatCurrency(paymentAmount)}
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Próximos passos:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Agende a entrega com data e endereço</li>
                  <li>Realize a entrega no prazo combinado</li>
                  <li>Compartilhe o código de confirmação com o cliente</li>
                  <li>Receba o pagamento após confirmação</li>
                </ol>
              </div>
            </div>
          </div>

          {/* CTA Message */}
          <div className="text-center">
            <p className="font-semibold text-foreground">
              Gostaria de agendar a entrega agora?
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleLater}
            className="flex-1"
          >
            Mais Tarde
          </Button>
          <Button
            onClick={handleScheduleNow}
            className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
          >
            🚚 Sim, Agendar Agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
