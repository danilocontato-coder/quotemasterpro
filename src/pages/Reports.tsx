import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  BarChart3, 
  FileText, 
  Download, 
  TrendingUp, 
  DollarSign,
  Users,
  Package,
  Calendar,
  Filter,
  FileSpreadsheet,
  TrendingDown,
  ChevronDown
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

export function Reports() {
  const [dateRange, setDateRange] = useState<any>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const { toast } = useToast();

  // Enhanced mock data for reports with savings information
  const reportData = {
    totalSpent: 125000,
    totalQuotes: 45,
    averageValue: 2777.78,
    totalSavings: 18750, // 15% savings from competitive quotes
    savingsPercentage: 13.1,
    marketComparison: 143750, // What would have been spent without the platform
    topSuppliers: [
      { name: "Fornecedor Alpha", value: 45000, percentage: 36, savings: 6750 },
      { name: "Fornecedor Beta", value: 32000, percentage: 25.6, savings: 4800 },
      { name: "Fornecedor Gamma", value: 28000, percentage: 22.4, savings: 4200 },
    ],
    monthlyData: [
      { month: "Jan", amount: 12000, quotes: 8, savings: 1800 },
      { month: "Fev", amount: 15000, quotes: 12, savings: 2250 },
      { month: "Mar", amount: 18000, quotes: 15, savings: 2700 },
      { month: "Abr", amount: 22000, quotes: 18, savings: 3300 },
      { month: "Mai", amount: 19000, quotes: 14, savings: 2850 },
      { month: "Jun", amount: 25000, quotes: 20, savings: 3750 },
    ],
    recentQuotes: [
      { id: "Q-001", description: "Material de limpeza", value: 1500, originalValue: 1765, status: "approved", date: "2024-08-15", savings: 265 },
      { id: "Q-002", description: "Manutenção elevador", value: 3200, originalValue: 3680, status: "pending", date: "2024-08-14", savings: 480 },
      { id: "Q-003", description: "Materiais elétricos", value: 850, originalValue: 1020, status: "approved", date: "2024-08-13", savings: 170 },
    ]
  };

  const exportToPDF = async () => {
    try {
      // Dynamic import to avoid bundling issues
      const { jsPDF } = await import('jspdf');
      await import('jspdf-autotable');
      
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.text('Relatório de Cotações - QuoteMaster Pro', 20, 20);
      
      // Period
      doc.setFontSize(12);
      doc.text(`Período: Últimos ${selectedPeriod} dias`, 20, 35);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 45);
      
      // Summary stats
      doc.setFontSize(14);
      doc.text('Resumo Geral:', 20, 65);
      doc.setFontSize(10);
      doc.text(`Total Gasto: R$ ${reportData.totalSpent.toLocaleString()}`, 20, 75);
      doc.text(`Total de Cotações: ${reportData.totalQuotes}`, 20, 85);
      doc.text(`Economia Gerada: R$ ${reportData.totalSavings.toLocaleString()} (${reportData.savingsPercentage}%)`, 20, 95);
      doc.text(`Valor Médio: R$ ${reportData.averageValue.toLocaleString()}`, 20, 105);
      
      // Top suppliers table
      const supplierData = reportData.topSuppliers.map(supplier => [
        supplier.name,
        `R$ ${supplier.value.toLocaleString()}`,
        `${supplier.percentage}%`,
        `R$ ${supplier.savings.toLocaleString()}`
      ]);
      
      (doc as any).autoTable({
        head: [['Fornecedor', 'Valor', 'Participação', 'Economia']],
        body: supplierData,
        startY: 120,
      });
      
      // Recent quotes table
      const quotesData = reportData.recentQuotes.map(quote => [
        quote.id,
        quote.description,
        `R$ ${quote.value.toLocaleString()}`,
        `R$ ${quote.savings.toLocaleString()}`,
        getStatusLabel(quote.status),
        quote.date
      ]);
      
      (doc as any).autoTable({
        head: [['ID', 'Descrição', 'Valor Final', 'Economia', 'Status', 'Data']],
        body: quotesData,
        startY: (doc as any).lastAutoTable.finalY + 20,
      });
      
      doc.save('relatorio-cotacoes.pdf');
      
      toast({
        title: "Relatório exportado",
        description: "Relatório PDF gerado com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Erro ao gerar relatório PDF. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const exportToExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Summary sheet
      const summaryData = [
        ['Relatório de Cotações - QuoteMaster Pro'],
        [''],
        ['Resumo Geral'],
        ['Total Gasto', `R$ ${reportData.totalSpent.toLocaleString()}`],
        ['Total de Cotações', reportData.totalQuotes],
        ['Economia Gerada', `R$ ${reportData.totalSavings.toLocaleString()}`],
        ['Percentual de Economia', `${reportData.savingsPercentage}%`],
        ['Valor Médio', `R$ ${reportData.averageValue.toLocaleString()}`],
        [''],
        ['Top Fornecedores'],
        ['Fornecedor', 'Valor', 'Participação', 'Economia'],
        ...reportData.topSuppliers.map(s => [s.name, s.value, `${s.percentage}%`, s.savings])
      ];
      
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumo');
      
      // Monthly data sheet
      const monthlyData = [
        ['Dados Mensais'],
        ['Mês', 'Valor Gasto', 'Cotações', 'Economia'],
        ...reportData.monthlyData.map(m => [m.month, m.amount, m.quotes, m.savings])
      ];
      
      const monthlyWs = XLSX.utils.aoa_to_sheet(monthlyData);
      XLSX.utils.book_append_sheet(wb, monthlyWs, 'Mensal');
      
      // Recent quotes sheet
      const quotesData = [
        ['Cotações Recentes'],
        ['ID', 'Descrição', 'Valor Final', 'Valor Original', 'Economia', 'Status', 'Data'],
        ...reportData.recentQuotes.map(q => [
          q.id, q.description, q.value, q.originalValue, q.savings, getStatusLabel(q.status), q.date
        ])
      ];
      
      const quotesWs = XLSX.utils.aoa_to_sheet(quotesData);
      XLSX.utils.book_append_sheet(wb, quotesWs, 'Cotações');
      
      // Save file
      XLSX.writeFile(wb, 'relatorio-cotacoes.xlsx');
      
      toast({
        title: "Relatório exportado",
        description: "Relatório Excel gerado com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Erro ao gerar relatório Excel. Tente novamente.",
        variant: "destructive",
      });
    }
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Exportar Relatório
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportToPDF}>
              <FileText className="mr-2 h-4 w-4" />
              Exportar para PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportToExcel}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Exportar para Excel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
              <TrendingDown className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-green-600">R$ {reportData.totalSavings.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Economia Gerada</p>
                <p className="text-xs text-green-600 font-medium">{reportData.savingsPercentage}% economizado</p>
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
                        <p className="text-sm text-green-600 font-medium">
                          Economizou: R$ {month.savings.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">{month.quotes} cotações</p>
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
                        <p className="text-sm text-green-600 font-medium">
                          -R$ {quote.savings.toLocaleString()}
                        </p>
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
                      <p className="text-sm text-green-600 font-medium">
                        Economizou: R$ {supplier.savings.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">{supplier.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Gastos por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { category: 'Materiais de Construção', amount: 45000, percentage: 35, growth: 12 },
                    { category: 'Produtos de Limpeza', amount: 28000, percentage: 22, growth: -5 },
                    { category: 'Elétrica e Iluminação', amount: 22000, percentage: 18, growth: 8 },
                    { category: 'Jardinagem', amount: 18000, percentage: 14, growth: 15 },
                    { category: 'Serviços Gerais', amount: 12000, percentage: 11, growth: -2 }
                  ].map((item) => (
                    <div key={item.category} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{item.category}</p>
                        <div className="w-full bg-muted rounded-full h-2 mt-2">
                          <div 
                            className="h-2 bg-primary rounded-full" 
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-bold">R$ {item.amount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{item.percentage}% do total</p>
                        <div className={`text-xs font-medium ${item.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.growth >= 0 ? '+' : ''}{item.growth}% vs mês anterior
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { category: 'Materiais de Construção', quotes: 18, avgTime: '3.2 dias', savings: '14%' },
                    { category: 'Produtos de Limpeza', quotes: 12, avgTime: '2.1 dias', savings: '18%' },
                    { category: 'Elétrica e Iluminação', quotes: 8, avgTime: '4.5 dias', savings: '12%' },
                    { category: 'Jardinagem', quotes: 5, avgTime: '2.8 dias', savings: '22%' },
                    { category: 'Serviços Gerais', quotes: 7, avgTime: '5.1 dias', savings: '8%' }
                  ].map((item) => (
                    <div key={item.category} className="p-3 border rounded-lg">
                      <p className="font-medium mb-2">{item.category}</p>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Cotações</p>
                          <p className="font-semibold">{item.quotes}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Tempo Médio</p>
                          <p className="font-semibold">{item.avgTime}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Economia</p>
                          <p className="font-semibold text-green-600">{item.savings}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tendências de Gastos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-red-600" />
                      <p className="font-medium text-red-800">Tendência de Alta</p>
                    </div>
                    <p className="text-sm text-red-700 mb-2">
                      Gastos com materiais de construção aumentaram 12% este mês
                    </p>
                    <Badge className={'bg-red-100 text-red-700'}>
                      Requer atenção
                    </Badge>
                  </div>

                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="h-5 w-5 text-green-600" />
                      <p className="font-medium text-green-800">Economia Crescente</p>
                    </div>
                    <p className="text-sm text-green-700 mb-2">
                      Economia em jardinagem aumentou 22% através de negociações
                    </p>
                    <Badge className={'bg-green-100 text-green-700'}>
                      Excelente performance
                    </Badge>
                  </div>

                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-5 w-5 text-yellow-600" />
                      <p className="font-medium text-yellow-800">Sazonalidade</p>
                    </div>
                    <p className="text-sm text-yellow-700 mb-2">
                      Agosto tradicionalmente tem 15% mais gastos em manutenção
                    </p>
                    <Badge className={'bg-yellow-100 text-yellow-700'}>
                      Padrão esperado
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Previsões e Recomendações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 border rounded-lg">
                    <p className="font-medium mb-2">🎯 Oportunidade de Economia</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Concentrar compras de materiais elétricos pode gerar desconto de até 8%
                    </p>
                    <p className="text-xs text-green-600 font-medium">
                      Economia estimada: R$ 2.400
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <p className="font-medium mb-2">📊 Análise de Fornecedores</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      3 fornecedores representam 80% dos gastos. Considere diversificar
                    </p>
                    <p className="text-xs text-orange-600 font-medium">
                      Risco de dependência elevado
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <p className="font-medium mb-2">📈 Tendência de Preços</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Materiais de construção com alta de 5% prevista para setembro
                    </p>
                    <p className="text-xs text-blue-600 font-medium">
                      Considere antecipar compras estratégicas
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <p className="font-medium mb-2">⚡ Automação</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Produtos de limpeza podem ser automatizados (compra recorrente)
                    </p>
                    <p className="text-xs text-purple-600 font-medium">
                      Economia de tempo estimada: 4h/mês
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}