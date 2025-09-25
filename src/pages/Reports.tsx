import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  BarChart3, 
  Download, 
  Filter, 
  Save, 
  TrendingUp, 
  Users, 
  DollarSign,
  Calendar,
  Star,
  FileText,
  PieChart,
  LineChart,
  Activity,
  Eye,
  Trash2,
  Plus,
  Package,
  Target,
  Calculator
} from 'lucide-react';
import { useReports, ReportFilter } from '@/hooks/useReports';
import { useSupabaseSuppliers } from '@/hooks/useSupabaseSuppliers';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { FinancialAnalysisCard } from '@/components/reports/FinancialAnalysisCard';
import { SupplierPerformanceChart } from '@/components/reports/SupplierPerformanceChart';
import { ProductCategoryAnalysis } from '@/components/reports/ProductCategoryAnalysis';
import { SavingsAnalysisCard } from '@/components/reports/SavingsAnalysisCard';

export default function Reports() {
  const { 
    reportData, 
    savedReports, 
    isLoading, 
    error, 
    generateReport, 
    saveReport, 
    deleteReport, 
    exportReport 
  } = useReports();
  
  const { suppliers } = useSupabaseSuppliers();
  const { toast } = useToast();

  const [filters, setFilters] = useState<ReportFilter>({
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    status: [],
    suppliers: [],
    clients: [],
    minAmount: undefined,
    maxAmount: undefined,
    categories: [],
    ratings: undefined
  });

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [saveReportData, setSaveReportData] = useState({
    name: '',
    description: '',
    report_type: 'general',
    is_public: false
  });

  const handleGenerateReport = async () => {
    try {
      await generateReport(filters);
      toast({
        title: "Sucesso!",
        description: "Relatório gerado com sucesso."
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao gerar relatório.",
        variant: "destructive"
      });
    }
  };

  const handleSaveReport = async () => {
    try {
      await saveReport({
        ...saveReportData,
        filters,
        columns: ['all']
      });
      
      setShowSaveModal(false);
      setSaveReportData({
        name: '',
        description: '',
        report_type: 'general',
        is_public: false
      });
      
      toast({
        title: "Sucesso!",
        description: "Relatório salvo com sucesso."
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar relatório.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      await deleteReport(reportId);
      toast({
        title: "Sucesso!",
        description: "Relatório removido com sucesso."
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao remover relatório.",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      receiving: 'bg-yellow-100 text-yellow-800',
      received: 'bg-green-100 text-green-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string) => {
    const texts = {
      draft: 'Rascunho',
      sent: 'Enviada',
      receiving: 'Recebendo',
      received: 'Recebida',
      approved: 'Aprovada',
      rejected: 'Rejeitada',
      cancelled: 'Cancelada'
    };
    return texts[status as keyof typeof texts] || status;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios de Gestão</h1>
          <p className="text-muted-foreground">
            Análises detalhadas de compras, fornecedores e economia para tomada de decisão
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
          </Button>
          <Button variant="outline" onClick={() => setShowSaveModal(true)} disabled={!reportData}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Relatório
          </Button>
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Relatório
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Período */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">📅 Período</Label>
              <div className="space-y-2">
                <div>
                  <Label className="text-sm text-muted-foreground">Data inicial</Label>
                  <Input
                    type="date"
                    value={filters.dateRange?.start || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange!, start: e.target.value }
                    }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Data final</Label>
                  <Input
                    type="date"
                    value={filters.dateRange?.end || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange!, end: e.target.value }
                    }))}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">📊 Status das Cotações</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {['draft', 'sent', 'receiving', 'received', 'approved', 'rejected', 'cancelled'].map(status => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox
                      id={status}
                      checked={filters.status?.includes(status)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFilters(prev => ({
                            ...prev,
                            status: [...(prev.status || []), status]
                          }));
                        } else {
                          setFilters(prev => ({
                            ...prev,
                            status: prev.status?.filter(s => s !== status)
                          }));
                        }
                      }}
                    />
                    <Label htmlFor={status} className="text-sm cursor-pointer">
                      {getStatusText(status)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Fornecedores */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">🏢 Fornecedores</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                {suppliers && suppliers.length > 0 ? (
                  suppliers.map(supplier => (
                    <div key={supplier.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={supplier.id}
                        checked={filters.suppliers?.includes(supplier.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFilters(prev => ({
                              ...prev,
                              suppliers: [...(prev.suppliers || []), supplier.id]
                            }));
                          } else {
                            setFilters(prev => ({
                              ...prev,
                              suppliers: prev.suppliers?.filter(s => s !== supplier.id)
                            }));
                          }
                        }}
                      />
                      <Label htmlFor={supplier.id} className="text-sm cursor-pointer">
                        {supplier.name}
                      </Label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum fornecedor encontrado</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Valores */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">💰 Faixa de Valores</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-sm text-muted-foreground">Valor mínimo</Label>
                  <Input
                    type="number"
                    placeholder="R$ 0,00"
                    value={filters.minAmount || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      minAmount: e.target.value ? Number(e.target.value) : undefined
                    }))}
                    className="mt-1"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-sm text-muted-foreground">Valor máximo</Label>
                  <Input
                    type="number"
                    placeholder="R$ 999.999,99"
                    value={filters.maxAmount || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      maxAmount: e.target.value ? Number(e.target.value) : undefined
                    }))}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-3 pt-4 border-t">
            <Button 
              onClick={handleGenerateReport} 
              disabled={isLoading}
              className="flex-1"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              {isLoading ? 'Gerando Relatório...' : 'Gerar Relatório'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setFilters({
                  dateRange: {
                    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    end: new Date().toISOString().split('T')[0]
                  },
                  status: [],
                  suppliers: [],
                  clients: [],
                  minAmount: undefined,
                  maxAmount: undefined,
                  categories: [],
                  ratings: undefined
                });
              }}
            >
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Dados do Relatório */}
      {reportData && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="financial">Financeiro</TabsTrigger>
            <TabsTrigger value="suppliers">Fornecedores</TabsTrigger>
            <TabsTrigger value="products">Produtos</TabsTrigger>
            <TabsTrigger value="savings">Economia</TabsTrigger>
            <TabsTrigger value="trends">Tendências</TabsTrigger>
          </TabsList>

          {/* Visão Geral Executiva */}
          <TabsContent value="overview">
            <div className="space-y-6">
              {/* KPIs Principais */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center">
                      <FileText className="h-8 w-8 text-blue-600" />
                      <div className="ml-4">
                        <p className="text-2xl font-bold">{reportData.summary.totalQuotes}</p>
                        <p className="text-sm text-muted-foreground">Cotações</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center">
                      <DollarSign className="h-8 w-8 text-green-600" />
                      <div className="ml-4">
                        <p className="text-2xl font-bold">R$ {reportData.summary.totalAmount.toLocaleString('pt-BR')}</p>
                        <p className="text-sm text-muted-foreground">Valor Cotado</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center">
                      <Users className="h-8 w-8 text-purple-600" />
                      <div className="ml-4">
                        <p className="text-2xl font-bold">{reportData.summary.totalSuppliers}</p>
                        <p className="text-sm text-muted-foreground">Fornecedores</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center">
                      <Package className="h-8 w-8 text-orange-600" />
                      <div className="ml-4">
                        <p className="text-2xl font-bold">{reportData.summary.totalProducts}</p>
                        <p className="text-sm text-muted-foreground">Produtos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center">
                      <Calculator className="h-8 w-8 text-emerald-600" />
                      <div className="ml-4">
                        <p className="text-2xl font-bold">R$ {reportData.summary.totalSavings.toLocaleString('pt-BR')}</p>
                        <p className="text-sm text-muted-foreground">Economia</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center">
                      <Target className="h-8 w-8 text-red-600" />
                      <div className="ml-4">
                        <p className="text-2xl font-bold">{reportData.summary.completionRate.toFixed(1)}%</p>
                        <p className="text-sm text-muted-foreground">Taxa Sucesso</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Performers */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">🏆 Top Fornecedor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{reportData.summary.topSupplier}</p>
                      <p className="text-sm text-muted-foreground">Maior volume de negócios</p>
                      <Badge variant="secondary" className="mt-2">
                        {reportData.supplierMetrics[0]?.totalQuotes || 0} cotações
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">📦 Produto Mais Comprado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{reportData.summary.topProduct}</p>
                      <p className="text-sm text-muted-foreground">Maior volume em quantidade</p>
                      <Badge variant="secondary" className="mt-2">
                        {reportData.productAnalysis.products[0]?.totalQuantity || 0} unidades
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">⚡ Tempo Médio Entrega</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{reportData.summary.avgDeliveryTime.toFixed(0)} dias</p>
                      <p className="text-sm text-muted-foreground">Prazo médio dos fornecedores</p>
                      <Badge variant={reportData.summary.avgDeliveryTime <= 7 ? "default" : "destructive"} className="mt-2">
                        {reportData.summary.avgDeliveryTime <= 7 ? "Excelente" : "Precisa melhorar"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Análise Financeira */}
          <TabsContent value="financial">
            <FinancialAnalysisCard data={reportData.financial} period="Período selecionado" />
          </TabsContent>

          {/* Análise de Fornecedores */}
          <TabsContent value="suppliers">
            <SupplierPerformanceChart suppliers={reportData.supplierMetrics} timeRange="Período selecionado" />
          </TabsContent>

          {/* Análise de Produtos */}
          <TabsContent value="products">
            <ProductCategoryAnalysis products={reportData.productAnalysis.products} categories={reportData.productAnalysis.categories} timeRange="Período selecionado" />
          </TabsContent>

          {/* Análise de Economia */}
          <TabsContent value="savings">
            <SavingsAnalysisCard data={reportData.savingsAnalysis} period="Período selecionado" />
          </TabsContent>

          {/* Tendências */}
          <TabsContent value="trends">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>📈 Tendências de Mercado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3">🔺 Produtos com Preços em Alta</h4>
                      <div className="space-y-2">
                        {reportData.productAnalysis.products
                          .filter(p => p.trend === 'up')
                          .slice(0, 5)
                          .map(product => (
                            <div key={product.id} className="flex justify-between items-center p-2 bg-red-50 rounded">
                              <span className="text-sm">{product.name}</span>
                              <Badge variant="destructive">+{product.trendPercentage.toFixed(1)}%</Badge>
                            </div>
                          ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-3">🔻 Oportunidades de Economia</h4>
                      <div className="space-y-2">
                        {reportData.productAnalysis.products
                          .filter(p => p.trend === 'down')
                          .slice(0, 5)
                          .map(product => (
                            <div key={product.id} className="flex justify-between items-center p-2 bg-green-50 rounded">
                              <span className="text-sm">{product.name}</span>
                              <Badge variant="default">{product.trendPercentage.toFixed(1)}%</Badge>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Modal Salvar Relatório */}
      <Dialog open={showSaveModal} onOpenChange={setShowSaveModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar Relatório</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="report-name">Nome do Relatório *</Label>
              <Input
                id="report-name"
                value={saveReportData.name}
                onChange={(e) => setSaveReportData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Digite o nome do relatório"
              />
            </div>
            <div>
              <Label htmlFor="report-description">Descrição</Label>
              <Textarea
                id="report-description"
                value={saveReportData.description}
                onChange={(e) => setSaveReportData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva o relatório (opcional)"
              />
            </div>
            <div>
              <Label htmlFor="report-type">Tipo de Relatório</Label>
              <Select
                value={saveReportData.report_type}
                onValueChange={(value) => setSaveReportData(prev => ({ ...prev, report_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Geral</SelectItem>
                  <SelectItem value="financial">Financeiro</SelectItem>
                  <SelectItem value="suppliers">Fornecedores</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="public"
                checked={saveReportData.is_public}
                onCheckedChange={(checked) => setSaveReportData(prev => ({ ...prev, is_public: !!checked }))}
              />
              <Label htmlFor="public">Tornar público para outros usuários</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveReport}
              disabled={!saveReportData.name.trim()}
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}