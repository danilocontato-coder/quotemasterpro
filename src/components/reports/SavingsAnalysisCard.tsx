import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  PiggyBank, 
  TrendingDown, 
  Target,
  Award,
  Calculator,
  Zap
} from 'lucide-react';

interface SavingsData {
  totalSavings: number;
  targetSavings: number;
  savingsGoal: number;
  bestNegotiation: {
    amount: number;
    percentage: number;
    supplier: string;
    product: string;
    originalPrice: number;
    finalPrice: number;
  };
  monthlySavings: Array<{
    month: string;
    savings: number;
    target: number;
    negotiations: number;
  }>;
  savingsByCategory: Array<{
    category: string;
    amount: number;
    percentage: number;
    opportunities: number;
  }>;
  savingsByMethod: Array<{
    method: string;
    amount: number;
    count: number;
    avgSaving: number;
  }>;
  topNegotiations: Array<{
    id: string;
    supplier: string;
    product: string;
    originalPrice: number;
    finalPrice: number;
    savings: number;
    percentage: number;
    date: string;
  }>;
}

interface SavingsAnalysisCardProps {
  data: SavingsData;
  period: string;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export const SavingsAnalysisCard: React.FC<SavingsAnalysisCardProps> = ({ 
  data, 
  period 
}) => {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const savingsPercentage = (data.totalSavings / data.savingsGoal) * 100;
  const targetPercentage = (data.targetSavings / data.savingsGoal) * 100;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey === 'savings' && `Economia: ${formatCurrency(entry.value)}`}
              {entry.dataKey === 'target' && `Meta: ${formatCurrency(entry.value)}`}
              {entry.dataKey === 'amount' && `Valor: ${formatCurrency(entry.value)}`}
              {entry.dataKey === 'negotiations' && `Negociações: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Economia Total</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(data.totalSavings)}</p>
                <div className="mt-2">
                  <Progress value={savingsPercentage} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatPercentage(savingsPercentage)} da meta anual
                  </p>
                </div>
              </div>
              <PiggyBank className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Meta {period}</p>
                <p className="text-2xl font-bold">{formatCurrency(data.targetSavings)}</p>
                <div className="mt-2">
                  <Progress value={targetPercentage} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Meta anual: {formatCurrency(data.savingsGoal)}
                  </p>
                </div>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Melhor Negociação</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(data.bestNegotiation.amount)}
                </p>
                <div className="space-y-1">
                  <Badge variant="secondary">
                    {formatPercentage(data.bestNegotiation.percentage)} desconto
                  </Badge>
                  <p className="text-xs text-muted-foreground">{data.bestNegotiation.supplier}</p>
                </div>
              </div>
              <Award className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Oportunidades</p>
                <p className="text-2xl font-bold">
                  {data.savingsByCategory.reduce((sum, cat) => sum + cat.opportunities, 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Potencial de economia adicional
                </p>
              </div>
              <Zap className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Evolução da Economia */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-green-500" />
            Evolução da Economia - {period}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.monthlySavings}>
              <defs>
                <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="target" 
                stackId="1"
                stroke="#3b82f6" 
                fillOpacity={1} 
                fill="url(#colorTarget)" 
              />
              <Area 
                type="monotone" 
                dataKey="savings" 
                stackId="2"
                stroke="#10b981" 
                fillOpacity={1} 
                fill="url(#colorSavings)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Análise por Categoria e Método */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Economia por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.savingsByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, percentage }) => `${category} ${percentage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {data.savingsByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Métodos de Economia</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.savingsByMethod}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="method" />
                <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detalhes da Melhor Negociação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            Melhor Negociação do Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Produto</p>
                <p className="text-lg font-semibold">{data.bestNegotiation.product}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fornecedor</p>
                <p className="text-lg font-semibold">{data.bestNegotiation.supplier}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-red-600">Preço Original</p>
                  <p className="text-xl font-bold text-red-700">
                    {formatCurrency(data.bestNegotiation.originalPrice)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-600">Preço Final</p>
                  <p className="text-xl font-bold text-green-700">
                    {formatCurrency(data.bestNegotiation.finalPrice)}
                  </p>
                </div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm font-medium text-green-600">Economia Obtida</p>
                <p className="text-2xl font-bold text-green-700">
                  {formatCurrency(data.bestNegotiation.amount)}
                </p>
                <Badge variant="secondary" className="mt-2">
                  {formatPercentage(data.bestNegotiation.percentage)} de desconto
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Negociações */}
      <Card>
        <CardHeader>
          <CardTitle>Top Negociações do Período</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Fornecedor</th>
                  <th className="text-left p-3">Produto</th>
                  <th className="text-right p-3">Preço Original</th>
                  <th className="text-right p-3">Preço Final</th>
                  <th className="text-right p-3">Economia</th>
                  <th className="text-right p-3">% Desconto</th>
                  <th className="text-right p-3">Data</th>
                </tr>
              </thead>
              <tbody>
                {data.topNegotiations.map((negotiation) => (
                  <tr key={negotiation.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{negotiation.supplier}</td>
                    <td className="p-3">{negotiation.product}</td>
                    <td className="p-3 text-right text-red-600">
                      {formatCurrency(negotiation.originalPrice)}
                    </td>
                    <td className="p-3 text-right text-green-600">
                      {formatCurrency(negotiation.finalPrice)}
                    </td>
                    <td className="p-3 text-right font-semibold text-green-700">
                      {formatCurrency(negotiation.savings)}
                    </td>
                    <td className="p-3 text-right">
                      <Badge variant="secondary">
                        {formatPercentage(negotiation.percentage)}
                      </Badge>
                    </td>
                    <td className="p-3 text-right text-muted-foreground">
                      {new Date(negotiation.date).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};