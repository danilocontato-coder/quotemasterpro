import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  Clock, 
  Eye, 
  FileText,
  CheckCircle2,
  AlertCircle,
  DollarSign
} from "lucide-react";

interface PaymentCardProps {
  payment: any;
  onPay: (paymentId: string) => void;
  onConfirmDelivery: (paymentId: string) => void;
  onViewDetails: (payment: any) => void;
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

export function PaymentCard({ payment, onPay, onConfirmDelivery, onViewDetails }: PaymentCardProps) {
  const statusInfo = getStatusInfo(payment.status);
  const StatusIcon = statusInfo.icon;

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
          {payment.status === 'pending' && (
            <>
              <Button 
                onClick={async () => {
                  const { supabase } = await import('@/integrations/supabase/client');
                  const { toast } = await import('sonner');
                  
                  try {
                    const { data, error } = await supabase.functions.invoke('create-asaas-payment', {
                      body: { paymentId: payment.id }
                    });

                    if (error) throw error;

                    if (data?.asaas_invoice_url) {
                      window.open(data.asaas_invoice_url, '_blank');
                      toast.success("Pagamento Asaas criado! Abrindo link...");
                    }
                  } catch (error: any) {
                    console.error('Error creating Asaas payment:', error);
                    toast.error(error.message || "Erro ao criar pagamento Asaas");
                  }
                }}
                className="flex-1 min-w-[120px]"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                💳 Pagar com Asaas
              </Button>
            </>
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
          
          {payment.status === 'pending' && (
            <Button 
              variant="outline" 
              size="sm"
              disabled
            >
              <FileText className="h-4 w-4 mr-1" />
              Pagar Offline
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