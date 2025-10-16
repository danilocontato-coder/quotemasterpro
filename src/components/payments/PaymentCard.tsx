import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  CreditCard, 
  Clock, 
  Eye, 
  FileText,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Lock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PaymentCardProps {
  payment: any;
  onPay: (paymentId: string) => void;
  onConfirmDelivery: (paymentId: string) => void;
  onViewDetails: (payment: any) => void;
  onOfflinePayment?: (payment: any) => void;
}

const getStatusInfo = (status: string) => {
  switch (status) {
    case 'pending':
      return { 
        label: 'Pendente', 
        variant: 'secondary' as const,
        icon: Clock,
        color: 'text-yellow-600'
      };
    case 'processing':
      return { 
        label: 'Processando', 
        variant: 'default' as const,
        icon: CreditCard,
        color: 'text-blue-600'
      };
    case 'in_escrow':
      return { 
        label: 'Em Garantia', 
        variant: 'default' as const,
        icon: CheckCircle2,
        color: 'text-green-600'
      };
    case 'completed':
      return { 
        label: 'Concluído', 
        variant: 'default' as const,
        icon: CheckCircle2,
        color: 'text-green-600'
      };
    case 'failed':
      return { 
        label: 'Falhou', 
        variant: 'destructive' as const,
        icon: AlertCircle,
        color: 'text-red-600'
      };
    case 'disputed':
      return { 
        label: 'Disputado', 
        variant: 'destructive' as const,
        icon: AlertCircle,
        color: 'text-red-600'
      };
    default:
      return { 
        label: status, 
        variant: 'outline' as const,
        icon: Clock,
        color: 'text-gray-600'
      };
  }
};

export function PaymentCard({ payment, onPay, onConfirmDelivery, onViewDetails, onOfflinePayment }: PaymentCardProps) {
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const statusInfo = getStatusInfo(payment.status);
  const StatusIcon = statusInfo.icon;

  // Handler para criar pagamento Asaas
  const handleAsaasPayment = async () => {
    // Validar wallet antes de criar pagamento
    if (!payment.supplier_id) {
      toast.error('Pagamento sem fornecedor associado');
      return;
    }

    if (!payment.suppliers?.asaas_wallet_id) {
      toast.error(
        'Fornecedor ainda não configurou a carteira Asaas. Entre em contato com o administrador.',
        { duration: 5000 }
      );
      return;
    }

    setIsCreatingPayment(true);
    try {
      console.log('🚀 Criando pagamento Asaas para:', payment.id);
      
      const { data, error } = await supabase.functions.invoke('create-asaas-payment', {
        body: { paymentId: payment.id }
      });

      if (error) {
        console.error('❌ Erro ao criar pagamento Asaas:', error);
        
        // Detectar erro de wallet não configurada
        if (error.message?.includes('wallet') || error.message?.includes('carteira')) {
          toast.error(
            'Fornecedor ainda não configurou a carteira Asaas. Entre em contato com o administrador.',
            { duration: 5000 }
          );
        } else {
          toast.error('Erro ao criar pagamento: ' + (error.message || 'Erro desconhecido'));
        }
        return;
      }

      if (data?.invoiceUrl) {
        console.log('✅ Pagamento criado com sucesso! URL:', data.invoiceUrl);
        toast.success('Pagamento criado! Abrindo link seguro...');
        window.open(data.invoiceUrl, '_blank');
      } else {
        toast.error('Link de pagamento não disponível');
      }
    } catch (err) {
      console.error('❌ Erro inesperado:', err);
      toast.error('Erro ao criar pagamento');
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">#{payment.id}</h3>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                <span className="font-medium">Cotação:</span> #{payment.quote_id}
              </p>
              {payment.quotes?.title && (
                <p>
                  <span className="font-medium">Descrição:</span> {payment.quotes.title}
                </p>
              )}
              {payment.clients?.name && (
                <p>
                  <span className="font-medium">Cliente:</span> {payment.clients.name}
                </p>
              )}
              {payment.suppliers?.name && (
                <p>
                  <span className="font-medium">Fornecedor:</span> {payment.suppliers.name}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={statusInfo.variant} className="gap-1">
                <StatusIcon className="h-3 w-3" />
                {statusInfo.label}
              </Badge>
            </div>
            <div className="text-lg font-bold text-primary">
              {formatCurrency(payment.amount)}
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {payment.status === 'pending' && payment.supplier_id && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex-1 min-w-[120px]">
                    <Button 
                      onClick={handleAsaasPayment}
                      disabled={!payment.suppliers?.asaas_wallet_id || isCreatingPayment}
                      className="w-full"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      {isCreatingPayment ? 'Criando...' : '🔒 Pagar com Segurança'}
                    </Button>
                  </div>
                </TooltipTrigger>
                {!payment.suppliers?.asaas_wallet_id && (
                  <TooltipContent>
                    <p>Fornecedor precisa configurar carteira Asaas</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
          
          {payment.status === 'in_escrow' && (
            <Button 
              onClick={() => onConfirmDelivery(payment)}
              className="flex-1 min-w-[120px] bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              🔓 Liberar Fundos
            </Button>
          )}

          <Button 
            onClick={() => onViewDetails(payment)}
            variant="outline"
            size="sm"
          >
            <Eye className="h-4 w-4 mr-1" />
            Ver Detalhes
          </Button>
          
          {payment.status === 'pending' && onOfflinePayment && (
            <Button 
              onClick={() => onOfflinePayment(payment)}
              variant="secondary"
              size="sm"
            >
              <FileText className="h-4 w-4 mr-1" />
              📝 Informar Pagamento
            </Button>
          )}
        </div>

        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
          Criado em {new Date(payment.created_at).toLocaleDateString('pt-BR')}
        </div>
      </CardContent>
    </Card>
  );
}