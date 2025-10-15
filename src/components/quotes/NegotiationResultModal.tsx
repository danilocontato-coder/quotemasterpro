import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, TrendingDown, Clock, Shield } from 'lucide-react';

interface NegotiationResultModalProps {
  open: boolean;
  onClose: () => void;
  result: 'success' | 'failure';
  original: {
    price: number;
    deliveryTime: number;
    warrantyMonths: number;
  };
  negotiated?: {
    price: number;
    deliveryTime: number;
    warrantyMonths: number;
  };
  remainingAttempts: number;
  onApproveNegotiated?: () => void;
  onApproveOriginal?: () => void;
  onRetry?: () => void;
}

export const NegotiationResultModal: React.FC<NegotiationResultModalProps> = ({
  open,
  onClose,
  result,
  original,
  negotiated,
  remainingAttempts,
  onApproveNegotiated,
  onApproveOriginal,
  onRetry
}) => {
  const discountPercentage = negotiated 
    ? ((original.price - negotiated.price) / original.price * 100).toFixed(1)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {result === 'success' ? (
              <>
                <CheckCircle className="h-6 w-6 text-green-600" />
                Negociação Bem-Sucedida! 🎉
              </>
            ) : (
              <>
                <XCircle className="h-6 w-6 text-red-600" />
                Negociação Não Obteve Sucesso
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {result === 'success' && negotiated ? (
          <div className="space-y-4">
            <DialogDescription>
              A IA conseguiu negociar melhores condições:
            </DialogDescription>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Preço</span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 line-through">
                    R$ {original.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-lg font-bold text-green-600">
                    R$ {negotiated.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    <span className="text-sm ml-1">(-{discountPercentage}%)</span>
                  </p>
                </div>
              </div>

              {negotiated.deliveryTime < original.deliveryTime && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">Prazo</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 line-through">{original.deliveryTime} dias</p>
                    <p className="text-lg font-bold text-blue-600">{negotiated.deliveryTime} dias</p>
                  </div>
                </div>
              )}

              {negotiated.warrantyMonths > original.warrantyMonths && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-purple-600" />
                    <span className="font-medium">Garantia</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 line-through">{original.warrantyMonths} meses</p>
                    <p className="text-lg font-bold text-purple-600">{negotiated.warrantyMonths} meses</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <DialogDescription>
              O fornecedor manteve a proposta original.
            </DialogDescription>
            
            {remainingAttempts > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                <p className="text-sm text-amber-800">
                  Você ainda tem <strong>{remainingAttempts} tentativa(s)</strong> restante(s).
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {result === 'success' && negotiated ? (
            <>
              <Button variant="outline" onClick={onApproveOriginal}>
                Rejeitar e Usar Original
              </Button>
              <Button onClick={onApproveNegotiated} className="bg-green-600 hover:bg-green-700">
                Aprovar Nova Proposta
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>
                Voltar à Matriz
              </Button>
              {remainingAttempts > 0 && (
                <Button onClick={onRetry} variant="secondary">
                  Tentar Novamente
                </Button>
              )}
              <Button onClick={onApproveOriginal}>
                Aprovar Original
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
