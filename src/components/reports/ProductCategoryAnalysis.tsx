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
  Line,
  Area,
  AreaChart
} from 'recharts';
import { 
  Package, 
  TrendingUp, 
  DollarSign,
  ShoppingCart,
  Target,
  AlertTriangle
} from 'lucide-react';

interface ProductData {
  id: string;
  name: string;
  category: string;
  totalQuantity: number;
  totalAmount: number;
  averagePrice: number;
  suppliers: number;
  lastPurchase: string;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

interface CategoryData {
  name: string;
  totalAmount: number;
  totalQuantity: number;
  products: number;
  percentage: number;
  averagePrice: number;
  topSupplier: string;
  savings: number;
}

interface ProductCategoryAnalysisProps {
  products: ProductData[];
  categories: CategoryData[];
  timeRange: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

export const ProductCategoryAnalysis: React.FC<ProductCategoryAnalysisProps> = ({
  products,
  categories,
  timeRange
}) => {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);

  // Dados para gráfico de categorias
  const categoryChartData = categories
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .map((category, index) => ({
      ...category,
      fill: COLORS[index % COLORS.length]
    }));

  // Top produtos mais comprados
  const topProducts = products
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 10)
    .map(product => ({
      name: product.name.length > 20 ? product.name.substring(0, 20) + '...' : product.name,
      fullName: product.name,
      value: product.totalAmount,
      quantity: product.totalQuantity,
      category: product.category
    }));

  // Evolução de preços (simulado)
  const priceEvolutionData = products
    .slice(0, 5)
    .map(product => {
      // Simular dados históricos de preço
      return Array.from({ length: 6 }, (_, i) => ({
        month: `Mês ${i + 1}`,
        [product.name]: product.averagePrice * (0.95 + Math.random() * 0.1),
        product: product.name
      }));
    })
    .flat()
    .reduce((acc, curr) => {
      const existing = acc.find(item => item.month === curr.month);
      if (existing) {
        Object.assign(existing, curr);
      } else {
        acc.push(curr);
      }
      return acc;
    }, [] as any[]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{data.fullName || data.name || label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey === 'value' && `Valor: ${formatCurrency(entry.value)}`}
              {entry.dataKey === 'totalAmount' && `Total: ${formatCurrency(entry.value)}`}
              {entry.dataKey === 'quantity' && `Quantidade: ${entry.value}`}
              {typeof entry.value === 'number' && entry.dataKey !== 'value' && entry.dataKey !== 'totalAmount' && entry.dataKey !== 'quantity' && 
                `${entry.dataKey}: ${formatCurrency(entry.value)}`}
            </p>
          ))}
          {data.category && <p className="text-xs text-gray-500">Categoria: {data.category}</p>}
        </div>
      );
    }
    return null;
  };

  const topCategory = categories.sort((a, b) => b.totalAmount - a.totalAmount)[0];
  const totalProducts = products.length;
  const totalCategories = categories.length;

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Produtos</p>
                <p className="text-2xl font-bold">{totalProducts}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Categorias</p>
                <p className="text-2xl font-bold">{totalCategories}</p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Categoria Principal</p>
                <p className="text-lg font-bold">{topCategory?.name}</p>
                <p className="text-sm text-blue-600">{formatCurrency(topCategory?.totalAmount || 0)}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Economia Total</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(categories.reduce((sum, cat) => sum + cat.savings, 0))}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Categorias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Gastos por Categoria - {timeRange}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} ${percentage.toFixed(1)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="totalAmount"
                >
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 10 Produtos Mais Comprados</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Evolução de Preços */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução de Preços dos Principais Produtos</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={priceEvolutionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `R$ ${value.toFixed(0)}`} />
              <Tooltip 
                formatter={(value: any, name: any) => [formatCurrency(value), name]}
                labelFormatter={(label) => `Período: ${label}`}
              />
              {products.slice(0, 5).map((product, index) => (
                <Line 
                  key={product.id}
                  type="monotone" 
                  dataKey={product.name} 
                  stroke={COLORS[index % COLORS.length]} 
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Análise Detalhada de Categorias */}
      <Card>
        <CardHeader>
          <CardTitle>Análise Detalhada por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Categoria</th>
                  <th className="text-right p-3">Produtos</th>
                  <th className="text-right p-3">Valor Total</th>
                  <th className="text-right p-3">Quantidade</th>
                  <th className="text-right p-3">Preço Médio</th>
                  <th className="text-left p-3">Principal Fornecedor</th>
                  <th className="text-right p-3">Economia</th>
                  <th className="text-right p-3">% do Total</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.name} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{category.name}</td>
                    <td className="p-3 text-right">{category.products}</td>
                    <td className="p-3 text-right font-semibold">{formatCurrency(category.totalAmount)}</td>
                    <td className="p-3 text-right">{category.totalQuantity}</td>
                    <td className="p-3 text-right">{formatCurrency(category.averagePrice)}</td>
                    <td className="p-3">{category.topSupplier}</td>
                    <td className="p-3 text-right text-green-600">{formatCurrency(category.savings)}</td>
                    <td className="p-3 text-right">
                      <Badge variant="secondary">{category.percentage.toFixed(1)}%</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Top Produtos com Tendências */}
      <Card>
        <CardHeader>
          <CardTitle>Produtos com Maior Variação de Preço</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products
              .filter(product => product.trend !== 'stable')
              .sort((a, b) => Math.abs(b.trendPercentage) - Math.abs(a.trendPercentage))
              .slice(0, 6)
              .map((product) => (
                <Card key={product.id} className="border">
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{product.name}</p>
                        {product.trend === 'up' ? (
                          <TrendingUp className="h-4 w-4 text-red-500" />
                        ) : (
                          <TrendingUp className="h-4 w-4 text-green-500 rotate-180" />
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">{product.category}</Badge>
                      <div className="space-y-1">
                        <p className="text-lg font-bold">{formatCurrency(product.averagePrice)}</p>
                        <p className={`text-sm ${product.trend === 'up' ? 'text-red-500' : 'text-green-500'}`}>
                          {product.trend === 'up' ? '+' : ''}{product.trendPercentage.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">{product.suppliers} fornecedores</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};