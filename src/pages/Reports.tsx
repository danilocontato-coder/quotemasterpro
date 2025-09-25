import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
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
  Plus
} from 'lucide-react';
import { useReports, ReportFilter } from '@/hooks/useReports';
import { useSupabaseSuppliers } from '@/hooks/useSupabaseSuppliers';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

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
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">
            Análises detalhadas e relatórios personalizados
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowSaveModal(true)} disabled={!reportData}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Relatório
          </Button>
          <Button onClick={handleGenerateReport} disabled={isLoading}>
            <BarChart3 className="h-4 w-4 mr-2" />
            {isLoading ? 'Gerando...' : 'Gerar Relatório'}
          </Button>
        </div>
      </div>

      {/* Filtros Avançados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros Avançados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Período */}
            <div className="space-y-2">
              <Label>Período</Label>
              <div className="space-y-2">
                <Input
                  type="date"
                  value={filters.dateRange?.start || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange!, start: e.target.value }
                  }))}
                  placeholder="Data inicial"
                />
                <Input
                  type="date"
                  value={filters.dateRange?.end || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange!, end: e.target.value }
                  }))}
                  placeholder="Data final"
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status das Cotações</Label>
              <div className="space-y-2">
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
                    <Label htmlFor={status} className="text-sm">
                      {getStatusText(status)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Fornecedores */}
            <div className="space-y-2">
              <Label>Fornecedores</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {suppliers.map(supplier => (
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
                    <Label htmlFor={supplier.id} className="text-sm">
                      {supplier.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Valores */}
            <div className="space-y-2">
              <Label>Faixa de Valores</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Valor mínimo"
                  value={filters.minAmount || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    minAmount: e.target.value ? Number(e.target.value) : undefined
                  }))}
                />
                <Input
                  type="number"
                  placeholder="Valor máximo"
                  value={filters.maxAmount || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    maxAmount: e.target.value ? Number(e.target.value) : undefined
                  }))}
                />
              </div>
            </div>

            {/* Avaliações */}
            <div className="space-y-2">
              <Label>Faixa de Avaliações</Label>
              <div className="flex gap-2">
                <Select
                  value={filters.ratings?.min?.toString() || ''}
                  onValueChange={(value) => setFilters(prev => ({
                    ...prev,
                    ratings: { ...prev.ratings!, min: Number(value) }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Mín" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(rating => (
                      <SelectItem key={rating} value={rating.toString()}>
                        {rating} ⭐
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filters.ratings?.max?.toString() || ''}
                  onValueChange={(value) => setFilters(prev => ({
                    ...prev,
                    ratings: { ...prev.ratings!, max: Number(value) }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Máx" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(rating => (
                      <SelectItem key={rating} value={rating.toString()}>
                        {rating} ⭐
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados do Relatório */}
      {reportData && (
        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList>
            <TabsTrigger value="summary">Resumo</TabsTrigger>
            <TabsTrigger value="quotes">Cotações</TabsTrigger>
            <TabsTrigger value="suppliers">Fornecedores</TabsTrigger>
            <TabsTrigger value="ratings">Avaliações</TabsTrigger>
          </TabsList>

          {/* Resumo */}
          <TabsContent value="summary">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-2xl font-bold">{reportData.summary.totalQuotes}</p>
                      <p className="text-sm text-muted-foreground">Total de Cotações</p>
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
                      <p className="text-sm text-muted-foreground">Valor Total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <TrendingUp className="h-8 w-8 text-orange-600" />
                    <div className="ml-4">
                      <p className="text-2xl font-bold">R$ {reportData.summary.avgAmount.toLocaleString('pt-BR')}</p>
                      <p className="text-sm text-muted-foreground">Valor Médio</p>
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
                    <Star className="h-8 w-8 text-yellow-600" />
                    <div className="ml-4">
                      <p className="text-2xl font-bold">{reportData.summary.avgRating.toFixed(1)}</p>
                      <p className="text-sm text-muted-foreground">Avaliação Média</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <Activity className="h-8 w-8 text-red-600" />
                    <div className="ml-4">
                      <p className="text-2xl font-bold">{reportData.summary.completionRate.toFixed(1)}%</p>
                      <p className="text-sm text-muted-foreground">Taxa de Conclusão</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Cotações */}
          <TabsContent value="quotes">
            <Card>
              <CardHeader>
                <CardTitle>Cotações</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Respostas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.quotes.map((quote) => (
                      <TableRow key={quote.id}>
                        <TableCell className="font-medium">{quote.id}</TableCell>
                        <TableCell>{quote.title}</TableCell>
                        <TableCell>{quote.client_name}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(quote.status)}>
                            {getStatusText(quote.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>R$ {(quote.total || 0).toLocaleString('pt-BR')}</TableCell>
                        <TableCell>{new Date(quote.created_at).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>{quote.responses_count || 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fornecedores */}
          <TabsContent value="suppliers">
            <Card>
              <CardHeader>
                <CardTitle>Fornecedores</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Avaliação Média</TableHead>
                      <TableHead>Total de Avaliações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.suppliers.map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell className="font-medium">{supplier.name}</TableCell>
                        <TableCell>{supplier.email}</TableCell>
                        <TableCell>{supplier.phone}</TableCell>
                        <TableCell>
                          <Badge variant={supplier.status === 'active' ? 'default' : 'secondary'}>
                            {supplier.status === 'active' ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {supplier.supplier_ratings?.length > 0 ? (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              {(supplier.supplier_ratings.reduce((sum: number, rating: any) => sum + rating.rating, 0) / supplier.supplier_ratings.length).toFixed(1)}
                            </div>
                          ) : (
                            'N/A'
                          )}
                        </TableCell>
                        <TableCell>{supplier.supplier_ratings?.length || 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Avaliações */}
          <TabsContent value="ratings">
            <Card>
              <CardHeader>
                <CardTitle>Avaliações de Fornecedores</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Cotação</TableHead>
                      <TableHead>Avaliação Geral</TableHead>
                      <TableHead>Qualidade</TableHead>
                      <TableHead>Prazo</TableHead>
                      <TableHead>Comunicação</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Recomenda</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.ratings.map((rating) => (
                      <TableRow key={rating.id}>
                        <TableCell className="font-medium">{rating.suppliers?.name}</TableCell>
                        <TableCell>{rating.quotes?.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            {rating.rating}
                          </div>
                        </TableCell>
                        <TableCell>{rating.quality_rating || 'N/A'}</TableCell>
                        <TableCell>{rating.delivery_rating || 'N/A'}</TableCell>
                        <TableCell>{rating.communication_rating || 'N/A'}</TableCell>
                        <TableCell>{rating.price_rating || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={rating.would_recommend ? 'default' : 'secondary'}>
                            {rating.would_recommend ? 'Sim' : 'Não'}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(rating.created_at).toLocaleDateString('pt-BR')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Relatórios Salvos */}
      <Card>
        <CardHeader>
          <CardTitle>Relatórios Salvos</CardTitle>
        </CardHeader>
        <CardContent>
          {savedReports.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Público</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {savedReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.name}</TableCell>
                    <TableCell>{report.report_type}</TableCell>
                    <TableCell>{report.description || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={report.is_public ? 'default' : 'secondary'}>
                        {report.is_public ? 'Sim' : 'Não'}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(report.created_at).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setFilters(report.filters);
                            generateReport(report.filters);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDeleteReport(report.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Nenhum relatório salvo encontrado.
            </p>
          )}
        </CardContent>
      </Card>

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
              Salvar Relatório
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}