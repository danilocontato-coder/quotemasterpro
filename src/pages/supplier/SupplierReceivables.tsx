import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FileText, TrendingUp, Clock, CreditCard, Search, Filter, Eye, CheckCircle, DollarSign, Info, RefreshCw } from 'lucide-react';
import { useSupplierReceivables, SupplierReceivable } from '@/hooks/useSupplierReceivables';
import { OfflinePaymentSupplierView } from '@/components/payments/OfflinePaymentSupplierView';
import { useSupplierBalance } from '@/hooks/useSupplierBalance';
import { usePlatformCommission } from '@/hooks/usePlatformCommission';

export default function SupplierReceivables() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<SupplierReceivable | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const itemsPerPage = 10;

  const { 
    receivables, 
    metrics, 
    isLoading, 
    getStatusText, 
    getStatusColor,
    refreshReceivables
  } = useSupplierReceivables();

  const { balance, isLoading: isLoadingBalance, fetchBalance } = useSupplierBalance();
  const { percentage: commissionPercentage, isPromoMode } = usePlatformCommission();

  // Carregar saldo ao montar componente
  useEffect(() => {
    fetchBalance();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'in_escrow') {
      return (
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-500 text-white">
            💰 {getStatusText(status)}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Aguardando entrega
          </span>
        </div>
      );
    }
    
    if (status === 'completed') {
      return (
        <div className="flex items-center gap-2">
          <Badge className="bg-green-500 text-white">
            ✅ {getStatusText(status)}
          </Badge>
          <span className="text-xs text-green-600 font-medium">
            Transferido
          </span>
        </div>
      );
    }
    
    return (
      <Badge className={`${getStatusColor(status)} text-white`}>
        {getStatusText(status)}
      </Badge>
    );
  };

  const filteredReceivables = receivables.filter(receivable => {
    const matchesSearch = !searchTerm || 
      receivable.quote_local_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receivable.quote_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receivable.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receivable.quote_title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || receivable.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentReceivables = filteredReceivables.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredReceivables.length / itemsPerPage);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Recebimentos</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contas a Receber</h1>
          <p className="text-muted-foreground">Acompanhe seus pagamentos e saldos</p>
        </div>
      </div>

      {/* Card de Saldo Simplificado */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              Resumo de Recebimentos
            </span>
            <Button onClick={fetchBalance} variant="ghost" size="sm" disabled={isLoadingBalance}>
              <RefreshCw className={`h-4 w-4 ${isLoadingBalance ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingBalance ? (
            <div className="animate-pulse space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                </div>
                <div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 cursor-help">
                        <p className="text-sm text-muted-foreground mb-1">🔒 Em Custódia</p>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">Valor aguardando confirmação de entrega. Será transferido automaticamente para sua conta bancária após confirmação.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(balance?.inEscrow || 0)}
                </p>
                <p className="text-xs text-blue-600 font-medium">
                  Aguardando entrega
                </p>
              </div>
              <div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 cursor-help">
                        <p className="text-sm text-muted-foreground mb-1">✅ Transferido este Mês</p>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">Valor já transferido via PIX/TED para sua conta bancária neste mês após confirmação de entregas.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(balance?.transferredThisMonth || 0)}
                </p>
                <p className="text-xs text-green-600 font-medium">
                  Já na sua conta
                </p>
              </div>
            </div>
          )}
          <div className="mt-4 bg-blue-100 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>💡 Como funciona:</strong> Quando a entrega for confirmada, transferiremos automaticamente o valor líquido 
              {isPromoMode 
                ? ' (sem cobrança de comissão - modo promocional)' 
                : ` (menos ${commissionPercentage}% de comissão)`
              } para sua conta bancária via PIX ou TED.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Métricas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalReceived)}</div>
            <p className="text-xs text-muted-foreground">
              Em {metrics.totalTransactions} transação(ões)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.pendingAmount)}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando recebimento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Este Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.thisMonthReceived)}</div>
            <p className="text-xs text-muted-foreground">
              Recebido em {new Date().toLocaleString('pt-BR', { month: 'long' })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.averageTicket)}</div>
            <p className="text-xs text-muted-foreground">
              Por transação
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="receivables" className="w-full">
        <TabsList>
          <TabsTrigger value="receivables">Recebimentos</TabsTrigger>
        </TabsList>

        <TabsContent value="receivables" className="space-y-4">
          {/* Resumo Financeiro Detalhado */}
          <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Resumo Financeiro das Vendas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">💰 Total Bruto</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(receivables.reduce((sum, r) => sum + (r.base_amount || r.amount), 0))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Valor das vendas
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      📊 Comissão {isPromoMode ? '(Grátis!)' : `(${commissionPercentage}%)`}
                    </p>
                    <p className={`text-2xl font-bold ${isPromoMode ? 'text-green-600' : 'text-red-600'}`}>
                      {isPromoMode ? 'R$ 0,00' : `-${formatCurrency(receivables.reduce((sum, r) => {
                        const commission = r.platform_commission || 
                          (r.base_amount || r.amount) * (commissionPercentage / 100);
                        return sum + commission;
                      }, 0))}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isPromoMode ? 'Modo promocional' : 'Plataforma'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">✅ Valor Líquido</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(receivables.reduce((sum, r) => {
                        if (r.supplier_net_amount) {
                          return sum + r.supplier_net_amount;
                        }
                        const baseAmount = r.base_amount || r.amount;
                        const commission = baseAmount * (commissionPercentage / 100);
                        return sum + (baseAmount - commission);
                      }, 0))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Você recebe
                    </p>
                  </div>
                </div>

                <div className="bg-blue-100 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Como funciona:</strong> {isPromoMode 
                      ? 'Você recebe 100% do valor da venda - sem comissão! Modo promocional ativo.' 
                      : `A comissão de ${commissionPercentage}% é descontada automaticamente. Quando a entrega for confirmada, você recebe o valor líquido diretamente na sua conta bancária.`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cotação, cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="in_escrow">Em Custódia</SelectItem>
                <SelectItem value="completed">Transferido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabela de Recebimentos */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cotação</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Valor Base</TableHead>
                    <TableHead>Comissão</TableHead>
                    <TableHead>Valor Líquido</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentReceivables.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Nenhum recebimento encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentReceivables.map((receivable) => (
                      <TableRow key={receivable.id}>
                        <TableCell className="font-medium">
                          {receivable.quote_local_code || receivable.quote_id.substring(0, 8)}
                        </TableCell>
                        <TableCell>{receivable.client_name || 'N/A'}</TableCell>
                        <TableCell>{formatCurrency(receivable.base_amount || receivable.amount)}</TableCell>
                        <TableCell className={isPromoMode ? 'text-green-600' : 'text-red-600'}>
                          {isPromoMode 
                            ? 'R$ 0,00' 
                            : `-${formatCurrency(receivable.platform_commission || (receivable.base_amount || receivable.amount) * (commissionPercentage / 100))}`
                          }
                        </TableCell>
                        <TableCell className="font-bold text-green-600">
                          {formatCurrency(receivable.supplier_net_amount || 
                            ((receivable.base_amount || receivable.amount) * (1 - commissionPercentage / 100))
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(receivable.status)}</TableCell>
                        <TableCell>
                          {new Date(receivable.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedPayment(receivable);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1} a {Math.min(endIndex, filteredReceivables.length)} de {filteredReceivables.length} resultados
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <span className="flex items-center px-3 text-sm">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de Detalhes */}
      {selectedPayment && (
        <OfflinePaymentSupplierView
          payment={selectedPayment}
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setSelectedPayment(null);
          }}
          onConfirm={() => {
            setIsDialogOpen(false);
            setSelectedPayment(null);
            refreshReceivables();
          }}
        />
      )}
    </div>
  );
}
