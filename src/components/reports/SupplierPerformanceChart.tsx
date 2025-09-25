import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { Star, Award, TrendingUp } from 'lucide-react';

interface SupplierMetrics {
  id: string;
  name: string;
  totalQuotes: number;
  totalAmount: number;
  averageRating: number;
  deliveryTime: number;
  responseRate: number;
  savings: number;
  categories: string[];
}

interface SupplierPerformanceChartProps {
  suppliers: SupplierMetrics[];
  timeRange: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const SupplierPerformanceChart: React.FC<SupplierPerformanceChartProps> = ({ 
  suppliers,
  timeRange 
}) => {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);

  // Dados para gráfico de valores por fornecedor
  const valueData = suppliers
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 10)
    .map(supplier => ({
      name: supplier.name.length > 15 ? supplier.name.substring(0, 15) + '...' : supplier.name,
      fullName: supplier.name,
      value: supplier.totalAmount,
      quotes: supplier.totalQuotes
    }));

  // Dados para gráfico de avaliações
  const ratingData = suppliers
    .filter(s => s.averageRating > 0)
    .sort((a, b) => b.averageRating - a.averageRating)
    .slice(0, 8)
    .map(supplier => ({
      name: supplier.name.length > 12 ? supplier.name.substring(0, 12) + '...' : supplier.name,
      fullName: supplier.name,
      rating: supplier.averageRating,
      quotes: supplier.totalQuotes
    }));

  // Dados para gráfico de economia
  const savingsData = suppliers
    .filter(s => s.savings > 0)
    .sort((a, b) => b.savings - a.savings)
    .slice(0, 6)
    .map((supplier, index) => ({
      name: supplier.name.length > 15 ? supplier.name.substring(0, 15) + '...' : supplier.name,
      fullName: supplier.name,
      savings: supplier.savings,
      fill: COLORS[index % COLORS.length]
    }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{data.fullName}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey === 'value' && `Valor: ${formatCurrency(entry.value)}`}
              {entry.dataKey === 'rating' && `Avaliação: ${entry.value.toFixed(1)} ⭐`}
              {entry.dataKey === 'savings' && `Economia: ${formatCurrency(entry.value)}`}
            </p>
          ))}
          <p className="text-xs text-gray-500">Cotações: {data.quotes}</p>
        </div>
      );
    }
    return null;
  };

  const topSupplier = suppliers.sort((a, b) => b.totalAmount - a.totalAmount)[0];
  const bestRatedSupplier = suppliers.sort((a, b) => b.averageRating - a.averageRating)[0];
  const bestSavingsSupplier = suppliers.sort((a, b) => b.savings - a.savings)[0];

  return (
    <div className="space-y-6">
      {/* Cards de Destaque */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Maior Volume</p>
                <p className="text-lg font-bold">{topSupplier?.name}</p>
                <p className="text-sm text-green-600">{formatCurrency(topSupplier?.totalAmount || 0)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Melhor Avaliado</p>
                <p className="text-lg font-bold">{bestRatedSupplier?.name}</p>
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-500 mr-1" />
                  <p className="text-sm">{bestRatedSupplier?.averageRating.toFixed(1)}</p>
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
                <p className="text-sm font-medium text-muted-foreground">Maior Economia</p>
                <p className="text-lg font-bold">{bestSavingsSupplier?.name}</p>
                <p className="text-sm text-green-600">{formatCurrency(bestSavingsSupplier?.savings || 0)}</p>
              </div>
              <Star className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Valores por Fornecedor */}
      <Card>
        <CardHeader>
          <CardTitle>Volume de Compras por Fornecedor - {timeRange}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={valueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de Avaliações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Avaliações dos Fornecedores</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={ratingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 5]} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="rating" stroke="#22c55e" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Economia */}
        <Card>
          <CardHeader>
            <CardTitle>Economia por Fornecedor</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={savingsData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="savings"
                >
                  {savingsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Performance Detalhada */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Detalhada dos Fornecedores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Fornecedor</th>
                  <th className="text-right p-2">Cotações</th>
                  <th className="text-right p-2">Volume Total</th>
                  <th className="text-right p-2">Avaliação</th>
                  <th className="text-right p-2">Taxa Resposta</th>
                  <th className="text-right p-2">Economia</th>
                  <th className="text-left p-2">Categorias</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.slice(0, 15).map((supplier) => (
                  <tr key={supplier.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{supplier.name}</td>
                    <td className="p-2 text-right">{supplier.totalQuotes}</td>
                    <td className="p-2 text-right">{formatCurrency(supplier.totalAmount)}</td>
                    <td className="p-2 text-right">
                      <div className="flex items-center justify-end">
                        <Star className="h-3 w-3 text-yellow-500 mr-1" />
                        {supplier.averageRating.toFixed(1)}
                      </div>
                    </td>
                    <td className="p-2 text-right">{supplier.responseRate.toFixed(0)}%</td>
                    <td className="p-2 text-right text-green-600">
                      {formatCurrency(supplier.savings)}
                    </td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {supplier.categories.slice(0, 2).map((category) => (
                          <Badge key={category} variant="secondary" className="text-xs">
                            {category}
                          </Badge>
                        ))}
                        {supplier.categories.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{supplier.categories.length - 2}
                          </Badge>
                        )}
                      </div>
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