import { FileText, Users, CheckCircle, DollarSign, Clock, TrendingUp, TrendingDown, Zap } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentQuotes } from "@/components/dashboard/RecentQuotes";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { RatingPrompts } from "@/components/ratings/RatingPrompts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dashboardMetrics, mockQuotes } from "@/data/mockData";

export default function Dashboard() {
  // Calculate economy metrics
  const completedQuotes = mockQuotes.filter(q => q.status === 'finalized' && q.responseTotal > 0);
  const activeQuotes = mockQuotes.filter(q => q.status === 'active' || q.status === 'receiving').length;
  const totalRequested = completedQuotes.reduce((sum, q) => sum + q.total, 0);
  const totalReceived = completedQuotes.reduce((sum, q) => sum + q.responseTotal, 0);
  const totalSavings = totalRequested - totalReceived;
  const savingsPercentage = totalRequested > 0 ? ((totalSavings / totalRequested) * 100) : 0;

  const economyMetrics = [
    {
      title: "Economia Total",
      value: `R$ ${totalSavings.toLocaleString('pt-BR')}`,
      change: "+28% vs mês anterior",
      changeType: "positive" as const,
      icon: TrendingDown,
      description: "Economia gerada com cotações"
    },
    {
      title: "Economia Percentual",
      value: `${savingsPercentage.toFixed(1)}%`,
      change: "+5% vs mês anterior", 
      changeType: "positive" as const,
      icon: Zap,
      description: "Economia média por cotação"
    },
    {
      title: "Cotações Ativas",
      value: activeQuotes.toString(),
      change: "+12% vs mês anterior",
      changeType: "positive" as const,
      icon: FileText,
      description: "Cotações em andamento"
    },
    {
      title: "Fornecedores Ativos",
      value: dashboardMetrics.activeSuppliers.toString(),
      change: "+3 este mês",
      changeType: "positive" as const,
      icon: Users,
      description: "Fornecedores cadastrados e ativos"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Bem-vindo de volta! 👋
        </h1>
        <p className="text-muted-foreground">
          Aqui está um resumo da sua economia e performance no sistema
        </p>
      </div>

      {/* Economy Highlight Card */}
      <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <TrendingDown className="h-6 w-6" />
            Destaque do Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">
                R$ {totalSavings.toLocaleString('pt-BR')}
              </div>
              <p className="text-sm text-green-700">Economia Total Gerada</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">
                {savingsPercentage.toFixed(0)}%
              </div>
              <p className="text-sm text-green-700">Economia Média</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">
                {completedQuotes.length}
              </div>
              <p className="text-sm text-green-700">Cotações Economizadas</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-white/60 rounded-lg">
            <p className="text-sm text-green-800 text-center">
              <strong>💡 Você já economizou o equivalente a {Math.round(savingsPercentage)}% dos seus gastos!</strong> Continue usando o QuoteMaster Pro para maximizar suas economias.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {economyMetrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {/* Performance Chart */}
      <PerformanceChart />

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Quotes */}
        <RecentQuotes />

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <p className="text-sm text-muted-foreground">
              Acesse rapidamente as funcionalidades mais utilizadas
            </p>
          </CardHeader>
          <CardContent>
            <QuickActions />
          </CardContent>
        </Card>
      </div>

      {/* Rating Prompts */}
      <RatingPrompts />
    </div>
  );
}