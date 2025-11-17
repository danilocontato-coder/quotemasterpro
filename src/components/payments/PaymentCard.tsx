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
  Lock,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { differenceInDays, parseISO } from "date-fns";

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
  const [isRegenerating, setIsRegenerating] = useState(false);
  const statusInfo = getStatusInfo(payment.status);
  const StatusIcon = statusInfo.icon;

  // Verificar se o boleto está expirado
  const isPaymentExpired = () => {
    if (!payment.asaas_due_date) return false;
    try {
      const dueDate = parseISO(payment.asaas_due_date);
      const today = new Date();
      return differenceInDays(today, dueDate) > 0;
    } catch {
      return false;
    }
  };

  const expired = isPaymentExpired();

  // Handler para criar pagamento Asaas
  const handleAsaasPayment = async () => {
    // Validar wallet antes de criar pagamento
    if (!payment.supplier_id) {
      toast.error('Pagamento sem fornecedor associado');
      return;
    }


    setIsCreatingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-asaas-payment', {
        body: { paymentId: payment.id }
      });

      if (error) {
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

      const link = data?.invoice_url || data?.invoiceUrl || (data?.payment_id ? `https://sandbox.asaas.com/i/${data.payment_id}` : undefined);
      if (link) {
        toast.success('Pagamento criado! Abrindo link seguro...');
        window.open(link, '_blank');
      } else {
        toast.error('Link de pagamento não disponível');
      }
    } catch (err) {
      toast.error('Erro ao criar pagamento');
    } finally {
      setIsCreatingPayment(false);
    }
  };

  // Handler para regenerar boleto expirado
  const handleRegeneratePayment = async () => {
    setIsRegenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('regenerate-asaas-payment', {
        body: { paymentId: payment.id }
      });

      if (error) {
        toast.error('Erro ao regenerar pagamento: ' + (error.message || 'Erro desconhecido'));
        return;
      }

      toast.success('Pagamento resetado! Clique em "Pagar com Segurança" para gerar novo boleto.');
      
      // Recarregar a página após 1 segundo
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      toast.error('Erro ao regenerar pagamento');
    } finally {
      setIsRegenerating(false);
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
              <h3 className="font-semibold text-lg">{payment.id?.startsWith('#') ? payment.id : `#${payment.id}`}</h3>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                <span className="font-medium">Cotação:</span> {payment.quotes?.local_code || `#${payment.quote_id}`}
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
                <div className="flex items-center gap-1">
                  <p>
                    <span className="font-medium">Fornecedor:</span> {payment.suppliers.name}
                  </p>
                  {payment.supplier_id && !payment.suppliers?.asaas_wallet_id && !payment.quotes?.suppliers?.asaas_wallet_id && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertCircle className="h-3 w-3 text-amber-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>⚠️ Fornecedor precisa configurar carteira Asaas para receber pagamentos</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
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
              {(() => {
                const resp = payment.quote_responses?.[0];
                if (resp && Array.isArray(resp.items)) {
                  const subtotal = resp.items.reduce((sum: number, item: any) => sum + (item.total || 0), 0);
                  const shipping = resp.shipping_cost || 0;
                  return formatCurrency(subtotal + shipping);
                }
                return formatCurrency(payment.amount > 0 ? payment.amount : (payment.quotes?.total || 0));
              })()}
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {payment.status === 'pending' && payment.supplier_id && payment.amount > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex-1 min-w-[120px]">
                    <Button 
                      onClick={handleAsaasPayment}
                      disabled={isCreatingPayment}
                      className="w-full"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      {isCreatingPayment ? 'Criando...' : '🔒 Pagar com Segurança'}
                    </Button>
                  </div>
                </TooltipTrigger>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Botão para acessar pagamento em processamento/aguardando */}
          {(payment.status === 'processing' || payment.status === 'waiting_confirmation') && payment.asaas_invoice_url && !expired && (
            <Button 
              onClick={() => window.open(payment.asaas_invoice_url, '_blank')}
              className="flex-1 min-w-[120px]"
              variant="outline"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              🔗 Acessar Pagamento
            </Button>
          )}

          {/* Botão para regenerar boleto expirado */}
          {(payment.status === 'processing' || payment.status === 'waiting_confirmation' || payment.status === 'failed') && expired && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex-1 min-w-[120px]">
                    <Button 
                      onClick={handleRegeneratePayment}
                      disabled={isRegenerating}
                      className="w-full"
                      variant="destructive"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
                      {isRegenerating ? 'Regenerando...' : '🔄 Gerar Novo Boleto'}
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>⚠️ Boleto expirado. Clique para gerar um novo.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {payment.status === 'pending' && (!payment.supplier_id || payment.amount <= 0) && (
            <div className="flex-1 min-w-[200px] text-sm text-amber-600 flex items-center gap-2 p-2 bg-amber-50 rounded">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>
                {!payment.supplier_id 
                  ? 'Pagamento sem fornecedor. Entre em contato com o suporte.'
                  : 'Pagamento sem valor definido. Entre em contato com o suporte.'}
              </span>
            </div>
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
              💰 Pagar Direto ao Fornecedor
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