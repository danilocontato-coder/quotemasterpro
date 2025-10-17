import { Card, CardContent } from '@/components/ui/card';
import { Package, Truck, CheckCircle2, Clock } from 'lucide-react';
import { ClientDelivery } from '@/hooks/useClientDeliveries';

interface DeliveryMetricsProps {
  deliveries: ClientDelivery[];
}

export function DeliveryMetrics({ deliveries }: DeliveryMetricsProps) {
  const pending = deliveries.filter(d => d.status === 'pending' || d.status === 'scheduled').length;
  const inTransit = deliveries.filter(d => d.status === 'in_transit').length;
  const delivered = deliveries.filter(d => d.status === 'delivered').length;
  
  const thisMonth = deliveries.filter(d => {
    const deliveryDate = new Date(d.actual_delivery_date || d.created_at);
    const now = new Date();
    return deliveryDate.getMonth() === now.getMonth() && 
           deliveryDate.getFullYear() === now.getFullYear() &&
           d.status === 'delivered';
  }).length;

  const metrics = [
    {
      title: "Aguardando Entrega",
      value: pending,
      icon: Clock,
      description: "Agendadas ou pendentes",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Em Trânsito",
      value: inTransit,
      icon: Truck,
      description: "Saíram para entrega",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Entregues (Mês)",
      value: thisMonth,
      icon: CheckCircle2,
      description: "Concluídas este mês",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Total Concluídas",
      value: delivered,
      icon: Package,
      description: "Histórico completo",
      color: "text-primary",
      bgColor: "bg-primary/5",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card key={metric.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {metric.title}
                  </p>
                  <p className="text-3xl font-bold">{metric.value}</p>
                  <p className="text-xs text-muted-foreground">
                    {metric.description}
                  </p>
                </div>
                <div className={`${metric.bgColor} p-3 rounded-lg`}>
                  <Icon className={`h-6 w-6 ${metric.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
