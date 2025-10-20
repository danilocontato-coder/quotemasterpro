import React, { useMemo } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend } from 'recharts';
import { QuoteProposal } from './QuoteDetailModal';

interface ProposalRadarChartProps {
  proposal: QuoteProposal;
  allProposals: QuoteProposal[];
}

export const ProposalRadarChart: React.FC<ProposalRadarChartProps> = ({
  proposal,
  allProposals
}) => {
  const chartData = useMemo(() => {
    // Calculate market averages
    const avgPrice = allProposals.reduce((sum, p) => sum + p.totalPrice, 0) / allProposals.length;
    const avgDeliveryTime = allProposals.reduce((sum, p) => sum + p.deliveryTime, 0) / allProposals.length;
    const avgWarranty = allProposals.reduce((sum, p) => sum + p.warrantyMonths, 0) / allProposals.length;
    const avgReputation = allProposals.reduce((sum, p) => sum + p.reputation, 0) / allProposals.length;

    // Find min and max for normalization
    const prices = allProposals.map(p => p.totalPrice);
    const deliveryTimes = allProposals.map(p => p.deliveryTime);
    const warranties = allProposals.map(p => p.warrantyMonths);
    const reputations = allProposals.map(p => p.reputation);

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const minDelivery = Math.min(...deliveryTimes);
    const maxDelivery = Math.max(...deliveryTimes);
    const minWarranty = Math.min(...warranties);
    const maxWarranty = Math.max(...warranties);
    const minReputation = Math.min(...reputations);
    const maxReputation = Math.max(...reputations);

    // Normalize function (inverse for price and delivery - lower is better)
    const normalizeInverse = (value: number, min: number, max: number) => {
      if (max === min) return 50;
      return 100 - ((value - min) / (max - min)) * 100;
    };

    const normalize = (value: number, min: number, max: number) => {
      if (max === min) return 50;
      return ((value - min) / (max - min)) * 100;
    };

    return [
      {
        metric: 'Preço',
        proposta: normalizeInverse(proposal.totalPrice, minPrice, maxPrice),
        mercado: normalizeInverse(avgPrice, minPrice, maxPrice),
      },
      {
        metric: 'Prazo',
        proposta: normalizeInverse(proposal.deliveryTime, minDelivery, maxDelivery),
        mercado: normalizeInverse(avgDeliveryTime, minDelivery, maxDelivery),
      },
      {
        metric: 'Garantia',
        proposta: normalize(proposal.warrantyMonths, minWarranty, maxWarranty),
        mercado: normalize(avgWarranty, minWarranty, maxWarranty),
      },
      {
        metric: 'Reputação',
        proposta: normalize(proposal.reputation, minReputation, maxReputation),
        mercado: normalize(avgReputation, minReputation, maxReputation),
      },
    ];
  }, [proposal, allProposals]);

  return (
    <div className="w-full" style={{ height: '150px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={chartData}>
          <PolarGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.3} />
          <PolarAngleAxis 
            dataKey="metric" 
            tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 100]} 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
            tickCount={3}
          />
          <Radar
            name="Esta Proposta"
            dataKey="proposta"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.3}
            strokeWidth={2}
          />
          <Radar
            name="Média do Mercado"
            dataKey="mercado"
            stroke="hsl(var(--muted-foreground))"
            fill="hsl(var(--muted-foreground))"
            fillOpacity={0.1}
            strokeWidth={1}
            strokeDasharray="5 5"
          />
          <Legend 
            iconType="circle"
            wrapperStyle={{ fontSize: '10px' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
