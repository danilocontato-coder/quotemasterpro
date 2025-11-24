import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { FilterMetricCard } from "@/components/ui/filter-metric-card";
import { 
  Eye, 
  Send, 
  MessageSquare, 
  Search, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  FileCheck,
  Package,
  CreditCard,
  Calendar,
  Truck,
  Filter,
  Sparkles
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { QuoteCompetitiveContext } from "@/components/supplier/QuoteCompetitiveContext";
import { QuoteUrgencyBadge } from "@/components/supplier/QuoteUrgencyBadge";
import { QuoteInfoTooltip } from "@/components/supplier/QuoteInfoTooltip";
import { useSupabaseSupplierQuotes } from "@/hooks/useSupabaseSupplierQuotes";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SupplierQuoteViewModal } from "@/components/supplier/SupplierQuoteViewModal";
import { ScheduleDeliveryModal } from "@/components/supplier/ScheduleDeliveryModal";
import { IssueInvoiceModal } from "@/components/supplier/IssueInvoiceModal";
import { usePendingDeliveries } from "@/hooks/usePendingDeliveries";
import { useQuoteViews } from "@/hooks/useQuoteViews";

export default function SupplierQuotes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [competitiveFilter, setCompetitiveFilter] = useState("all");
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isIssueInvoiceModalOpen, setIsIssueInvoiceModalOpen] = useState(false);
  const [quotesWithDeliveries, setQuotesWithDeliveries] = useState<Set<string>>(new Set());
  const [invoiceModalData, setInvoiceModalData] = useState<{
    clientData?: {
      name: string;
      cnpj: string;
      email: string;
      phone?: string;
      address?: string;
    };
    quoteItems?: Array<{
      product_name: string;
      quantity: number;
      unit_price: number;
      total: number;
    }>;
    quoteTotal?: number;
    freightCost?: number;
  }>({});
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const { user, isLoading: isAuthLoading } = useAuth();
  const { supplierQuotes, isLoading } = useSupabaseSupplierQuotes();
  const { pendingDeliveries } = usePendingDeliveries();
  
  // 🆕 Hook para rastrear visualizações
  const { isViewed, markAsViewed, getNewQuotesCount } = useQuoteViews(
    supplierQuotes.map(q => q.id)
  );
  
  // Criar um Set de quote_ids que estão pendentes de agendamento
  const pendingDeliveryQuoteIds = useMemo(() => 
    new Set(pendingDeliveries.map(pd => pd.quote_id)),
    [pendingDeliveries]
  );

  // Verificar quais cotações já têm entrega agendada
  useEffect(() => {
    const checkDeliveries = async () => {
      if (!user || !supplierQuotes.length) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('supplier_id')
        .eq('id', user.id)
        .single();

      if (!profile?.supplier_id) return;

      const { data: deliveries } = await supabase
        .from('deliveries')
        .select('quote_id')
        .eq('supplier_id', profile.supplier_id);

      if (deliveries) {
        setQuotesWithDeliveries(new Set(deliveries.map(d => d.quote_id)));
      }
    };

    checkDeliveries();
  }, [user, supplierQuotes]);

  // Helper para obter iniciais do cliente
  const getClientInitials = (clientName: string) => {
    return clientName
      .split(' ')
      .slice(0, 2)
      .map(word => word[0])
      .join('')
      .toUpperCase();
  };

  // Early return if auth is still loading or user is not available
  if (isAuthLoading || !user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Minhas Cotações</h1>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string, responseStatus?: string) => {
    // Se houver uma resposta aprovada, mostrar isso em destaque
    if (responseStatus === 'approved') {
      return <Badge className="bg-green-600 text-white">✅ Proposta Aprovada</Badge>;
    }
    
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Aguardando Proposta</Badge>;
      case 'awaiting_visit':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-700">Aguardando Visita</Badge>;
      case 'visit_partial_scheduled':
        return <Badge variant="default" className="bg-amber-100 text-amber-700">Visitas Parciais Agendadas</Badge>;
      case 'visit_scheduled':
        return <Badge variant="default" className="bg-blue-100 text-blue-700">Visitas Agendadas</Badge>;
      case 'visit_partial_confirmed':
        return <Badge variant="default" className="bg-sky-100 text-sky-700">Visitas Parciais Confirmadas</Badge>;
      case 'visit_confirmed':
        return <Badge variant="default" className="bg-green-100 text-green-700">Visitas Confirmadas</Badge>;
      case 'visit_overdue':
        return <Badge variant="destructive">Visita Atrasada</Badge>;
      case 'proposal_sent':
        return <Badge variant="default">Proposta Enviada</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Aprovada</Badge>;
      case 'paid':
        return <Badge variant="default" className="bg-blue-600 text-white">💰 Pagamento Confirmado</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Reprovada</Badge>;
      case 'expired':
        return <Badge variant="outline" className="text-orange-600 border-orange-600">Expirado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredQuotes = useMemo(() => {
    return supplierQuotes.filter(quote => {
      const matchesSearch = 
        quote.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (quote.local_code && quote.local_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        quote.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      // 🆕 Filtro de status + novas cotações
      let matchesStatus = true;
      if (statusFilter === 'new') {
        matchesStatus = !isViewed(quote.id);
      } else if (statusFilter !== 'all') {
        matchesStatus = quote.status === statusFilter;
      }
      
      // Filtro de urgência
      let matchesUrgency = true;
      if (urgencyFilter !== 'all') {
        const now = new Date();
        const deadline = new Date(quote.deadline);
        const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        if (urgencyFilter === 'urgent') {
          matchesUrgency = hoursRemaining > 0 && hoursRemaining <= 24;
        } else if (urgencyFilter === 'soon') {
          matchesUrgency = hoursRemaining > 24 && hoursRemaining <= 72;
        } else if (urgencyFilter === 'normal') {
          matchesUrgency = hoursRemaining > 72;
        } else if (urgencyFilter === 'expired') {
          matchesUrgency = hoursRemaining < 0;
        }
      }
      
      // Filtro de competitividade
      let matchesCompetitive = true;
      if (competitiveFilter !== 'all') {
        const supplierCount = quote.supplierCount || 1;
        if (competitiveFilter === 'exclusive') {
          matchesCompetitive = supplierCount === 1;
        } else if (competitiveFilter === 'low') {
          matchesCompetitive = supplierCount >= 2 && supplierCount <= 3;
        } else if (competitiveFilter === 'high') {
          matchesCompetitive = supplierCount >= 5;
        }
      }
      
      return matchesSearch && matchesStatus && matchesUrgency && matchesCompetitive;
    });
  }, [supplierQuotes, searchTerm, statusFilter, urgencyFilter, competitiveFilter, isViewed]);

  const statusCounts = useMemo(() => {
    return supplierQuotes.reduce((acc, quote) => {
      acc[quote.status] = (acc[quote.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [supplierQuotes]);

  // Pagination logic
  const totalPages = Math.ceil(filteredQuotes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentQuotes = filteredQuotes.slice(startIndex, endIndex);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, urgencyFilter, competitiveFilter]);

  const handleViewQuote = (quote: any) => {
    setSelectedQuote(quote);
    setIsViewModalOpen(true);
    markAsViewed(quote.id); // 🆕 Marcar como visualizada
  };

  const handleSendProposal = (quote: any) => {
    setSelectedQuote(quote);
    setIsViewModalOpen(true);
  };

  const handleRefetch = () => {
    // Callback para atualizar dados após ações
    window.location.reload();
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Minhas Cotações
          {getNewQuotesCount() > 0 && (
            <Badge variant="destructive" className="ml-3 animate-pulse">
              {getNewQuotesCount()} Novas
            </Badge>
          )}
        </h1>
        <p className="text-muted-foreground">
          Gerencie suas solicitações de cotação e propostas
        </p>
      </div>

      {/* Status Overview Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <FilterMetricCard
          title="Todos"
          value={supplierQuotes.length}
          icon={<FileText />}
          isActive={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        />
        <FilterMetricCard
          title="Novas"
          value={getNewQuotesCount()}
          icon={<Sparkles />}
          isActive={statusFilter === 'new'}
          onClick={() => setStatusFilter('new')}
          variant="destructive"
        />
        <FilterMetricCard
          title="Aguardando"
          value={statusCounts.pending || 0}
          icon={<Clock />}
          isActive={statusFilter === 'pending'}
          onClick={() => setStatusFilter('pending')}
          variant="warning"
        />
        <FilterMetricCard
          title="Proposta Enviada"
          value={statusCounts.proposal_sent || 0}
          icon={<Send />}
          isActive={statusFilter === 'proposal_sent'}
          onClick={() => setStatusFilter('proposal_sent')}
        />
        <FilterMetricCard
          title="Aprovadas"
          value={statusCounts.approved || 0}
          icon={<CheckCircle />}
          isActive={statusFilter === 'approved'}
          onClick={() => setStatusFilter('approved')}
          variant="success"
        />
        <FilterMetricCard
          title="Reprovadas"
          value={statusCounts.rejected || 0}
          icon={<XCircle />}
          isActive={statusFilter === 'rejected'}
          onClick={() => setStatusFilter('rejected')}
          variant="destructive"
        />
      </div>
      )}

      {/* Search and Filters */}
      <Card className="card-corporate">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por título, cliente, código ou ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 por página</SelectItem>
                  <SelectItem value="10">10 por página</SelectItem>
                  <SelectItem value="25">25 por página</SelectItem>
                  <SelectItem value="50">50 por página</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Filtros Inteligentes */}
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Filtros:</span>
              </div>
              
              {/* Filtro de Urgência */}
              <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Urgência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas urgências</SelectItem>
                  <SelectItem value="urgent">🔴 Urgente (&lt;24h)</SelectItem>
                  <SelectItem value="soon">🟡 Em breve (1-3d)</SelectItem>
                  <SelectItem value="normal">🟢 Normal (&gt;3d)</SelectItem>
                  <SelectItem value="expired">⏰ Expiradas</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Filtro de Competitividade */}
              <Select value={competitiveFilter} onValueChange={setCompetitiveFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Concorrência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="exclusive">⭐ Exclusivas</SelectItem>
                  <SelectItem value="low">👥 Baixa (2-3)</SelectItem>
                  <SelectItem value="high">⚠️ Alta (5+)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quotes Table */}
      <Card className="card-corporate">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Cotações ({filteredQuotes.length})
            <span className="text-sm font-normal text-muted-foreground ml-2">
              Página {currentPage} de {totalPages}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {!user?.supplierId 
                  ? "Configurando dados do fornecedor..." 
                  : "Nenhuma cotação encontrada"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[280px]">Código & Cliente</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Concorrência</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Urgência</TableHead>
                  <TableHead>Valor Estimado</TableHead>
                  <TableHead>Visita</TableHead>
                  <TableHead className="text-center">Info</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentQuotes.map((quote) => (
                  <TableRow 
                    key={quote.id}
                    className={!isViewed(quote.id) ? 'bg-blue-50/50 hover:bg-blue-50 dark:bg-blue-950/20 dark:hover:bg-blue-950/30' : ''}
                  >
                    {/* Coluna: Código + Cliente com Avatar */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border-2 border-primary/20">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                            {getClientInitials(quote.clientName || quote.client)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-foreground">
                              {quote.local_code || quote.id.slice(0, 8)}
                            </span>
                            {!isViewed(quote.id) && (
                              <Badge variant="destructive" className="text-xs animate-pulse">
                                Novo
                              </Badge>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs w-fit">
                            {quote.clientName || quote.client}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    
                    {/* Coluna: Título */}
                    <TableCell>
                      <div>
                        <p className="font-medium">{quote.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">{quote.description}</p>
                      </div>
                    </TableCell>
                    
                    {/* Coluna: Contexto Competitivo */}
                    <TableCell>
                      <QuoteCompetitiveContext 
                        supplierCount={quote.supplierCount || 1}
                        isExclusive={quote.supplierCount === 1}
                      />
                    </TableCell>
                    
                    {/* Coluna: Status */}
                    <TableCell>{getStatusBadge(quote.status, quote.proposal?.status)}</TableCell>
                    
                    {/* Coluna: Urgência (Prazo) */}
                    <TableCell>
                      <QuoteUrgencyBadge deadline={quote.deadline} />
                    </TableCell>
                    
                    {/* Coluna: Valor Estimado */}
                    <TableCell>
                      {quote.estimatedValue ? (
                        <span className="font-medium text-green-600">
                          R$ {quote.estimatedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    
                    {/* Coluna: Visita */}
                    <TableCell>
                      {quote.requires_visit ? (
                        <Badge 
                          variant={
                            quote.status === 'awaiting_visit' ? 'destructive' : 
                            quote.status === 'visit_scheduled' ? 'secondary' :
                            quote.status === 'visit_confirmed' ? 'default' : 
                            'outline'
                          }
                          className={
                            quote.status === 'awaiting_visit' ? 'bg-orange-100 text-orange-700 border-orange-300' :
                            quote.status === 'visit_scheduled' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                            quote.status === 'visit_confirmed' ? 'bg-green-100 text-green-700 border-green-300' :
                            'bg-gray-100 text-gray-600'
                          }
                        >
                          <Calendar className="h-3 w-3 mr-1" />
                          {quote.status === 'awaiting_visit' ? '⏳ Agendar' :
                           quote.status === 'visit_scheduled' ? '📅 Agendada' :
                           quote.status === 'visit_confirmed' ? '✅ Confirmada' : 
                           'Requerida'}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    
                    {/* Coluna: Info Tooltip */}
                    <TableCell className="text-center">
                      <QuoteInfoTooltip 
                        itemCount={quote.items?.length || 0}
                        estimatedValue={quote.estimatedValue}
                        createdAt={quote.createdAt}
                        supplierCount={quote.supplierCount || 1}
                      />
                    </TableCell>
                    
                    {/* Coluna: Ações */}
                    <TableCell>
                       <div className="flex items-center gap-2">
                         <Button 
                           variant="ghost" 
                           size="sm" 
                           onClick={() => handleViewQuote(quote)}
                           title="Ver detalhes e proposta"
                         >
                           <Eye className="h-4 w-4" />
                         </Button>
                         
                          {/* Botão Agendar Visita - integrado no modal principal */}
                          {quote.requires_visit && quote.status === 'awaiting_visit' && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleViewQuote(quote)}
                              className="bg-orange-500 hover:bg-orange-600"
                              title="Ver cotação e agendar visita"
                            >
                              <Calendar className="h-4 w-4 mr-1" />
                              Ver & Agendar
                            </Button>
                          )}

                          {/* Botão Emitir Cobrança - quando cotação aprovada */}
                          {quote.status === 'approved' && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={async () => {
                                setSelectedQuote(quote);
                                
                                // Buscar dados completos da cotação
                                const { data: fullQuote } = await supabase
                                  .from('quotes')
                                  .select(`
                                    *,
                                    client:client_id(name, cnpj, email, phone, address),
                                    items:quote_items(product_name, quantity, unit_price, total)
                                  `)
                                  .eq('id', quote.id)
                                  .single();
                                
                                if (fullQuote) {
                                  setInvoiceModalData({
                                    clientData: fullQuote.client as any,
                                    quoteItems: fullQuote.items as any,
                                    quoteTotal: fullQuote.total || 0,
                                    freightCost: fullQuote.freight_cost || 0
                                  });
                                }
                                
                                setIsIssueInvoiceModalOpen(true);
                              }}
                              className="bg-primary hover:bg-primary/90"
                              title="Emitir cobrança para o cliente"
                            >
                              <CreditCard className="h-4 w-4 mr-1" />
                              Emitir Cobrança
                            </Button>
                          )}

                          {/* Botão Confirmar Visita - integrado no modal principal */}
                          {quote.requires_visit && quote.status === 'visit_scheduled' && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleViewQuote(quote)}
                              className="bg-blue-500 hover:bg-blue-600"
                              title="Ver cotação e confirmar visita"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Ver & Confirmar
                            </Button>
                          )}
                         
                         {/* Botão Agendar Entrega - quando pagamento em custódia sem entrega agendada */}
                         {pendingDeliveryQuoteIds.has(quote.id) && !quotesWithDeliveries.has(quote.id) && (
                           <Button
                             variant="default"
                             size="sm"
                             onClick={() => {
                               setSelectedQuote(quote);
                               setIsDeliveryModalOpen(true);
                             }}
                             className="bg-green-600 hover:bg-green-700"
                             title="Agendar entrega"
                           >
                             <Truck className="h-4 w-4 mr-1" />
                             Agendar Entrega
                           </Button>
                         )}
                         
                         {/* Botão Enviar Proposta - SÓ se visita confirmada OU não requer visita */}
                         {((!quote.requires_visit && quote.status === 'pending') || quote.status === 'visit_confirmed') && (
                           <Button 
                             variant="ghost" 
                             size="sm"
                             onClick={() => handleSendProposal(quote)}
                             title="Enviar proposta"
                           >
                             <Send className="h-4 w-4" />
                           </Button>
                         )}
                         
                         {quote.status === 'paid' && (
                           <Button 
                             variant="ghost" 
                             size="sm"
                             onClick={() => {
                               setSelectedQuote(quote);
                               setIsDeliveryModalOpen(true);
                             }}
                             title="Agendar entrega"
                             className="text-blue-600 hover:text-blue-700"
                           >
                             <Package className="h-4 w-4" />
                           </Button>
                         )}
                         
                           {/* Botão de Mensagens integrado no modal principal */}
                           <Button 
                             variant="ghost" 
                             size="sm" 
                             title="Ver cotação completa"
                             onClick={() => handleViewQuote(quote)}
                           >
                             <MessageSquare className="h-4 w-4" />
                           </Button>
                       </div>
                     </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredQuotes.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhuma cotação encontrada</p>
              </div>
            )}
            </div>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      if (totalPages <= 7) return true;
                      if (page === 1 || page === totalPages) return true;
                      if (page >= currentPage - 1 && page <= currentPage + 1) return true;
                      return false;
                    })
                    .map((page, index, array) => (
                      <React.Fragment key={page}>
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}
                        <PaginationItem>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      </React.Fragment>
                    ))
                  }
                  
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      <SupplierQuoteViewModal
        quote={selectedQuote}
        open={isViewModalOpen}
        onOpenChange={setIsViewModalOpen}
        onProposalSent={handleRefetch}
      />

      <ScheduleDeliveryModal
        quote={selectedQuote}
        open={isDeliveryModalOpen}
        onOpenChange={setIsDeliveryModalOpen}
        onDeliveryScheduled={handleRefetch}
      />

      <IssueInvoiceModal
        open={isIssueInvoiceModalOpen}
        onOpenChange={setIsIssueInvoiceModalOpen}
        quoteId={selectedQuote?.id || ''}
        quoteTitle={selectedQuote?.title || ''}
        quoteAmount={invoiceModalData.quoteTotal || 0}
        freightCost={invoiceModalData.freightCost || 0}
        clientData={invoiceModalData.clientData}
        quoteItems={invoiceModalData.quoteItems}
      />
    </div>
  );
}