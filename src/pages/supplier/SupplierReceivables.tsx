import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DollarSign, TrendingUp, Clock, CreditCard, Search, Filter, Eye, CheckCircle, Wallet, ArrowDownCircle, RefreshCw, Info } from 'lucide-react';
import { useSupplierReceivables, SupplierReceivable } from '@/hooks/useSupplierReceivables';
import { OfflinePaymentSupplierView } from '@/components/payments/OfflinePaymentSupplierView';
import { useSupplierBalance } from '@/hooks/useSupplierBalance';
import { useSupplierTransfers } from '@/hooks/useSupplierTransfers';
import { RequestTransferDialog } from '@/components/supplier/RequestTransferDialog';
import { useSupplierData } from '@/hooks/useSupplierData';
import { EditBankDataModal } from '@/components/suppliers/EditBankDataModal';
import { calculateCustomerTotal } from '@/lib/asaas-fees';
import { toast } from 'sonner';

export default function SupplierReceivables() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<SupplierReceivable | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [isEditBankModalOpen, setIsEditBankModalOpen] = useState(false);
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
  const { 
    transfers, 
    isLoading: isLoadingTransfers, 
    getStatusText: getTransferStatusText, 
    getStatusColor: getTransferStatusColor 
  } = useSupplierTransfers();
  const { supplierData, refetch: refetchSupplier } = useSupplierData();

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

  const getStatusBadge = (status: string, receivable?: SupplierReceivable) => {
    // Badge especial para escrow
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
    
    // Badge especial para completed mostrando que foi transferido
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="h-8 w-8" />
            Recebimentos
          </h1>
          <p className="text-muted-foreground">
            Acompanhe seus recebimentos e ganhos
          </p>
        </div>
      </div>

      {/* Wallet Asaas - Saldo Disponível */}
      <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-green-600" />
              Wallet Asaas
            </span>
            <Button onClick={fetchBalance} variant="ghost" size="sm" disabled={isLoadingBalance}>
              <RefreshCw className={`h-4 w-4 ${isLoadingBalance ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingBalance ? (
            <div className="animate-pulse space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                </div>
                <div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                </div>
                <div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 cursor-help">
                          <p className="text-sm text-muted-foreground mb-1">💰 Disponível para Saque</p>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">Valor já transferido para sua subconta Asaas e disponível para saque imediato.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(balance?.availableForTransfer || 0)}
                  </p>
                  <p className="text-xs text-green-600 font-medium">
                    Saque agora
                  </p>
                </div>
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
                        <p className="text-xs">Valor retido aguardando confirmação de entrega pelos clientes. Será liberado automaticamente após confirmação.</p>
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
                          <p className="text-sm text-muted-foreground mb-1">📊 Total Projetado</p>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">Soma do disponível + em custódia. É o total que você tem direito a receber.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(balance?.totalProjected || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Disponível + Custódia
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => setIsTransferDialogOpen(true)} 
                className="w-full"
                disabled={(balance?.availableForTransfer || 0) <= 0}
              >
                <ArrowDownCircle className="h-4 w-4 mr-2" />
                Solicitar Transferência
              </Button>
            </>
          )}
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
          <TabsTrigger value="transfers">Transferências</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
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
                {/* Cálculo detalhado */}
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">💰 Total Bruto</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(receivables.reduce((sum, r) => sum + r.amount, 0))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Valor das vendas
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">📊 Comissão (5%)</p>
                    <p className="text-2xl font-bold text-red-600">
                      -{formatCurrency(receivables.reduce((sum, r) => {
                        const commission = r.platform_commission || 
                          (r.base_amount || r.amount) * 0.05;
                        return sum + commission;
                      }, 0))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Plataforma
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">💳 Taxas Asaas</p>
                    <p className="text-2xl font-bold text-red-600">
                      -{formatCurrency(receivables.reduce((sum, r) => {
                        const fee = r.asaas_fee || 1.98;
                        return sum + fee;
                      }, 0))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Processamento
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">✅ Valor Líquido</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(receivables.reduce((sum, r) => {
                        if (r.supplier_net_amount) {
                          return sum + r.supplier_net_amount;
                        }
                        const breakdown = calculateCustomerTotal(r.amount, 'PIX');
                        return sum + breakdown.supplierNet;
                      }, 0))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Você recebe
                    </p>
                  </div>
                </div>

                {/* Alerta informativo */}
                <div className="bg-blue-100 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Como funciona:</strong> A comissão de 5% e as taxas Asaas (processamento + mensageria) são descontadas automaticamente. 
                    Você recebe o valor líquido diretamente na sua Wallet Asaas.
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
                <SelectItem value="pending">Aguardando</SelectItem>
                <SelectItem value="manual_confirmation">Aguardando Confirmação</SelectItem>
                <SelectItem value="in_escrow">Em Garantia</SelectItem>
                <SelectItem value="completed">Recebido</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabela de Recebimentos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Histórico de Recebimentos ({filteredReceivables.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cotação</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Valor Bruto</TableHead>
                        <TableHead>Comissão</TableHead>
                        <TableHead>Valor Líquido</TableHead>
                        <TableHead>Split</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentReceivables.map((receivable) => (
                        <TableRow key={receivable.id}>
                          <TableCell className="font-mono">
                            {receivable.quote_local_code || `#${receivable.quote_id.substring(0, 8)}`}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{receivable.client_name}</div>
                              <div className="text-sm text-muted-foreground">{receivable.quote_title}</div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{formatCurrency(receivable.amount)}</TableCell>
                          <TableCell className="text-red-600">
                            {(() => {
                              const commission = receivable.platform_commission_amount || 
                                (receivable.amount * ((receivable.platform_commission_percentage || 5) / 100));
                              return `-${formatCurrency(commission)}`;
                            })()}
                            <span className="text-xs text-muted-foreground ml-1">
                              ({receivable.platform_commission_percentage || 5}%)
                            </span>
                          </TableCell>
                          <TableCell className="font-semibold text-green-600">
                            <TooltipProvider>
                              <div className="flex items-center gap-1">
                                {(() => {
                                  let netAmount: number;
                                  let baseAmount: number;
                                  let commission: number;
                                  let asaasFee: number;

                                  if (receivable.supplier_net_amount) {
                                    netAmount = receivable.supplier_net_amount;
                                    baseAmount = receivable.base_amount || receivable.amount;
                                    commission = receivable.platform_commission || (baseAmount * 0.05);
                                    asaasFee = receivable.asaas_fee || 1.98;
                                  } else {
                                    const breakdown = calculateCustomerTotal(
                                      receivable.amount,
                                      receivable.payment_method === 'PIX' ? 'PIX' : 
                                      receivable.payment_method === 'BOLETO' ? 'BOLETO' : 
                                      receivable.payment_method === 'CREDIT_CARD' ? 'CREDIT_CARD' : 
                                      'UNDEFINED'
                                    );
                                    netAmount = breakdown.supplierNet;
                                    baseAmount = breakdown.baseAmount;
                                    commission = breakdown.platformCommission;
                                    asaasFee = breakdown.asaasFee;
                                  }

                                  // Verificar se valor está correto (calculado vs armazenado)
                                  const calculatedNet = baseAmount - commission - asaasFee;
                                  const isValidated = receivable.supplier_net_amount && 
                                    Math.abs(receivable.supplier_net_amount - calculatedNet) < 0.01;

                                  return (
                                    <>
                                      <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1">
                                          <span>{formatCurrency(netAmount)}</span>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs">
                                              <div className="text-xs space-y-1">
                                                <div className="flex justify-between gap-4">
                                                  <span>Valor da venda:</span>
                                                  <span className="font-medium">{formatCurrency(baseAmount)}</span>
                                                </div>
                                                <div className="flex justify-between gap-4 text-red-600">
                                                  <span>Comissão (5%):</span>
                                                  <span>-{formatCurrency(commission)}</span>
                                                </div>
                                                <div className="flex justify-between gap-4 text-red-600">
                                                  <span>Taxa Asaas:</span>
                                                  <span>-{formatCurrency(asaasFee)}</span>
                                                </div>
                                                <div className="flex justify-between gap-4 font-bold border-t pt-1 mt-1">
                                                  <span>Você recebe:</span>
                                                  <span className="text-green-600">{formatCurrency(netAmount)}</span>
                                                </div>
                                              </div>
                                            </TooltipContent>
                                          </Tooltip>
                                        </div>
                                        {isValidated && (
                                          <Badge variant="outline" className="text-xs w-fit">
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            Valor Validado
                                          </Badge>
                                        )}
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell>
                            <Badge variant={receivable.split_applied ? "approved" : "draft"}>
                              {receivable.split_applied ? "✓ Aplicado" : "Manual"}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(receivable.status, receivable)}</TableCell>
                          <TableCell>
                            {new Date(receivable.created_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-muted-foreground" />
                              {receivable.payment_method || 'Online'}
                            </div>
                          </TableCell>
                          <TableCell>
                            {receivable.status === 'manual_confirmation' && (
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedPayment(receivable);
                                    setIsDialogOpen(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Ver
                                </Button>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedPayment(receivable);
                                    setIsDialogOpen(true);
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Confirmar
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                </Table>

                {filteredReceivables.length === 0 && !isLoading && (
                  <div className="text-center py-8">
                    <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {searchTerm || statusFilter !== 'all'
                        ? 'Nenhum recebimento encontrado com os filtros aplicados'
                        : 'Nenhum recebimento ainda. Suas vendas aparecerão aqui.'
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {startIndex + 1} a {Math.min(endIndex, filteredReceivables.length)} de {filteredReceivables.length} recebimentos
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Próximo
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers" className="space-y-4">
          {/* Resumo de Saldo */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Disponível para Saque</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(balance?.availableForTransfer || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Pode ser transferido agora
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Em Custódia</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(balance?.inEscrow || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Aguardando confirmação de entrega
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Transferido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    transfers
                      .filter(t => t.status === 'completed')
                      .reduce((sum, t) => sum + t.amount, 0)
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Já sacado para sua conta
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Histórico de Transferências ({transfers.length})</span>
                <Button 
                  onClick={() => setIsTransferDialogOpen(true)} 
                  size="sm"
                  disabled={(balance?.availableForTransfer || 0) <= 0}
                >
                  <ArrowDownCircle className="h-4 w-4 mr-2" />
                  Nova Transferência
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingTransfers ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">Carregando...</p>
                </div>
              ) : transfers.length === 0 ? (
                <div className="text-center py-8">
                  <ArrowDownCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma transferência realizada ainda</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Banco</TableHead>
                      <TableHead>Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfers.map((transfer) => (
                      <TableRow key={transfer.id}>
                        <TableCell>
                          {new Date(transfer.requested_at).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="font-bold">
                          {formatCurrency(transfer.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{transfer.transfer_method}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getTransferStatusColor(transfer.status)} text-white`}>
                            {getTransferStatusText(transfer.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">
                              {transfer.bank_account?.bank_name || `Banco ${transfer.bank_account?.bank_code}`}
                            </div>
                            <div className="text-muted-foreground">
                              Ag: {transfer.bank_account?.agency} / Conta: {transfer.bank_account?.account}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {transfer.error_message || transfer.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Recebimento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Conta Stripe</h4>
                <p className="text-sm text-blue-700 mb-3">
                  Configure sua conta Stripe para receber pagamentos automaticamente
                </p>
                <Button variant="outline" size="sm">
                  Configurar Stripe
                </Button>
              </div>
              
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Informações Bancárias</h4>
                <p className="text-sm text-gray-700 mb-3">
                  Mantenha seus dados bancários atualizados para recebimentos por transferência
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditBankModalOpen(true)}
                  disabled={!supplierData}
                >
                  Atualizar Dados
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de confirmação de pagamento offline */}
      {selectedPayment && (
        <OfflinePaymentSupplierView
          payment={{
            id: selectedPayment.id,
            quote_id: selectedPayment.quote_id,
            quote_local_code: selectedPayment.quote_local_code,
            amount: selectedPayment.amount,
            status: selectedPayment.status,
            payment_method: selectedPayment.payment_method || '',
            client_name: selectedPayment.client_name || '',
            quote_title: selectedPayment.quote_title || '',
            created_at: selectedPayment.created_at,
            offline_attachments: selectedPayment.offline_attachments || []
          }}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onConfirm={() => {
            refreshReceivables();
            setIsDialogOpen(false);
            setSelectedPayment(null);
          }}
        />
      )}

      {/* Dialog de solicitação de transferência */}
      <RequestTransferDialog
        open={isTransferDialogOpen}
        onOpenChange={setIsTransferDialogOpen}
        availableBalance={balance?.availableForTransfer || 0}
        onSuccess={() => {
          fetchBalance();
        }}
      />

      {/* Modal de edição de dados bancários */}
      {supplierData && (
        <EditBankDataModal
          open={isEditBankModalOpen}
          onClose={() => setIsEditBankModalOpen(false)}
          supplier={{
            id: supplierData.id,
            name: supplierData.name,
            document_number: supplierData.document_number || '',
            bank_data: supplierData.bank_data
          }}
          onSuccess={() => {
            refetchSupplier();
            fetchBalance();
            toast.success('Dados bancários atualizados com sucesso!');
            setIsEditBankModalOpen(false);
          }}
        />
      )}
    </div>
  );
}