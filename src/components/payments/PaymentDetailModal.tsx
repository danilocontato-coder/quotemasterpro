import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { getStatusColor, getStatusText } from "@/data/mockData";
import { Clock, User, Building, CreditCard, Calendar, FileText, CheckCircle, AlertTriangle, Flag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PaymentDetailModalProps {
  payment: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDelivery?: (paymentId: string, notes?: string) => void;
  onReportDelay?: (paymentId: string, reason: string) => void;
  onOpenDispute?: (paymentId: string, reason: string) => void;
}

export function PaymentDetailModal({ 
  payment, 
  open, 
  onOpenChange, 
  onConfirmDelivery,
  onReportDelay,
  onOpenDispute 
}: PaymentDetailModalProps) {
  const [showConfirmDelivery, setShowConfirmDelivery] = useState(false);
  const [showReportDelay, setShowReportDelay] = useState(false);
  const [showOpenDispute, setShowOpenDispute] = useState(false);
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  if (!payment) return null;

  const handleConfirmDelivery = async () => {
    if (!onConfirmDelivery) return;
    setIsLoading(true);
    try {
      await onConfirmDelivery(payment.id, notes);
      setShowConfirmDelivery(false);
      setNotes("");
      toast({
        title: "Entrega confirmada",
        description: "O pagamento foi liberado para o fornecedor.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReportDelay = async () => {
    if (!onReportDelay || !reason.trim()) return;
    setIsLoading(true);
    try {
      await onReportDelay(payment.id, reason);
      setShowReportDelay(false);
      setReason("");
      toast({
        title: "Atraso reportado",
        description: "O fornecedor foi notificado sobre o atraso.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDispute = async () => {
    if (!onOpenDispute || !reason.trim()) return;
    setIsLoading(true);
    try {
      await onOpenDispute(payment.id, reason);
      setShowOpenDispute(false);
      setReason("");
      toast({
        title: "Disputa aberta",
        description: "A disputa foi registrada e será analisada.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
      case 'delay_reported':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
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
      delay_reported: 'Atraso Reportado',
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
                    <p className="font-medium">
                      {payment.quotes?.local_code || payment.quotes?.title || 'Cotação não informada'}
                    </p>
                    <p className="text-sm text-muted-foreground font-mono">{payment.quote_id}</p>
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
                    <p className="font-medium">{formatDate(payment.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Atualizado em</p>
                    <p className="font-medium">{formatDate(payment.updated_at)}</p>
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
                        {payment.escrow_release_date ? formatDate(payment.escrow_release_date) : 'Data não definida'}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Order Summary */}
          {payment.quote_responses?.[0] && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Resumo do Pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Items List */}
                {payment.quote_responses[0].items?.length > 0 ? (
                  <>
                    <div className="space-y-3">
                      {payment.quote_responses[0].items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-start p-3 bg-muted/50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">{item.product_name}</p>
                            {item.brand && (
                              <p className="text-sm text-muted-foreground">Marca: {item.brand}</p>
                            )}
                            {item.specifications && (
                              <p className="text-sm text-muted-foreground">{item.specifications}</p>
                            )}
                            <p className="text-sm text-muted-foreground mt-1">
                              Quantidade: {item.quantity} × {formatCurrency(item.unit_price)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(item.total)}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    {/* Price Breakdown */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal dos Itens:</span>
                        <span className="font-medium">
                          {formatCurrency(
                            payment.quote_responses[0].items.reduce((sum: number, item: any) => sum + item.total, 0)
                          )}
                        </span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Frete:</span>
                        <span className="font-medium">
                          {formatCurrency(payment.quote_responses[0].shipping_cost || 0)}
                        </span>
                      </div>

                      <Separator />

                      <div className="flex justify-between">
                        <span className="font-semibold">Total:</span>
                        <span className="font-bold text-xl text-primary">
                          {formatCurrency(payment.amount)}
                        </span>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-muted-foreground">Prazo de Entrega</p>
                        <p className="font-medium text-sm">
                          {payment.quote_responses[0].delivery_time} dias
                        </p>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                        <p className="text-xs text-muted-foreground">Garantia</p>
                        <p className="font-medium text-sm">
                          {payment.quote_responses[0].warranty_months} meses
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhum item encontrado nesta proposta</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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
                  <p className="font-medium">{payment.clients?.name || payment.quotes?.client_name || 'Cliente não informado'}</p>
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
                  <p className="font-medium">
                    {payment.suppliers?.name || 
                     payment.quotes?.suppliers?.name || 
                     'Fornecedor não informado'}
                  </p>
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

          {/* Actions */}
          {(payment.status === 'in_escrow' || payment.status === 'waiting_confirmation') && (
            <Card>
              <CardHeader>
                <CardTitle>Ações</CardTitle>
              </CardHeader>
              <CardContent>
                {!showConfirmDelivery && !showReportDelay && !showOpenDispute && (
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      onClick={() => setShowConfirmDelivery(true)}
                      className="flex items-center gap-2"
                      size="sm"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Confirmar Entrega
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setShowReportDelay(true)}
                      className="flex items-center gap-2"
                      size="sm"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Reportar Atraso
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={() => setShowOpenDispute(true)}
                      className="flex items-center gap-2"
                      size="sm"
                    >
                      <Flag className="h-4 w-4" />
                      Abrir Disputa
                    </Button>
                  </div>
                )}

                {/* Confirm Delivery Form */}
                {showConfirmDelivery && (
                  <div className="space-y-4 p-4 border rounded-lg bg-green-50">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <h4 className="font-medium text-green-900">Confirmar Entrega</h4>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="delivery-notes">Observações (opcional)</Label>
                      <Textarea
                        id="delivery-notes"
                        placeholder="Adicione observações sobre a entrega..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleConfirmDelivery}
                        disabled={isLoading}
                        size="sm"
                      >
                        {isLoading ? "Confirmando..." : "Confirmar"}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowConfirmDelivery(false);
                          setNotes("");
                        }}
                        disabled={isLoading}
                        size="sm"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Report Delay Form */}
                {showReportDelay && (
                  <div className="space-y-4 p-4 border rounded-lg bg-yellow-50">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <h4 className="font-medium text-yellow-900">Reportar Atraso</h4>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="delay-reason">Motivo do atraso *</Label>
                      <Textarea
                        id="delay-reason"
                        placeholder="Descreva o motivo do atraso..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleReportDelay}
                        disabled={isLoading || !reason.trim()}
                        size="sm"
                        variant="destructive"
                      >
                        {isLoading ? "Reportando..." : "Reportar Atraso"}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowReportDelay(false);
                          setReason("");
                        }}
                        disabled={isLoading}
                        size="sm"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Open Dispute Form */}
                {showOpenDispute && (
                  <div className="space-y-4 p-4 border rounded-lg bg-red-50">
                    <div className="flex items-center gap-2">
                      <Flag className="h-5 w-5 text-red-600" />
                      <h4 className="font-medium text-red-900">Abrir Disputa</h4>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dispute-reason">Motivo da disputa *</Label>
                      <Textarea
                        id="dispute-reason"
                        placeholder="Descreva detalhadamente o motivo da disputa..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={4}
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleOpenDispute}
                        disabled={isLoading || !reason.trim()}
                        size="sm"
                        variant="destructive"
                      >
                        {isLoading ? "Abrindo..." : "Abrir Disputa"}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowOpenDispute(false);
                          setReason("");
                        }}
                        disabled={isLoading}
                        size="sm"
                      >
                        Cancelar
                      </Button>
                    </div>
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
                {/* Transações básicas baseadas no status */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">Pagamento Criado</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(payment.created_at)}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Pagamento foi registrado no sistema
                      </p>
                      <p className="text-sm font-medium text-primary mt-1">
                        {formatCurrency(payment.amount)}
                      </p>
                    </div>
                  </div>

                  {payment.status === 'processing' && (
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <Clock className="h-4 w-4 text-yellow-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">Processando Pagamento</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(payment.updated_at)}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Pagamento está sendo processado pelo Stripe
                        </p>
                      </div>
                    </div>
                  )}

                  {payment.status === 'in_escrow' && (
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">Fundos em Garantia</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(payment.updated_at)}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Valores retidos em segurança até confirmação da entrega
                        </p>
                      </div>
                    </div>
                  )}

                  {payment.status === 'completed' && (
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">Pagamento Concluído</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(payment.updated_at)}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Entrega confirmada e fundos liberados para o fornecedor
                        </p>
                      </div>
                    </div>
                  )}

                  {payment.status === 'failed' && (
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">Pagamento Falhou</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(payment.updated_at)}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Falha no processamento do pagamento
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}