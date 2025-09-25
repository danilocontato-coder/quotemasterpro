import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, Clock, CheckCircle, AlertTriangle, Package, Receipt } from "lucide-react";
import { Payment } from "@/hooks/useSupabasePayments";
import { OfflinePaymentModal } from "./OfflinePaymentModal";

interface PaymentCardProps {
  payment: Payment;
  onPay?: (paymentId: string) => void;
  onConfirmDelivery?: (paymentId: string) => void;
  onViewDetails?: (payment: Payment) => void;
  userRole?: string;
}

export function PaymentCard({ payment, onPay, onConfirmDelivery, onViewDetails, userRole }: PaymentCardProps) {
  const [showOfflineModal, setShowOfflineModal] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-500';
      case 'processing': return 'bg-blue-500';
      case 'in_escrow': return 'bg-yellow-500';
      case 'manual_confirmation': return 'bg-orange-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'disputed': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'processing': return 'Processando';
      case 'in_escrow': return 'Em Garantia';
      case 'manual_confirmation': return 'Análise Manual';
      case 'completed': return 'Concluído';
      case 'failed': return 'Falhou';
      case 'disputed': return 'Contestado';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'processing': return <CreditCard className="h-4 w-4" />;
      case 'in_escrow': return <Package className="h-4 w-4" />;
      case 'manual_confirmation': return <Receipt className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'failed': case 'disputed': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const getDaysUntilRelease = (releaseDate: string) => {
    const release = new Date(releaseDate);
    const now = new Date();
    const diffTime = release.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {getStatusIcon(payment.status)}
            Pagamento #{payment.id.slice(-6)}
          </CardTitle>
          <Badge className={`${getStatusColor(payment.status)} text-white`}>
            {getStatusText(payment.status)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Informações básicas */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Cotação</p>
            <p className="font-medium">#{payment.quote_id}</p>
            {payment.quotes && (
              <p className="text-sm text-muted-foreground">{payment.quotes.title}</p>
            )}
          </div>
          <div>
            <p className="text-muted-foreground">Valor</p>
            <p className="font-bold text-lg">{formatCurrency(payment.amount)}</p>
          </div>
        </div>

        {/* Informações de prazo para escrow */}
        {payment.status === 'in_escrow' && payment.escrow_release_date && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800">
              <Package className="h-4 w-4" />
              <span className="text-sm font-medium">
                Aguardando confirmação de entrega
              </span>
            </div>
            <p className="text-xs text-yellow-700 mt-1">
              Liberação automática em {getDaysUntilRelease(payment.escrow_release_date)} dias
            </p>
          </div>
        )}

        {/* Ações baseadas no status e papel do usuário */}
        <div className="flex gap-2 pt-2">
          {payment.status === 'pending' && (
            <>
              <Button 
                onClick={() => onPay?.(payment.id)}
                className="flex-1"
                size="sm"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Pagar Online
              </Button>
              <Button 
                onClick={() => setShowOfflineModal(true)}
                variant="outline"
                className="flex-1"
                size="sm"
              >
                <Receipt className="h-4 w-4 mr-2" />
                Pagar Offline
              </Button>
            </>
          )}

          {payment.status === 'in_escrow' && onConfirmDelivery && userRole !== 'supplier' && (
            <Button 
              onClick={() => onConfirmDelivery(payment.id)}
              variant="outline"
              className="flex-1"
              size="sm"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmar Entrega
            </Button>
          )}

          <Button 
            onClick={() => onViewDetails?.(payment)}
            variant="outline"
            size="sm"
          >
            Ver Detalhes
          </Button>
        </div>
      </CardContent>

      {/* Modal de pagamento offline */}
      <OfflinePaymentModal
        payment={payment}
        open={showOfflineModal}
        onOpenChange={setShowOfflineModal}
        onConfirm={() => {
          // Refresh would be handled by parent component
          window.location.reload();
        }}
      />
    </Card>
  );
}