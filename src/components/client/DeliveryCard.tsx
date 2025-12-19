import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClientDelivery } from '@/hooks/useClientDeliveries';
import { Package, MapPin, Calendar, DollarSign, Building2, Truck, Key, CheckCircle2, Clock, Star, Copy, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { UberDeliveryTracking } from '@/components/client/delivery/UberDeliveryTracking';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import SupplierRatingModal from '@/components/ratings/SupplierRatingModal';
import { useToast } from '@/hooks/use-toast';

interface DeliveryCardProps {
  delivery: ClientDelivery;
  onConfirm: (deliveryId: string) => void;
  onResendCode?: (deliveryId: string) => void;
}

export function DeliveryCard({ delivery, onConfirm, onResendCode }: DeliveryCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deliveryMethod, setDeliveryMethod] = useState<string>('own');
  const [hasRating, setHasRating] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "✅ Código copiado!",
        description: "O código de confirmação foi copiado para a área de transferência.",
      });
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o código.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const fetchDeliveryData = async () => {
      // Buscar método de entrega
      const { data: deliveryData } = await supabase
        .from('deliveries')
        .select('delivery_method')
        .eq('id', delivery.id)
        .single();
      
      if (deliveryData?.delivery_method) {
        setDeliveryMethod(deliveryData.delivery_method);
      }

      // Verificar se já tem avaliação
      if (delivery.status === 'delivered') {
        const { data: ratingData } = await supabase
          .from('supplier_ratings')
          .select('id')
          .eq('delivery_id', delivery.id)
          .maybeSingle();
        
        setHasRating(!!ratingData);
      }
    };

    fetchDeliveryData();
  }, [delivery.id, delivery.status]);

  const getStatusConfig = () => {
    switch (delivery.status) {
      case 'pending':
        return {
          label: 'Aguardando Agendamento',
          color: 'bg-gray-100 text-gray-700',
          icon: Clock,
          iconColor: 'text-gray-600',
        };
      case 'scheduled':
        return {
          label: 'Agendada',
          color: 'bg-blue-100 text-blue-700',
          icon: Calendar,
          iconColor: 'text-blue-600',
        };
      case 'in_transit':
        return {
          label: 'Em Trânsito',
          color: 'bg-orange-100 text-orange-700',
          icon: Truck,
          iconColor: 'text-orange-600',
        };
      case 'delivered':
        return {
          label: 'Entregue e Confirmada',
          color: 'bg-green-100 text-green-700',
          icon: CheckCircle2,
          iconColor: 'text-green-600',
        };
      default:
        return {
          label: delivery.status,
          color: 'bg-gray-100 text-gray-700',
          icon: Package,
          iconColor: 'text-gray-600',
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return '-';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${statusConfig.color.split(' ')[0]}`}>
                <StatusIcon className={`h-5 w-5 ${statusConfig.iconColor}`} />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Entrega #{delivery.local_code || delivery.id.substring(0, 8)}</h3>
                <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t" />

          {/* Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{delivery.quote_local_code}</span>
              <span className="text-muted-foreground">-</span>
              <span className="text-muted-foreground">{delivery.quote_title}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{delivery.supplier_name}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{formatCurrency(delivery.payment_amount)}</span>
            </div>

            {delivery.scheduled_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Agendada: {formatDate(delivery.scheduled_date)}
                </span>
              </div>
            )}

            {delivery.actual_delivery_date && delivery.status === 'delivered' && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-muted-foreground">
                  Confirmada: {formatDate(delivery.actual_delivery_date)}
                </span>
              </div>
            )}

            {delivery.delivery_address && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1">
                  <span className="font-medium text-foreground">Endereço de Entrega:</span>
                  <p className="text-muted-foreground mt-0.5">{delivery.delivery_address}</p>
                </div>
              </div>
            )}

            {/* Código de Confirmação - Cliente visualiza para informar ao entregador */}
            {delivery.confirmation_code && (delivery.status === 'scheduled' || delivery.status === 'in_transit') && (
              <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-300 dark:border-amber-800 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <h4 className="font-semibold text-sm text-amber-900 dark:text-amber-100">
                    Seu Código de Confirmação
                  </h4>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center justify-center gap-2 p-3 bg-white dark:bg-background rounded-lg border-2 border-amber-400 dark:border-amber-600">
                    <span className="text-3xl font-bold tracking-[0.3em] font-mono text-amber-700 dark:text-amber-300">
                      {delivery.confirmation_code}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(delivery.confirmation_code!)}
                    className="shrink-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>

                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                    📢 Ao receber sua entrega, informe este código ao entregador
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    O fornecedor usará este código para confirmar a entrega e liberar o pagamento.
                  </p>
                </div>

                {onResendCode && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onResendCode(delivery.id)}
                    className="w-full text-xs"
                  >
                    <Mail className="h-3 w-3 mr-2" />
                    Reenviar por Email/WhatsApp
                  </Button>
                )}
              </div>
            )}

            {delivery.status === 'delivered' && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Pagamento liberado automaticamente</span>
                </p>
              </div>
            )}

            {/* Rastreamento Uber */}
            {deliveryMethod === 'uber' && (
              <div className="mt-4">
                <UberDeliveryTracking deliveryId={delivery.id} />
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t" />

          {/* Actions - Cliente não confirma mais, apenas visualiza */}
          <div className="flex gap-2 flex-wrap">
            {/* Botão de copiar código removido - cliente não precisa mais confirmar */}
            
            {delivery.status === 'delivered' && !hasRating && (
              <Button 
                onClick={() => setShowRatingModal(true)}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700"
              >
                <Star className="h-4 w-4 mr-2" />
                Avaliar Fornecedor
              </Button>
            )}
            
            <Button 
              variant="outline"
              onClick={() => navigate(`/client/payments#${delivery.payment_id}`)}
              className={delivery.status === 'delivered' && !hasRating ? '' : 'flex-1'}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Ver Pagamento
            </Button>
          </div>
        </div>
      </CardContent>
      
      {/* Modal de Avaliação */}
      {showRatingModal && (
        <SupplierRatingModal
          open={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          supplierId={delivery.supplier_id}
          supplierName={delivery.supplier_name}
          quoteId={delivery.quote_id}
          deliveryId={delivery.id}
          onRatingSubmitted={() => {
            setShowRatingModal(false);
            setHasRating(true);
          }}
        />
      )}
    </Card>
  );
}
