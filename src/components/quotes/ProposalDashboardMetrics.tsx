import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingDown, Package, Clock, DollarSign } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'green' | 'blue' | 'yellow' | 'gray';
}

interface ProposalDashboardMetricsProps {
  totalProposals: number;
  bestPrice: number;
  averageDeliveryTime: number;
  potentialSavings: number;
}

function MetricCard({ title, value, subtitle, icon, color }: MetricCardProps) {
  const colorClasses = {
    green: 'bg-green-50 text-green-600 border-green-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    gray: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <Card className={`${colorClasses[color]} border-2`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium opacity-80 mb-1">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs mt-1 opacity-70">{subtitle}</p>}
          </div>
          <div className="ml-3">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProposalDashboardMetrics({
  totalProposals,
  bestPrice,
  averageDeliveryTime,
  potentialSavings,
}: ProposalDashboardMetricsProps) {
  const getProposalColor = (): 'green' | 'yellow' | 'gray' => {
    if (totalProposals >= 2) return 'green';
    if (totalProposals === 1) return 'yellow';
    return 'gray';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Propostas Recebidas"
        value={totalProposals}
        subtitle={totalProposals >= 2 ? 'Pronto para comparar' : totalProposals === 1 ? 'Aguarde mais propostas' : 'Nenhuma proposta'}
        icon={<Package className="h-8 w-8" />}
        color={getProposalColor()}
      />

      <MetricCard
        title="Melhor Preço"
        value={`R$ ${bestPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
        subtitle="Menor valor total"
        icon={<DollarSign className="h-8 w-8" />}
        color="green"
      />

      <MetricCard
        title="Prazo Médio"
        value={`${Math.round(averageDeliveryTime)} dias`}
        subtitle="Tempo de entrega"
        icon={<Clock className="h-8 w-8" />}
        color="blue"
      />

      <MetricCard
        title="Economia Potencial"
        value={`R$ ${potentialSavings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
        subtitle={potentialSavings > 0 ? 'Economia vs. maior valor' : 'Todas propostas similares'}
        icon={<TrendingDown className="h-8 w-8" />}
        color={potentialSavings > 0 ? 'green' : 'gray'}
      />
    </div>
  );
}
