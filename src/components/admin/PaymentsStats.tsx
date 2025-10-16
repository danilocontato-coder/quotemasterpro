import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface PaymentStats {
  totalPending: number;
  totalOverdue: number;
  totalReceived: number;
  totalPendingValue: number;
  totalReceivedValue: number;
  totalOverdueValue: number;
}

interface PaymentsStatsProps {
  stats: PaymentStats;
}

export const PaymentsStats: React.FC<PaymentsStatsProps> = ({ stats }) => {
  const statCards = [
    {
      title: 'Pendentes',
      value: stats.totalPending,
      amount: stats.totalPendingValue,
      icon: Clock,
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
      iconColor: 'text-yellow-600',
      borderColor: 'border-yellow-200',
    },
    {
      title: 'Vencidas',
      value: stats.totalOverdue,
      amount: stats.totalOverdueValue,
      icon: AlertCircle,
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      iconColor: 'text-red-600',
      borderColor: 'border-red-200',
    },
    {
      title: 'Recebidas',
      value: stats.totalReceived,
      amount: stats.totalReceivedValue,
      icon: CheckCircle,
      bgColor: 'bg-green-50 dark:bg-green-950/20',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200',
    },
    {
      title: 'Total em Aberto',
      value: stats.totalPending + stats.totalOverdue,
      amount: stats.totalPendingValue + stats.totalOverdueValue,
      icon: DollarSign,
      bgColor: 'bg-primary/5',
      iconColor: 'text-primary',
      borderColor: 'border-primary/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card
            key={index}
            className={`${stat.bgColor} border ${stat.borderColor}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm font-semibold text-muted-foreground">
                      R$ {stat.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <div className={`${stat.iconColor}`}>
                  <Icon className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
