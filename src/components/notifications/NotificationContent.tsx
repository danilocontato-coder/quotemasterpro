import { CheckCircle, AlertTriangle, Info, FileText, Truck, CreditCard, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotificationEnrichment } from "@/hooks/useNotificationEnrichment";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Json } from '@/integrations/supabase/types';

interface NotificationContentProps {
  notification: {
    id: string;
    title: string;
    message: string;
    type: string;
    created_at: string;
    read: boolean;
    metadata?: Json;
  };
  onNavigate?: (url: string) => void;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'error':
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case 'delivery':
    case 'delivery_code_generated':
      return <Truck className="h-4 w-4 text-orange-500" />;
    case 'payment':
      return <CreditCard className="h-4 w-4 text-green-600" />;
    case 'quote':
      return <FileText className="h-4 w-4 text-blue-500" />;
    case 'rating_prompt':
    case 'rating_received':
      return <Star className="h-4 w-4 text-yellow-500" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
};

export function NotificationContent({ notification, onNavigate }: NotificationContentProps) {
  const metadata = notification.metadata as Record<string, any> | undefined;
  const { enrichedData, isLoading } = useNotificationEnrichment(metadata);

  const formatCurrency = (value?: number) => {
    if (!value) return '';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const renderEnrichedContent = () => {
    
    switch (notification.type) {
      case 'delivery':
      case 'delivery_code_generated':
        return (
          <div className="space-y-1 mt-1">
            {enrichedData.quote_code && (
              <p className="text-sm">
                Cotação: <strong className="text-primary">#{enrichedData.quote_code}</strong>
              </p>
            )}
            {enrichedData.supplier_name && (
              <p className="text-sm">
                Fornecedor: <strong>{enrichedData.supplier_name}</strong>
              </p>
            )}
            {metadata?.scheduled_date && (
              <p className="text-sm">
                Data: <strong>{formatDate(metadata.scheduled_date)}</strong>
              </p>
            )}
            {(enrichedData.confirmation_code || metadata?.confirmation_code) && (
              <div className="mt-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">Código de confirmação:</p>
                <p className="text-2xl font-mono font-bold text-primary tracking-wider">
                  {enrichedData.confirmation_code || metadata?.confirmation_code}
                </p>
                {enrichedData.code_expires_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Válido até: {formatDate(enrichedData.code_expires_at)}
                  </p>
                )}
              </div>
            )}
          </div>
        );

      case 'payment':
        return (
          <div className="space-y-1 mt-1">
            {(enrichedData.payment_amount || metadata?.amount) && (
              <p className="text-sm">
                Valor: <strong className="text-green-600">
                  {formatCurrency(enrichedData.payment_amount || metadata?.amount)}
                </strong>
              </p>
            )}
            {enrichedData.quote_code && (
              <p className="text-sm">
                Cotação: <strong className="text-primary">#{enrichedData.quote_code}</strong>
              </p>
            )}
            {metadata?.payment_id && (
              <p className="text-sm">
                Pagamento: <strong>{metadata.payment_id}</strong>
              </p>
            )}
            {metadata?.status && (
              <p className="text-xs text-muted-foreground mt-1">
                Status: {metadata.status === 'in_escrow' ? 'Em custódia' : metadata.status}
              </p>
            )}
          </div>
        );

      case 'quote':
        return (
          <div className="space-y-1 mt-1">
            {enrichedData.quote_code && (
              <p className="text-sm">
                Código: <strong className="text-primary">#{enrichedData.quote_code}</strong>
              </p>
            )}
            {enrichedData.quote_title && (
              <p className="text-sm text-muted-foreground">
                {enrichedData.quote_title}
              </p>
            )}
            {enrichedData.supplier_name && (
              <p className="text-sm">
                Fornecedor: <strong>{enrichedData.supplier_name}</strong>
              </p>
            )}
          </div>
        );

      case 'rating_prompt':
        return (
          <div className="space-y-2 mt-1">
            {enrichedData.supplier_name && (
              <p className="text-sm">
                Fornecedor: <strong>{enrichedData.supplier_name}</strong>
              </p>
            )}
            {enrichedData.quote_code && (
              <p className="text-sm">
                Cotação: <strong className="text-primary">#{enrichedData.quote_code}</strong>
              </p>
            )}
            {onNavigate && metadata?.action_url && (
              <Button
                size="sm"
                className="w-full mt-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate(metadata.action_url);
                }}
              >
                <Star className="h-4 w-4 mr-2" />
                Avaliar Agora
              </Button>
            )}
          </div>
        );

      case 'rating_received':
        return (
          <div className="space-y-1 mt-1">
            {enrichedData.client_name && (
              <p className="text-sm">
                Cliente: <strong>{enrichedData.client_name}</strong>
              </p>
            )}
            {metadata?.rating && (
              <p className="text-sm">
                Nota: <strong className="text-yellow-600">{metadata.rating}/5 ⭐</strong>
              </p>
            )}
            {enrichedData.quote_code && (
              <p className="text-sm">
                Cotação: <strong className="text-primary">#{enrichedData.quote_code}</strong>
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex gap-3 w-full">
      {getNotificationIcon(notification.type)}
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm">{notification.title}</p>
          {!notification.read && (
            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 ml-2" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {notification.message}
        </p>
        
        {!isLoading && renderEnrichedContent()}
        
        <p className="text-xs text-muted-foreground">
          {formatDate(notification.created_at)}
        </p>
      </div>
    </div>
  );
}
