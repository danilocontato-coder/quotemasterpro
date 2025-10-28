import { Check, ArrowDown, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface UpgradeConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentPlan: string;
  newPlan: string;
  amountDue: number;
  daysRemaining: number;
  originalDueDate: string;
  isLoading: boolean;
}

export function UpgradeConfirmationModal({
  open,
  onClose,
  onConfirm,
  currentPlan,
  newPlan,
  amountDue,
  daysRemaining,
  originalDueDate,
  isLoading
}: UpgradeConfirmationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar Upgrade de Plano</DialogTitle>
          <DialogDescription>
            Você está fazendo upgrade do seu plano atual
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumo do Upgrade */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Plano Atual:</span>
              <span className="font-medium">{currentPlan}</span>
            </div>
            <ArrowDown className="h-4 w-4 mx-auto text-muted-foreground" />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Novo Plano:</span>
              <span className="font-medium text-primary">{newPlan}</span>
            </div>
          </div>

          {/* Cálculo Pro-Rata */}
          <div className="border-t pt-4 space-y-3">
            <h4 className="font-medium text-sm">Como funciona o pagamento:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                <span>Você pagará apenas a <strong>diferença proporcional</strong> pelos {daysRemaining} dias restantes</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                <span>Seu vencimento continua sendo <strong>{new Date(originalDueDate).toLocaleDateString('pt-BR')}</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                <span>Após o pagamento, você terá <strong>acesso imediato</strong> aos recursos do novo plano</span>
              </li>
            </ul>
          </div>

          {/* Valor a Pagar */}
          <div className="bg-primary/5 p-4 rounded-lg border-2 border-primary/20">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Valor a pagar agora:</span>
              <span className="text-2xl font-bold text-primary">
                R$ {amountDue.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              (Diferença proporcional pelos próximos {daysRemaining} dias)
            </p>
          </div>

          {/* Exemplo de Cálculo */}
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground">
              Como calculamos esse valor?
            </summary>
            <div className="mt-2 p-3 bg-muted rounded space-y-1">
              <p>Fórmula: (Diferença mensal × Dias restantes) ÷ 30</p>
              <p className="text-primary font-mono">
                R$ {amountDue.toFixed(2)} = (Diferença × {daysRemaining}) ÷ 30
              </p>
            </div>
          </details>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                Confirmar Upgrade
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
