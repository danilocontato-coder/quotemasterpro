import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Building2 } from 'lucide-react';

interface TopClientsChartProps {
  data: Array<{
    name: string;
    quotes: number;
    revenue: number;
  }>;
}

export const TopClientsChart: React.FC<TopClientsChartProps> = ({ data }) => {
  const COLORS = ['#003366', '#0066CC', '#3399FF', '#66B2FF', '#99CCFF'];

  const formatCurrency = (value: number) => {
    return `R$ ${(value / 1000).toFixed(0)}K`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Top 5 Clientes
        </CardTitle>
        <CardDescription>Por volume de cotações e receita gerada</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              type="number" 
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickFormatter={formatCurrency}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={120}
              tick={{ fill: '#6b7280', fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '12px'
              }}
              formatter={(value: number, name: string) => {
                if (name === 'revenue') return [formatCurrency(value), 'Receita'];
                return [value, 'Cotações'];
              }}
            />
            <Bar dataKey="revenue" radius={[0, 8, 8, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
