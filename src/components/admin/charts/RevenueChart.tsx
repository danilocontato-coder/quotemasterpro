import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface RevenueChartProps {
  data: Array<{
    month: string;
    revenue: number;
    subscriptions: number;
  }>;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          Evolução de Receita
        </CardTitle>
        <CardDescription>Receita mensal e assinaturas ativas nos últimos 6 meses</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#003366" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#003366" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorSubs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="month" 
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis 
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickLine={{ stroke: '#e5e7eb' }}
              tickFormatter={formatCurrency}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '12px'
              }}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
            />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="#003366" 
              fillOpacity={1} 
              fill="url(#colorRevenue)"
              name="Receita (R$)"
              strokeWidth={2}
            />
            <Area 
              type="monotone" 
              dataKey="subscriptions" 
              stroke="#10b981" 
              fillOpacity={1} 
              fill="url(#colorSubs)"
              name="Assinaturas"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
