import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  BarChart3, 
  Download, 
  Filter, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  FileText,
  Target,
  Users,
  Package,
  Award,
  PieChart,
  Calendar,
  Trophy,
  Activity,
  Eye,
  Clock
} from 'lucide-react';
import { useSupplierReports, SupplierReportFilter } from '@/hooks/useSupplierReports';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function SupplierReports() {
  const { reportData, isLoading, generateReport } = useSupplierReports();
  const { toast } = useToast();

  const [showFilters, setShowFilters] = useState(true);
  const [availableClients, setAvailableClients] = useState<string[]>([]);
  const [brandSettings, setBrandSettings] = useState({
    companyName: 'Sistema de Cotações',
    logo: '/placeholder.svg'
  });

  const [filters, setFilters] = useState<SupplierReportFilter>({
    dateRange: {
      start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    status: [],
    clients: [],
    minAmount: undefined,
    maxAmount: undefined,
    categories: []
  });

  // Carregar configurações da marca
  useEffect(() => {
    loadBrandSettings();
    loadAvailableClients();
  }, []);

  const loadBrandSettings = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['company_name', 'company_logo']);
      
      if (data) {
        const settings: any = {};
        data.forEach(item => {
          if (item.setting_key === 'company_name') {
            settings.companyName = (item.setting_value as any)?.value || 'Sistema de Cotações';
          }
          if (item.setting_key === 'company_logo') {
            settings.logo = (item.setting_value as any)?.url || '/placeholder.svg';
          }
        });
        setBrandSettings(prev => ({ ...prev, ...settings }));
      }
    } catch (error) {
      console.error('Erro ao carregar configurações da marca:', error);
    }
  };

  const loadAvailableClients = async () => {
    try {
      const { data } = await supabase
        .from('quotes')
        .select('client_name')
        .not('client_name', 'is', null);
      
      if (data) {
        const uniqueClients = [...new Set(data.map(item => item.client_name))];
        setAvailableClients(uniqueClients);
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const handleFilterChange = (key: keyof SupplierReportFilter, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleStatus = (status: string) => {
    setFilters(prev => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status]
    }));
  };

  const toggleClient = (client: string) => {
    setFilters(prev => ({
      ...prev,
      clients: prev.clients.includes(client)
        ? prev.clients.filter(c => c !== client)
        : [...prev.clients, client]
    }));
  };

  const exportToPDF = async () => {
    if (!reportData) return;

    try {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      const primaryColor: [number, number, number] = [0, 51, 102]; // #003366
      const textColor: [number, number, number] = [15, 23, 42]; // #0F172A

      // Header
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, pageWidth, 30, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(brandSettings.companyName, 20, 20);

      // Título
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('RELATÓRIO DE PERFORMANCE - FORNECEDOR', 20, 45);

      // Período
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Período: ${filters.dateRange.start} a ${filters.dateRange.end}`, 20, 55);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 62);

      let yPosition = 75;

      // KPIs Principais
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('INDICADORES DE PERFORMANCE', 20, yPosition);
      yPosition += 15;

      const kpis = [
        ['Total de Cotações Participadas', reportData.totalQuotes.toString()],
        ['Respostas Enviadas', reportData.totalResponses.toString()],
        ['Valor Total Proposto', `R$ ${reportData.totalProposed.toLocaleString('pt-BR')}`],
        ['Valor Total Ganho', `R$ ${reportData.totalWon.toLocaleString('pt-BR')}`],
        ['Taxa de Sucesso', `${reportData.winRate.toFixed(1)}%`],
        ['Valor Médio por Cotação', `R$ ${reportData.avgQuoteValue.toLocaleString('pt-BR')}`],
        ['Cliente Principal', reportData.topClient],
        ['Produto Principal', reportData.topProduct]
      ];

      autoTable(doc, {
        startY: yPosition,
        head: [['Indicador', 'Valor']],
        body: kpis,
        theme: 'grid',
        headStyles: { fillColor: primaryColor, textColor: 255 },
        styles: { fontSize: 9 },
        columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 80 } }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 20;

      // Ranking de Clientes
      if (reportData.clientRanking.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text('RANKING DE CLIENTES', 20, yPosition);
        yPosition += 10;

        const clientData = reportData.clientRanking.slice(0, 10).map((client, index) => [
          (index + 1).toString(),
          client.name,
          client.quotes.toString(),
          `R$ ${client.value.toLocaleString('pt-BR')}`,
          `${client.winRate.toFixed(1)}%`
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [['#', 'Cliente', 'Cotações', 'Valor (R$)', 'Taxa Sucesso']],
          body: clientData,
          theme: 'grid',
          headStyles: { fillColor: primaryColor, textColor: 255 },
          styles: { fontSize: 8 }
        });
      }

      doc.save(`relatorio-fornecedor-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: "Sucesso!",
        description: "Relatório exportado como PDF."
      });

    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast({
        title: "Erro",
        description: "Erro ao exportar relatório para PDF.",
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatórios de Performance</h1>
          <p className="text-muted-foreground">
            Analise seu desempenho e histórico de cotações
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
          </Button>
          {reportData && (
            <Button onClick={exportToPDF}>
              <Download className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros do Relatório
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="startDate">Data Inicial</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) => handleFilterChange('dateRange', {
                    ...filters.dateRange,
                    start: e.target.value
                  })}
                />
              </div>
              <div>
                <Label htmlFor="endDate">Data Final</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => handleFilterChange('dateRange', {
                    ...filters.dateRange,
                    end: e.target.value
                  })}
                />
              </div>
              <div>
                <Label htmlFor="minAmount">Valor Mínimo</Label>
                <Input
                  id="minAmount"
                  type="number"
                  placeholder="R$ 0,00"
                  value={filters.minAmount || ''}
                  onChange={(e) => handleFilterChange('minAmount', 
                    e.target.value ? parseFloat(e.target.value) : undefined
                  )}
                />
              </div>
              <div>
                <Label htmlFor="maxAmount">Valor Máximo</Label>
                <Input
                  id="maxAmount"
                  type="number"
                  placeholder="R$ 0,00"
                  value={filters.maxAmount || ''}
                  onChange={(e) => handleFilterChange('maxAmount', 
                    e.target.value ? parseFloat(e.target.value) : undefined
                  )}
                />
              </div>
            </div>

            <div>
              <Label>Status das Cotações</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {['draft', 'sent', 'receiving', 'received', 'approved', 'rejected'].map(status => (
                  <Badge
                    key={status}
                    variant={filters.status.includes(status) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleStatus(status)}
                  >
                    {status === 'draft' && 'Rascunho'}
                    {status === 'sent' && 'Enviada'}
                    {status === 'receiving' && 'Recebendo'}
                    {status === 'received' && 'Recebida'}
                    {status === 'approved' && 'Aprovada'}
                    {status === 'rejected' && 'Rejeitada'}
                  </Badge>
                ))}
              </div>
            </div>

            {availableClients.length > 0 && (
              <div>
                <Label>Clientes</Label>
                <div className="flex flex-wrap gap-2 mt-2 max-h-32 overflow-y-auto">
                  {availableClients.map(client => (
                    <Badge
                      key={client}
                      variant={filters.clients.includes(client) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleClient(client)}
                    >
                      {client}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={() => generateReport(filters)} disabled={isLoading} className="w-full">
              <BarChart3 className="mr-2 h-4 w-4" />
              {isLoading ? 'Gerando Relatório...' : 'Gerar Relatório'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Resultados do Relatório */}
      {reportData && (
        <>
          {/* KPIs Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Cotações Participadas</p>
                    <p className="text-2xl font-bold text-blue-600">{reportData.totalQuotes}</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Taxa de Sucesso</p>
                    <p className="text-2xl font-bold text-green-600">{reportData.winRate.toFixed(1)}%</p>
                  </div>
                  <Target className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Valor Proposto</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(reportData.totalProposed)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Receita Conquistada</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(reportData.totalWon)}
                    </p>
                  </div>
                  <Trophy className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="performance" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="clients">Clientes</TabsTrigger>
              <TabsTrigger value="products">Produtos</TabsTrigger>
              <TabsTrigger value="competition">Concorrência</TabsTrigger>
            </TabsList>

            <TabsContent value="performance" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Performance Mensal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {reportData.monthlyPerformance.slice(-6).map((month, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                          <span className="font-medium">{month.month}</span>
                          <div className="flex gap-4 text-sm">
                            <span>{month.quotes} cotações</span>
                            <span>{month.responses} respostas</span>
                            <span className="text-green-600">{month.won} ganhas</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Métricas de Tempo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Tempo Médio de Resposta</p>
                        <p className="text-2xl font-bold">{reportData.avgResponseTime} dias</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Valor Médio por Cotação</p>
                        <p className="text-2xl font-bold">{formatCurrency(reportData.avgQuoteValue)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="clients" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Ranking de Clientes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Posição</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Cotações</TableHead>
                        <TableHead>Valor Total</TableHead>
                        <TableHead>Taxa de Sucesso</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.clientRanking.map((client, index) => (
                        <TableRow key={index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">{client.name}</TableCell>
                          <TableCell>{client.quotes}</TableCell>
                          <TableCell>{formatCurrency(client.value)}</TableCell>
                          <TableCell>
                            <Badge variant={client.winRate > 50 ? "default" : "secondary"}>
                              {client.winRate.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="products" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Produtos Mais Cotados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Posição</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Valor Total</TableHead>
                        <TableHead>Preço Médio</TableHead>
                        <TableHead>Cotações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.productRanking.map((product, index) => (
                        <TableRow key={index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{product.quantity.toLocaleString('pt-BR')}</TableCell>
                          <TableCell>{formatCurrency(product.totalValue)}</TableCell>
                          <TableCell>{formatCurrency(product.avgPrice)}</TableCell>
                          <TableCell>{product.quotes}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="competition" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Análise de Concorrência
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {reportData.competitorAnalysis.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Concorrente</TableHead>
                          <TableHead>Cotações</TableHead>
                          <TableHead>Taxa de Sucesso</TableHead>
                          <TableHead>Preço Médio</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.competitorAnalysis.map((competitor, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{competitor.competitor}</TableCell>
                            <TableCell>{competitor.quotes}</TableCell>
                            <TableCell>
                              <Badge variant={competitor.winRate > reportData.winRate ? "destructive" : "default"}>
                                {competitor.winRate.toFixed(1)}%
                              </Badge>
                            </TableCell>
                            <TableCell>{formatCurrency(competitor.avgPrice)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <Award className="mx-auto h-12 w-12 text-muted-foreground" />
                      <p className="text-muted-foreground mt-2">
                        Nenhum dado de concorrência disponível para o período selecionado
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {!reportData && !isLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold mt-4">Configure os filtros e gere seu relatório</h3>
              <p className="text-muted-foreground mt-2">
                Analise sua performance, histórico de cotações e compare com a concorrência
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}