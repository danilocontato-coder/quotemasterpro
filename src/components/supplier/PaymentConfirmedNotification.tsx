import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface PaymentConfirmedNotificationProps {
  quoteLocalCode: string;
  quoteTitle: string;
  onScheduleNow: () => void;
  onDismiss: () => void;
}

export function PaymentConfirmedNotification({
  quoteLocalCode,
  quoteTitle,
  onScheduleNow,
  onDismiss,
}: PaymentConfirmedNotificationProps) {
  return (
    <div className="relative p-4 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-lg shadow-lg">
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
      
      <div className="pr-6">
        <div className="flex items-start gap-3 mb-3">
          <div className="text-2xl">💰</div>
          <div>
            <h4 className="font-semibold text-green-800">Pagamento Confirmado!</h4>
            <p className="text-sm text-foreground mt-1">
              Cotação <span className="font-mono font-bold">#{quoteLocalCode}</span> - {quoteTitle}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              O pagamento está em custódia. Agende a entrega para prosseguir.
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 mt-3">
          <Button
            onClick={onScheduleNow}
            size="sm"
            className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
          >
            🚚 Agendar Agora
          </Button>
          <Button
            onClick={onDismiss}
            variant="outline"
            size="sm"
          >
            Ver Depois
          </Button>
        </div>
      </div>
    </div>
  );
}
