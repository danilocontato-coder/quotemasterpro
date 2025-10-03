import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Activity } from 'lucide-react';

interface ActivityHeatmapProps {
  data: Array<{
    hour: string;
    activities: number;
  }>;
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ data }) => {
  const getBarColor = (value: number) => {
    if (value > 80) return '#003366'; // Muito alto - azul escuro
    if (value > 60) return '#0066CC'; // Alto - azul médio
    if (value > 40) return '#3399FF'; // Médio - azul claro
    if (value > 20) return '#66B2FF'; // Baixo - azul muito claro
    return '#E5E7EB'; // Muito baixo - cinza
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Atividade por Horário
        </CardTitle>
        <CardDescription>Distribuição de atividades nas últimas 24 horas</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis 
              dataKey="hour" 
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis 
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickLine={{ stroke: '#e5e7eb' }}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '8px'
              }}
              formatter={(value: number) => [`${value} atividades`, 'Total']}
            />
            <Bar 
              dataKey="activities" 
              radius={[4, 4, 0, 0]}
              fill="#003366"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.activities)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
