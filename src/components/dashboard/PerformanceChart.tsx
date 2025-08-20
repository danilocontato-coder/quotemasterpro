import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp } from "lucide-react";

const performanceData = [
  { month: 'Jan', economia: 12500, gastos: 45000 },
  { month: 'Fev', economia: 15200, gastos: 42000 },
  { month: 'Mar', economia: 18800, gastos: 38500 },
  { month: 'Abr', economia: 22300, gastos: 35200 },
  { month: 'Mai', economia: 25900, gastos: 32800 },
  { month: 'Jun', economia: 28400, gastos: 30500 },
];

export function PerformanceChart() {
  const totalEconomia = performanceData.reduce((sum, item) => sum + item.economia, 0);
  const mediaEconomia = Math.round(totalEconomia / performanceData.length);

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Performance Mensal
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Economia gerada vs. gastos tradicionais nos últimos 6 meses
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              R$ {mediaEconomia.toLocaleString('pt-BR')}
            </div>
            <p className="text-sm text-muted-foreground">Economia média/mês</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={performanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                className="text-xs"
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                className="text-xs"
                tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `R$ ${value.toLocaleString('pt-BR')}`,
                  name === 'economia' ? 'Economia Gerada' : 'Gastos Tradicionais'
                ]}
                labelStyle={{ color: '#000' }}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar 
                dataKey="gastos" 
                fill="#ef4444" 
                radius={[4, 4, 0, 0]}
                name="gastos"
              />
              <Bar 
                dataKey="economia" 
                fill="#10b981" 
                radius={[4, 4, 0, 0]}
                name="economia"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 p-4 bg-muted/30 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">
              R$ {totalEconomia.toLocaleString('pt-BR')}
            </div>
            <p className="text-sm text-muted-foreground">Economia Total</p>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">
              {performanceData.length} meses
            </div>
            <p className="text-sm text-muted-foreground">Período Analisado</p>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-orange-600">
              32%
            </div>
            <p className="text-sm text-muted-foreground">Economia Média</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}