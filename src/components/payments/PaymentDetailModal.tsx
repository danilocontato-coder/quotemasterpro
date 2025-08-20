import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getStatusColor, getStatusText } from "@/data/mockData";
import { Clock, User, Building, CreditCard, Calendar, FileText } from "lucide-react";

interface PaymentDetailModalProps {
  payment: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentDetailModal({ payment, open, onOpenChange }: PaymentDetailModalProps) {
  if (!payment) return null;

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'payment_created':
        return <CreditCard className="h-4 w-4" />;
      case 'payment_received':
        return <CreditCard className="h-4 w-4 text-green-600" />;
      case 'funds_held':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'delivery_confirmed':
        return <FileText className="h-4 w-4 text-green-600" />;
      case 'funds_released':
        return <CreditCard className="h-4 w-4 text-green-600" />;
      case 'dispute_opened':
        return <FileText className="h-4 w-4 text-red-600" />;
      case 'payment_cancelled':
        return <CreditCard className="h-4 w-4 text-gray-600" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTransactionTypeText = (type: string) => {
    const types = {
      payment_created: 'Pagamento Criado',
      payment_received: 'Pagamento Recebido',
      funds_held: 'Valores em Garantia',
      delivery_confirmed: 'Entrega Confirmada',
      funds_released: 'Valores Liberados',
      dispute_opened: 'Disputa Aberta',
      payment_cancelled: 'Pagamento Cancelado',
    };
    return types[type as keyof typeof types] || type;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalhes do Pagamento</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(payment.status)}`}>
              {getStatusText(payment.status)}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Informações do Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">ID do Pagamento</p>
                    <p className="font-mono font-medium">{payment.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cotação</p>
                    <p className="font-medium">{payment.quoteName}</p>
                    <p className="text-sm text-muted-foreground font-mono">{payment.quoteId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(payment.amount)}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={getStatusColor(payment.status)}>
                      {getStatusText(payment.status)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Criado em</p>
                    <p className="font-medium">{formatDate(payment.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Atualizado em</p>
                    <p className="font-medium">{formatDate(payment.updatedAt)}</p>
                  </div>
                </div>
              </div>

              {/* Escrow Info */}
              {(payment.status === 'in_escrow' || payment.status === 'waiting_confirmation') && (
                <>
                  <Separator />
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-900">Sistema de Garantia</span>
                    </div>
                    <p className="text-sm text-blue-800 mb-2">
                      Os valores estão retidos em segurança até a confirmação da entrega.
                    </p>
                    <div className="text-sm">
                      <span className="text-blue-700">Liberação automática em: </span>
                      <span className="font-medium text-blue-900">
                        {formatDate(payment.escrowReleaseDate)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Parties Involved */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <p className="font-medium">{payment.clientName}</p>
                  <p className="text-sm text-muted-foreground">ID: {payment.clientId}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Fornecedor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <p className="font-medium">{payment.supplierName}</p>
                  <p className="text-sm text-muted-foreground">ID: {payment.supplierId}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stripe Information */}
          {(payment.stripeSessionId || payment.stripePaymentIntentId) && (
            <Card>
              <CardHeader>
                <CardTitle>Informações do Stripe</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {payment.stripeSessionId && (
                  <div>
                    <p className="text-sm text-muted-foreground">Session ID</p>
                    <p className="font-mono text-sm">{payment.stripeSessionId}</p>
                  </div>
                )}
                {payment.stripePaymentIntentId && (
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Intent ID</p>
                    <p className="font-mono text-sm">{payment.stripePaymentIntentId}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Transaction History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Histórico de Transações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payment.transactions.map((transaction: any, index: number) => (
                  <div key={transaction.id} className="flex items-start gap-3">
                    <div className="mt-1">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">
                          {getTransactionTypeText(transaction.type)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(transaction.createdAt)}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {transaction.description}
                      </p>
                      {transaction.amount && (
                        <p className="text-sm font-medium text-primary mt-1">
                          {formatCurrency(transaction.amount)}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Por: {transaction.userName}
                      </p>
                      {transaction.metadata && (
                        <div className="mt-2 p-2 bg-muted rounded text-xs">
                          <pre>{JSON.stringify(transaction.metadata, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                    {index < payment.transactions.length - 1 && (
                      <div className="absolute left-6 mt-8 w-px h-8 bg-border" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}