import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Download, 
  TrendingUp, 
  DollarSign, 
  Clock,
  CheckCircle2,
  XCircle,
  BarChart3,
  Users
} from 'lucide-react';
import { useQuoteTimeline } from '@/hooks/useQuoteTimeline';
import { QuoteJourneyTimeline } from '@/components/quotes/QuoteJourneyTimeline';
import { exportQuoteTimelineToPDF } from '@/utils/exportQuoteTimeline';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatQuoteCode } from '@/utils/formatQuoteCode';
import { useToast } from '@/hooks/use-toast';
import { ModuleGuard } from '@/components/common/ModuleGuard';
import { useNavigate } from 'react-router-dom';
import { useOptimizedLogs } from '@/hooks/useOptimizedLogs';
import { measure } from '@/utils/systemLogger';

export default function ClientReports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { logThrottled } = useOptimizedLogs();
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);

  // Log de diagnóstico
  useEffect(() => {
    console.log('🎯 [ClientReports] Componente montado', {
      user: user?.id,
      clientId: user?.clientId,
      path: window.location.pathname
    });
  }, [user?.id, user?.clientId]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [dateFilter, setDateFilter] = useState<string>('30');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { events, loading: timelineLoading } = useQuoteTimeline(selectedQuoteId);

  // Carregar cotações do cliente
  const loadQuotes = async () => {
    if (!user?.clientId) return;
    
    const operationStart = performance.now();
    
    logThrottled('REPORTS-LOAD-START', {
      clientId: user.clientId,
      dateFilter,
      statusFilter,
      timestamp: new Date().toISOString()
    });
    
    setLoadingQuotes(true);
    try {
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - parseInt(dateFilter));

      let query = supabase
        .from('quotes')
        .select(`
          id,
          local_code,
          title,
          total,
          status,
          created_at,
          deadline,
          clients!quotes_client_id_fkey (
            id,
            name
          )
        `)
        .eq('client_id', user.clientId)
        .gte('created_at', dateLimit.toISOString())
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Normalizar dados (defensivo para payloads legados)
      const normalizedData = (data || []).map(q => ({
        ...q,
        total: typeof q.total === 'number' ? q.total : 0
      }));

      setQuotes(normalizedData);
      
      const operationDuration = performance.now() - operationStart;
      
      const statusDistribution = normalizedData.reduce((acc, q) => {
        acc[q.status] = (acc[q.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      logThrottled('REPORTS-LOAD-SUCCESS', {
        clientId: user.clientId,
        count: normalizedData.length,
        duration: `${operationDuration.toFixed(0)}ms`,
        statusDistribution,
        timestamp: new Date().toISOString()
      });
      
      if (operationDuration > 2000) {
        console.warn(`⚠️ [PERFORMANCE] loadQuotes took ${operationDuration.toFixed(0)}ms`);
      }
    } catch (error: any) {
      const operationDuration = performance.now() - operationStart;
      
      console.error('Error loading quotes:', error);
      logThrottled('REPORTS-LOAD-ERROR', {
        clientId: user.clientId,
        error: {
          message: error?.message,
          code: error?.code,
          hint: error?.hint,
          details: error?.details
        },
        duration: `${operationDuration.toFixed(0)}ms`,
        timestamp: new Date().toISOString()
      });
      
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
  }, [dateFilter, statusFilter, user?.clientId]);

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
      clientName: selectedQuote.clients?.name || 'N/A',
      total: selectedQuote.total || 0
    });

    toast({
      title: 'PDF gerado com sucesso',
      description: 'O relatório foi exportado para PDF.'
    });
  };

  const filteredQuotes = quotes.filter(q => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      q.title?.toLowerCase().includes(searchLower) ||
      q.local_code?.toLowerCase().includes(searchLower)
    );
  });

  // Calcular estatísticas
  const totalSpent = quotes.reduce((sum, q) => sum + (q.total || 0), 0);
  const approvedQuotes = quotes.filter(q => q.status === 'approved').length;
  const rejectedQuotes = quotes.filter(q => q.status === 'rejected').length;
  const pendingQuotes = quotes.filter(q => ['sent', 'under_review'].includes(q.status)).length;

  return (
    <ModuleGuard 
      requiredModule="advanced_reports" 
      showUpgradePrompt={true}
    >
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Relatórios & Prestação de Contas</h1>
            <p className="text-muted-foreground">
              Acompanhe suas cotações, gastos e performance
            </p>
          </div>
        </div>

        <Tabs defaultValue="timeline" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="timeline">Timeline de Cotações</TabsTrigger>
            <TabsTrigger value="performance">Análise de Performance</TabsTrigger>
          </TabsList>

          {/* Aba: Visão Geral */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Cotações</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{quotes.length}</div>
                  <p className="text-xs text-muted-foreground">nos últimos {dateFilter} dias</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Gastos Totais</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground">em cotações aprovadas</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Taxa de Aprovação</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {quotes.length > 0 ? Math.round((approvedQuotes / quotes.length) * 100) : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">{approvedQuotes} aprovadas</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pendingQuotes}</div>
                  <p className="text-xs text-muted-foreground">aguardando análise</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Resumo de Status</CardTitle>
                <CardDescription>Distribuição das suas cotações por status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Aprovadas</p>
                        <p className="text-2xl font-bold">{approvedQuotes}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Clock className="h-8 w-8 text-yellow-600" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
                        <p className="text-2xl font-bold">{pendingQuotes}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <XCircle className="h-8 w-8 text-red-600" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Rejeitadas</p>
                        <p className="text-2xl font-bold">{rejectedQuotes}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
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
                      placeholder="Buscar por título ou código..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
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
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              R$ {(quote.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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

          {/* Aba: Análise de Performance */}
          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Análise de Performance</CardTitle>
                <CardDescription>Métricas e tendências das suas cotações</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Gráficos de análise disponíveis em breve</p>
                  <p className="text-sm mt-2">Tempo médio de aprovação, economia gerada, etc.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ModuleGuard>
  );
}
