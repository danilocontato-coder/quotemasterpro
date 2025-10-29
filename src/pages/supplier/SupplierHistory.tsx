import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  History, 
  Search, 
  Download, 
  Filter,
  Package,
  CreditCard,
  Users,
  Settings,
  FileText,
  Calendar,
  Activity,
  Clock,
  CheckCircle2,
  DollarSign
} from "lucide-react";
import { useSupplierHistory } from "@/hooks/useSupplierHistory";
import { useQuoteTimeline } from "@/hooks/useQuoteTimeline";
import { QuoteJourneyTimeline } from "@/components/quotes/QuoteJourneyTimeline";
import { exportQuoteTimelineToPDF } from "@/utils/exportQuoteTimeline";
import { formatQuoteCode } from "@/utils/formatQuoteCode";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function SupplierHistory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateRange, setDateRange] = useState("30");
  
  // Timeline states
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [dateFilter, setDateFilter] = useState<string>('30');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [quoteSearchTerm, setQuoteSearchTerm] = useState('');

  const { historyLogs, isLoading, exportHistory } = useSupplierHistory();
  const { events, loading: timelineLoading } = useQuoteTimeline(selectedQuoteId);

  // Carregar cotações do fornecedor
  const loadQuotes = async () => {
    if (!user?.supplierId) return;
    
    setLoadingQuotes(true);
    try {
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - parseInt(dateFilter));

      // Buscar cotações através das respostas do fornecedor
      let query = supabase
        .from('quote_responses')
        .select(`
          quote_id,
          quotes!inner (
            id,
            local_code,
            title,
            total_price,
            status,
            created_at,
            clients_condos (
              id,
              name
            )
          )
        `)
        .eq('supplier_id', user.supplierId)
        .gte('created_at', dateLimit.toISOString())
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // Extrair apenas os quotes únicos e aplicar filtro de status
      const uniqueQuotes = data?.reduce((acc: any[], item: any) => {
        if (item.quotes && !acc.find(q => q.id === item.quotes.id)) {
          if (statusFilter === 'all' || item.quotes.status === statusFilter) {
            acc.push(item.quotes);
          }
        }
        return acc;
      }, []) || [];

      setQuotes(uniqueQuotes);
    } catch (error) {
      console.error('Error loading quotes:', error);
      toast({
        title: 'Erro ao carregar cotações',
        description: 'Não foi possível carregar a lista de cotações.',
        variant: 'destructive'
      });
    } finally {
      setLoadingQuotes(false);
    }
  };

  useEffect(() => {
    loadQuotes();
  }, [dateFilter, statusFilter, user?.supplierId]);

  const handleExportPDF = () => {
    if (!selectedQuoteId || !events.length) {
      toast({
        title: 'Nenhuma cotação selecionada',
        description: 'Selecione uma cotação para exportar.',
        variant: 'destructive'
      });
      return;
    }

    const selectedQuote = quotes.find(q => q.id === selectedQuoteId);
    if (!selectedQuote) return;

    exportQuoteTimelineToPDF(events, {
      code: formatQuoteCode(selectedQuote),
      title: selectedQuote.title,
      clientName: selectedQuote.clients_condos?.name || 'N/A',
      total: selectedQuote.total_price || 0
    });

    toast({
      title: 'PDF gerado com sucesso',
      description: 'O relatório foi exportado para PDF.'
    });
  };

  const filteredLogs = useMemo(() => {
    return historyLogs.filter(log => {
      const matchesSearch = 
        log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entityId.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAction = actionFilter === 'all' || log.actionType === actionFilter;
      
      // Filter by date range
      const logDate = new Date(log.createdAt);
      const now = new Date();
      const daysAgo = new Date(now.getTime() - parseInt(dateRange) * 24 * 60 * 60 * 1000);
      const matchesDate = logDate >= daysAgo;
      
      return matchesSearch && matchesAction && matchesDate;
    });
  }, [historyLogs, searchTerm, actionFilter, dateRange]);

  const filteredQuotes = quotes.filter(q => {
    if (!quoteSearchTerm) return true;
    const searchLower = quoteSearchTerm.toLowerCase();
    return (
      q.title?.toLowerCase().includes(searchLower) ||
      q.local_code?.toLowerCase().includes(searchLower) ||
      q.clients_condos?.name?.toLowerCase().includes(searchLower)
    );
  });

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'product_created':
      case 'product_updated':
      case 'product_deleted':
        return <Package className="h-4 w-4" />;
      case 'quote_responded':
      case 'quote_viewed':
        return <FileText className="h-4 w-4" />;
      case 'payment_received':
        return <CreditCard className="h-4 w-4" />;
      case 'profile_updated':
      case 'settings_changed':
        return <Settings className="h-4 w-4" />;
      case 'client_interaction':
        return <Users className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActionBadge = (actionType: string) => {
    switch (actionType) {
      case 'product_created':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Produto Criado</Badge>;
      case 'product_updated':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Produto Atualizado</Badge>;
      case 'product_deleted':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Produto Excluído</Badge>;
      case 'quote_responded':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Proposta Enviada</Badge>;
      case 'quote_viewed':
        return <Badge variant="secondary">Cotação Visualizada</Badge>;
      case 'payment_received':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Pagamento Recebido</Badge>;
      case 'profile_updated':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Perfil Atualizado</Badge>;
      case 'settings_changed':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Configurações</Badge>;
      case 'client_interaction':
        return <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">Interação Cliente</Badge>;
      default:
        return <Badge variant="outline">{actionType}</Badge>;
    }
  };

  const handleExport = () => {
    exportHistory('csv');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Histórico & Timeline</h1>
          <p className="text-muted-foreground">
            Acompanhe suas atividades e a jornada das cotações
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="timeline">Timeline de Cotações</TabsTrigger>
          <TabsTrigger value="activities">Histórico de Atividades</TabsTrigger>
        </TabsList>

        {/* Aba: Visão Geral */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total de Ações</p>
                    <p className="text-2xl font-bold">{historyLogs.length}</p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Cotações Respondidas</p>
                    <p className="text-2xl font-bold">
                      {historyLogs.filter(log => log.actionType === 'quote_responded').length}
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Esta Semana</p>
                    <p className="text-2xl font-bold">
                      {historyLogs.filter(log => {
                        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                        return new Date(log.createdAt) >= weekAgo;
                      }).length}
                    </p>
                  </div>
                  <History className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Produtos Atualizados</p>
                    <p className="text-2xl font-bold">
                      {historyLogs.filter(log => log.actionType === 'product_updated').length}
                    </p>
                  </div>
                  <Package className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Aba: Timeline de Cotações */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Timeline de Cotações</CardTitle>
                  <CardDescription>
                    Visualize todos os eventos das suas cotações e exporte para PDF
                  </CardDescription>
                </div>
                <Button onClick={handleExportPDF} disabled={!selectedQuoteId || !events.length}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Filtros */}
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Período</label>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Últimos 7 dias</SelectItem>
                      <SelectItem value="30">Últimos 30 dias</SelectItem>
                      <SelectItem value="60">Últimos 60 dias</SelectItem>
                      <SelectItem value="90">Últimos 90 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="sent">Enviado</SelectItem>
                      <SelectItem value="under_review">Em Análise</SelectItem>
                      <SelectItem value="approved">Aprovado</SelectItem>
                      <SelectItem value="rejected">Rejeitado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Buscar</label>
                  <Input 
                    placeholder="Buscar por título, código ou cliente..." 
                    value={quoteSearchTerm}
                    onChange={(e) => setQuoteSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Lista de Cotações */}
              <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
                {loadingQuotes ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Carregando cotações...
                  </div>
                ) : filteredQuotes.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma cotação encontrada</p>
                  </div>
                ) : (
                  filteredQuotes.map((quote) => (
                    <button
                      key={quote.id}
                      onClick={() => setSelectedQuoteId(quote.id)}
                      className={`w-full p-4 text-left hover:bg-accent transition-colors ${
                        selectedQuoteId === quote.id ? 'bg-accent' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{formatQuoteCode(quote)}</span>
                            <Badge variant="outline">{quote.status}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{quote.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {quote.clients_condos?.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            R$ {(quote.total_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Timeline */}
              {selectedQuoteId && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Timeline da Cotação</h3>
                  {timelineLoading ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Clock className="w-12 h-12 mx-auto mb-4 animate-spin opacity-50" />
                      <p>Carregando timeline...</p>
                    </div>
                  ) : (
                    <QuoteJourneyTimeline events={events} />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba: Histórico de Atividades */}
        <TabsContent value="activities" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={handleExport} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar Histórico
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar por descrição ou ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Tipo de Ação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Ações</SelectItem>
                    <SelectItem value="product_created">Produto Criado</SelectItem>
                    <SelectItem value="product_updated">Produto Atualizado</SelectItem>
                    <SelectItem value="product_deleted">Produto Excluído</SelectItem>
                    <SelectItem value="quote_responded">Proposta Enviada</SelectItem>
                    <SelectItem value="quote_viewed">Cotação Visualizada</SelectItem>
                    <SelectItem value="payment_received">Pagamento Recebido</SelectItem>
                    <SelectItem value="profile_updated">Perfil Atualizado</SelectItem>
                    <SelectItem value="settings_changed">Configurações</SelectItem>
                    <SelectItem value="client_interaction">Interação Cliente</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="90">90 dias</SelectItem>
                    <SelectItem value="365">1 ano</SelectItem>
                    <SelectItem value="all">Tudo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* History Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Atividades ({filteredLogs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Entidade</TableHead>
                      <TableHead>Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {new Date(log.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {new Date(log.createdAt).toLocaleTimeString('pt-BR', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getActionIcon(log.actionType)}
                            {getActionBadge(log.actionType)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="max-w-md">{log.description}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-mono text-sm">{log.entityId}</span>
                            <span className="text-sm text-muted-foreground">{log.entityType}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.details && Object.keys(log.details).length > 0 && (
                            <Button variant="ghost" size="sm">
                              Ver Detalhes
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {filteredLogs.length === 0 && (
                  <div className="text-center py-8">
                    <History className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground mt-2">
                      Nenhuma atividade encontrada
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
