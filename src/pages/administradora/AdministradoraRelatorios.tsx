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
  Users, 
  DollarSign, 
  Calendar,
  Filter,
  Clock,
  Package,
  CheckCircle2
} from 'lucide-react';
import { useQuoteTimeline } from '@/hooks/useQuoteTimeline';
import { QuoteJourneyTimeline } from '@/components/quotes/QuoteJourneyTimeline';
import { exportQuoteTimelineToPDF } from '@/utils/exportQuoteTimeline';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatQuoteCode } from '@/utils/formatQuoteCode';
import { useToast } from '@/hooks/use-toast';

export default function AdministradoraRelatorios() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [dateFilter, setDateFilter] = useState<string>('30');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { events, loading: timelineLoading } = useQuoteTimeline(selectedQuoteId);

  // Carregar cotações para seleção
  const loadQuotes = async () => {
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
          clients_condos!inner (
            id,
            name
          )
        `)
        .gte('created_at', dateLimit.toISOString())
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setQuotes(data || []);
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

  // Carregar cotações ao montar e quando filtros mudarem
  useEffect(() => {
    loadQuotes();
  }, [dateFilter, statusFilter]);

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
      q.local_code?.toLowerCase().includes(searchLower) ||
      q.clients_condos?.name?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios & Prestação de Contas</h1>
          <p className="text-muted-foreground">
            Acompanhe a jornada completa das cotações e exporte relatórios
          </p>
        </div>
      </div>

      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="timeline">Timeline de Cotações</TabsTrigger>
          <TabsTrigger value="suppliers">Por Fornecedor</TabsTrigger>
        </TabsList>

        {/* Aba: Visão Geral */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cotações</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{quotes.length}</div>
                <p className="text-xs text-muted-foreground">nos últimos {dateFilter} dias</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R$ {quotes.reduce((sum, q) => sum + (q.total || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">em cotações ativas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aprovadas</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {quotes.filter(q => q.status === 'approved').length}
                </div>
                <p className="text-xs text-muted-foreground">cotações aprovadas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {quotes.filter(q => ['sent', 'under_review'].includes(q.status)).length}
                </div>
                <p className="text-xs text-muted-foreground">aguardando análise</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Gráfico de Tendências</CardTitle>
              <CardDescription>Evolução das cotações ao longo do tempo</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Gráficos de tendência disponíveis em breve</p>
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
                  <CardTitle>Prestação de Contas - Jornada da Cotação</CardTitle>
                  <CardDescription>
                    Visualize todos os eventos de uma cotação e exporte para PDF
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
                  <Select value={dateFilter} onValueChange={(v) => { setDateFilter(v); loadQuotes(); }}>
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
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); loadQuotes(); }}>
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
                    placeholder="Buscar por título, código ou condomínio..." 
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
                          <p className="text-xs text-muted-foreground mt-1">
                            {quote.clients_condos?.name}
                          </p>
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

        {/* Aba: Por Fornecedor */}
        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Análise por Fornecedor</CardTitle>
              <CardDescription>Rankings e performance dos fornecedores</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Análise de fornecedores disponível em breve</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
