import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  FileText, 
  Download, 
  TrendingUp, 
  DollarSign,
  Users,
  Package,
  Calendar,
  Filter
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function Reports() {
  const [dateRange, setDateRange] = useState<any>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // Mock data for reports
  const reportData = {
    totalSpent: 125000,
    totalQuotes: 45,
    averageValue: 2777.78,
    topSuppliers: [
      { name: "Fornecedor Alpha", value: 45000, percentage: 36 },
      { name: "Fornecedor Beta", value: 32000, percentage: 25.6 },
      { name: "Fornecedor Gamma", value: 28000, percentage: 22.4 },
    ],
    monthlyData: [
      { month: "Jan", amount: 12000, quotes: 8 },
      { month: "Fev", amount: 15000, quotes: 12 },
      { month: "Mar", amount: 18000, quotes: 15 },
      { month: "Abr", amount: 22000, quotes: 18 },
      { month: "Mai", amount: 19000, quotes: 14 },
      { month: "Jun", amount: 25000, quotes: 20 },
    ],
    recentQuotes: [
      { id: "Q-001", description: "Material de limpeza", value: 1500, status: "approved", date: "2024-08-15" },
      { id: "Q-002", description: "Manutenção elevador", value: 3200, status: "pending", date: "2024-08-14" },
      { id: "Q-003", description: "Materiais elétricos", value: 850, status: "approved", date: "2024-08-13" },
    ]
  };

  const generateReport = (type: string) => {
    console.log(`Generating ${type} report...`);
    // Placeholder for report generation
  };

  const getStatusColor = (status: string) => {
    const colors = {
      approved: "bg-success",
      pending: "bg-warning", 
      rejected: "bg-destructive"
    };
    return colors[status as keyof typeof colors] || "bg-secondary";
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      approved: "Aprovado",
      pending: "Pendente",
      rejected: "Rejeitado"
    };
    return labels[status as keyof typeof labels] || status;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">
            Análises e relatórios detalhados do sistema
          </p>
        </div>
        <Button onClick={() => generateReport('general')}>
          <Download className="h-4 w-4 mr-2" />
          Exportar Relatório
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-success" />
              <div className="ml-4">
                <p className="text-2xl font-bold">R$ {reportData.totalSpent.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Gasto</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-primary" />
              <div className="ml-4">
                <p className="text-2xl font-bold">{reportData.totalQuotes}</p>
                <p className="text-sm text-muted-foreground">Total de Cotações</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-warning" />
              <div className="ml-4">
                <p className="text-2xl font-bold">R$ {reportData.averageValue.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Valor Médio</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-secondary" />
              <div className="ml-4">
                <p className="text-2xl font-bold">{reportData.topSuppliers.length}</p>
                <p className="text-sm text-muted-foreground">Fornecedores Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Relatório
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                  <SelectItem value="365">Último ano</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os fornecedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alpha">Fornecedor Alpha</SelectItem>
                  <SelectItem value="beta">Fornecedor Beta</SelectItem>
                  <SelectItem value="gamma">Fornecedor Gamma</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ações</Label>
              <Button className="w-full">
                <BarChart3 className="h-4 w-4 mr-2" />
                Aplicar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="suppliers">Fornecedores</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Evolução Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reportData.monthlyData.map((month) => (
                    <div key={month.month} className="flex items-center justify-between">
                      <span className="font-medium">{month.month}</span>
                      <div className="text-right">
                        <p className="font-bold">R$ {month.amount.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">{month.quotes} cotações</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Cotações Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reportData.recentQuotes.map((quote) => (
                    <div key={quote.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{quote.id}</p>
                        <p className="text-sm text-muted-foreground">{quote.description}</p>
                        <p className="text-xs text-muted-foreground">{quote.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">R$ {quote.value.toLocaleString()}</p>
                        <Badge className={getStatusColor(quote.status)}>
                          {getStatusLabel(quote.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="suppliers">
          <Card>
            <CardHeader>
              <CardTitle>Ranking de Fornecedores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.topSuppliers.map((supplier, index) => (
                  <div key={supplier.name} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{supplier.name}</p>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${supplier.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">R$ {supplier.value.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{supplier.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Gastos por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Relatório de categorias em desenvolvimento...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Tendências</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Análise de tendências em desenvolvimento...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}