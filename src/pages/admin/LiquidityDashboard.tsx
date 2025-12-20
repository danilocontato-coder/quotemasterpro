import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  DollarSign, TrendingUp, Clock, AlertCircle, RefreshCw, Wallet, 
  ArrowUpCircle, AlertTriangle, CheckCircle, XCircle, Download,
  Loader2, RotateCcw, Shield, Send, Ban
} from 'lucide-react';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PlatformBalance {
  asaas: {
    balance: number;
    totalBalance: number;
    availableForTransfer: number;
  };
  escrow: {
    total: number;
    supplierNet: number;
    commission: number;
    fees: number;
    count: number;
  };
  transfers: {
    completedThisMonth: number;
    commissionThisMonth: number;
    errorsCount: number;
    pendingErrorAmount: number;
  };
}

interface GuaranteePayment {
  id: string;
  amount: number;
  base_amount: number;
  supplier_net_amount: number;
  platform_commission_amount: number;
  asaas_fee: number;
  quote_id: string;
  quote_local_code: string;
  supplier_name: string;
  client_name: string;
  created_at: string;
  scheduled_delivery_date?: string;
  delivery_status?: string;
  transfer_status?: string;
  transfer_error?: string;
}

interface TransferRecord {
  id: string;
  amount: number;
  supplier_net_amount: number;
  quote_local_code: string;
  supplier_name: string;
  status: string;
  transfer_status: string;
  transfer_date: string;
  transfer_error?: string;
}

interface PendingPayment {
  id: string;
  amount: number;
  quote_local_code: string;
  client_name: string;
  supplier_name: string;
  created_at: string;
  asaas_payment_id?: string;
}

export default function LiquidityDashboard() {
  const [platformBalance, setPlatformBalance] = useState<PlatformBalance | null>(null);
  const [guaranteePayments, setGuaranteePayments] = useState<GuaranteePayment[]>([]);
  const [transferRecords, setTransferRecords] = useState<TransferRecord[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [inconsistentPayments, setInconsistentPayments] = useState<GuaranteePayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [transferFilter, setTransferFilter] = useState<'all' | 'completed' | 'processing' | 'error'>('all');

  const fetchPlatformBalance = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-platform-balance');
      if (error) throw error;
      if (data.success) {
        setPlatformBalance(data);
      }
    } catch (error: any) {
      console.error('Error fetching platform balance:', error);
      // Continue with other data even if Asaas fails
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch platform balance from Asaas
      await fetchPlatformBalance();

      // Buscar pagamentos em garantia
      const { data: escrowData, error: escrowError } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          base_amount,
          supplier_net_amount,
          platform_commission_amount,
          asaas_fee,
          quote_id,
          created_at,
          transfer_status,
          transfer_error,
          quotes(local_code, clients!quotes_client_id_fkey(name)),
          suppliers!payments_supplier_id_fkey(name),
          deliveries(scheduled_date, status, actual_delivery_date)
        `)
        .eq('status', 'in_escrow');

      if (escrowError) {
        console.error('Guarantee query error:', escrowError);
        throw escrowError;
      }

      const payments: GuaranteePayment[] = escrowData?.map((p: any) => ({
        id: p.id,
        amount: p.amount || 0,
        base_amount: p.base_amount || p.amount || 0,
        supplier_net_amount: p.supplier_net_amount || 0,
        platform_commission_amount: p.platform_commission_amount || 0,
        asaas_fee: p.asaas_fee || 0,
        quote_id: p.quote_id,
        quote_local_code: p.quotes?.local_code || 'N/A',
        client_name: p.quotes?.clients?.name || 'N/A',
        supplier_name: p.suppliers?.name || 'N/A',
        created_at: p.created_at,
        scheduled_delivery_date: p.deliveries?.[0]?.scheduled_date,
        delivery_status: p.deliveries?.[0]?.status,
        transfer_status: p.transfer_status,
        transfer_error: p.transfer_error
      })) || [];

      setGuaranteePayments(payments);

      // Identificar inconsistências
      const inconsistencies: GuaranteePayment[] = payments.filter(p => 
        p.delivery_status === 'delivered' || 
        p.delivery_status === 'confirmed' ||
        p.transfer_status === 'failed' || 
        p.transfer_status === 'error'
      );
      setInconsistentPayments(inconsistencies);

      // Buscar histórico de transferências (completed + in_escrow com transfer_status)
      const { data: transferData } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          supplier_net_amount,
          status,
          transfer_status,
          transfer_date,
          transfer_error,
          quotes(local_code),
          suppliers!payments_supplier_id_fkey(name)
        `)
        .or('status.eq.completed,transfer_status.neq.null')
        .order('transfer_date', { ascending: false, nullsFirst: false })
        .limit(50);

      const transfers: TransferRecord[] = transferData?.map((p: any) => ({
        id: p.id,
        amount: p.amount || 0,
        supplier_net_amount: p.supplier_net_amount || 0,
        quote_local_code: p.quotes?.local_code || 'N/A',
        supplier_name: p.suppliers?.name || 'N/A',
        status: p.status,
        transfer_status: p.transfer_status || (p.status === 'completed' ? 'completed' : 'pending'),
        transfer_date: p.transfer_date,
        transfer_error: p.transfer_error
      })) || [];

      setTransferRecords(transfers);

      // Buscar pagamentos pendentes
      const { data: pendingData } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          created_at,
          asaas_payment_id,
          quotes(local_code, clients!quotes_client_id_fkey(name)),
          suppliers!payments_supplier_id_fkey(name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      const pending: PendingPayment[] = pendingData?.map((p: any) => ({
        id: p.id,
        amount: p.amount || 0,
        quote_local_code: p.quotes?.local_code || 'N/A',
        client_name: p.quotes?.clients?.name || 'N/A',
        supplier_name: p.suppliers?.name || 'N/A',
        created_at: p.created_at,
        asaas_payment_id: p.asaas_payment_id
      })) || [];

      setPendingPayments(pending);

    } catch (error: any) {
      console.error('Error fetching liquidity data:', error);
      toast.error('Erro ao carregar dados: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: '2-digit'
    });
  };

  const handleRetryTransfer = async (paymentId: string) => {
    setProcessingId(paymentId);
    try {
      const { data, error } = await supabase.functions.invoke('release-escrow-payment', {
        body: { paymentId }
      });

      if (error) throw error;

      toast.success('Transferência reprocessada com sucesso');
      fetchData();
    } catch (error: any) {
      console.error('Error retrying transfer:', error);
      toast.error('Erro ao reprocessar: ' + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const getTransferStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Concluída</Badge>;
      case 'processing':
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Em Andamento</Badge>;
      case 'failed':
      case 'error':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Erro</Badge>;
      case 'pending':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>;
      default:
        return <Badge variant="outline">{status || 'N/A'}</Badge>;
    }
  };

  const filteredTransfers = transferRecords.filter(t => {
    if (transferFilter === 'all') return true;
    if (transferFilter === 'completed') return t.transfer_status === 'completed' || t.status === 'completed';
    if (transferFilter === 'processing') return t.transfer_status === 'processing';
    if (transferFilter === 'error') return t.transfer_status === 'failed' || t.transfer_status === 'error';
    return true;
  });

  const exportToCSV = () => {
    const headers = ['ID', 'Cotação', 'Cliente', 'Fornecedor', 'Valor', 'Líquido', 'Comissão', 'Taxa', 'Status Entrega', 'Criado'];
    const rows = guaranteePayments.map(p => [
      p.id.substring(0, 8),
      p.quote_local_code,
      p.client_name,
      p.supplier_name,
      p.amount,
      p.supplier_net_amount,
      p.platform_commission_amount,
      p.asaas_fee,
      p.delivery_status || 'N/A',
      p.created_at
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `liquidez-garantia-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Relatório exportado');
  };

  // Calculate metrics from local data if platform balance not available
  const metrics = {
    totalInGuarantee: platformBalance?.escrow.total || guaranteePayments.reduce((sum, p) => sum + p.amount, 0),
    guaranteeCount: platformBalance?.escrow.count || guaranteePayments.length,
    supplierNetInGuarantee: platformBalance?.escrow.supplierNet || guaranteePayments.reduce((sum, p) => sum + p.supplier_net_amount, 0),
    commissionInGuarantee: platformBalance?.escrow.commission || guaranteePayments.reduce((sum, p) => sum + p.platform_commission_amount, 0),
    feesInGuarantee: platformBalance?.escrow.fees || guaranteePayments.reduce((sum, p) => sum + p.asaas_fee, 0),
    transferredThisMonth: platformBalance?.transfers.completedThisMonth || 0,
    commissionThisMonth: platformBalance?.transfers.commissionThisMonth || 0,
    errorsCount: platformBalance?.transfers.errorsCount || inconsistentPayments.filter(p => p.transfer_status === 'failed' || p.transfer_status === 'error').length,
    pendingPaymentTotal: pendingPayments.reduce((sum, p) => sum + p.amount, 0),
    asaasBalance: platformBalance?.asaas.balance || 0,
    asaasAvailable: platformBalance?.asaas.availableForTransfer || 0
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard de Liquidez</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-muted rounded w-3/4"></div>
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
            <Wallet className="h-8 w-8" />
            Dashboard de Liquidez
          </h1>
          <p className="text-muted-foreground">
            Monitore pagamentos em garantia, transferências e fluxo de caixa
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Alertas */}
      {metrics.errorsCount > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div className="flex-1">
              <h3 className="font-semibold text-destructive">
                {metrics.errorsCount} Erro(s) de Transferência
              </h3>
              <p className="text-sm text-muted-foreground">
                Existem transferências com erro que precisam de ação manual
              </p>
            </div>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => document.getElementById('tab-inconsistencies')?.click()}
            >
              Ver Detalhes
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Cards Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Saldo Asaas */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Asaas</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(metrics.asaasBalance)}</div>
            <p className="text-xs text-muted-foreground">
              Disponível: {formatCurrency(metrics.asaasAvailable)}
            </p>
          </CardContent>
        </Card>

        {/* Em Garantia */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Garantia</CardTitle>
            <Shield className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalInGuarantee)}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.guaranteeCount} pagamentos retidos
            </p>
          </CardContent>
        </Card>

        {/* Transferido (Mês) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transferido (Mês)</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(metrics.transferredThisMonth)}
            </div>
            <p className="text-xs text-muted-foreground">
              Comissão: {formatCurrency(metrics.commissionThisMonth)}
            </p>
          </CardContent>
        </Card>

        {/* A Transferir / Pendentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aguardando Pgto</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(metrics.pendingPaymentTotal)}</div>
            <p className="text-xs text-muted-foreground">
              {pendingPayments.length} cobranças pendentes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Financeiro */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Composição do Valor em Garantia</CardTitle>
          <CardDescription>Breakdown dos {metrics.guaranteeCount} pagamentos retidos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Total Bruto</p>
              <p className="text-2xl font-bold">{formatCurrency(metrics.totalInGuarantee)}</p>
            </div>
            <div className="p-4 rounded-lg bg-blue-500/10">
              <p className="text-sm text-blue-600">Líquido Fornecedores</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(metrics.supplierNetInGuarantee)}</p>
            </div>
            <div className="p-4 rounded-lg bg-green-500/10">
              <p className="text-sm text-green-600">Comissão Plataforma</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(metrics.commissionInGuarantee)}</p>
            </div>
            <div className="p-4 rounded-lg bg-amber-500/10">
              <p className="text-sm text-amber-600">Taxas Asaas</p>
              <p className="text-2xl font-bold text-amber-600">{formatCurrency(metrics.feesInGuarantee)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="guarantee" className="space-y-4">
        <TabsList>
          <TabsTrigger value="guarantee">
            <Shield className="h-4 w-4 mr-1" />
            Em Garantia ({metrics.guaranteeCount})
          </TabsTrigger>
          <TabsTrigger value="transfers">
            <Send className="h-4 w-4 mr-1" />
            Transferências
          </TabsTrigger>
          <TabsTrigger value="pending">
            <Clock className="h-4 w-4 mr-1" />
            Pendentes ({pendingPayments.length})
          </TabsTrigger>
          <TabsTrigger value="inconsistencies" id="tab-inconsistencies">
            <span className={inconsistentPayments.length > 0 ? 'text-destructive flex items-center' : 'flex items-center'}>
              <AlertTriangle className="h-4 w-4 mr-1" />
              Inconsistências ({inconsistentPayments.length})
            </span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Em Garantia */}
        <TabsContent value="guarantee">
          <Card>
            <CardHeader>
              <CardTitle>Pagamentos em Garantia</CardTitle>
              <CardDescription>
                Pagamentos recebidos aguardando confirmação de entrega para liberação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Cotação</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-right">Líquido Fornec.</TableHead>
                    <TableHead>Status Entrega</TableHead>
                    <TableHead>Entrega Prevista</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guaranteePayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-xs">{payment.id.substring(0, 8)}</TableCell>
                      <TableCell className="font-medium">{payment.quote_local_code}</TableCell>
                      <TableCell>{payment.client_name}</TableCell>
                      <TableCell>{payment.supplier_name}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(payment.amount)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(payment.supplier_net_amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          payment.delivery_status === 'delivered' || payment.delivery_status === 'confirmed' ? 'default' :
                          payment.delivery_status === 'scheduled' ? 'secondary' :
                          payment.delivery_status === 'in_transit' ? 'outline' :
                          'destructive'
                        }>
                          {payment.delivery_status || 'Não agendada'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {payment.scheduled_delivery_date 
                          ? formatDate(payment.scheduled_delivery_date)
                          : <span className="text-muted-foreground">-</span>
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {guaranteePayments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>Nenhum pagamento em garantia no momento</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Transferências */}
        <TabsContent value="transfers">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Histórico de Transferências</CardTitle>
                  <CardDescription>
                    Transferências concluídas, em andamento e com erro
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button 
                    variant={transferFilter === 'all' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setTransferFilter('all')}
                  >
                    Todas
                  </Button>
                  <Button 
                    variant={transferFilter === 'completed' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setTransferFilter('completed')}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" /> Concluídas
                  </Button>
                  <Button 
                    variant={transferFilter === 'processing' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setTransferFilter('processing')}
                  >
                    <Loader2 className="h-3 w-3 mr-1" /> Em Andamento
                  </Button>
                  <Button 
                    variant={transferFilter === 'error' ? 'destructive' : 'outline'} 
                    size="sm"
                    onClick={() => setTransferFilter('error')}
                  >
                    <XCircle className="h-3 w-3 mr-1" /> Com Erro
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Cotação</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Valor Líquido</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="font-mono text-xs">{transfer.id.substring(0, 8)}</TableCell>
                      <TableCell className="font-medium">{transfer.quote_local_code}</TableCell>
                      <TableCell>{transfer.supplier_name}</TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(transfer.supplier_net_amount)}
                      </TableCell>
                      <TableCell>{getTransferStatusBadge(transfer.transfer_status)}</TableCell>
                      <TableCell className="text-xs">{formatDate(transfer.transfer_date)}</TableCell>
                      <TableCell>
                        {(transfer.transfer_status === 'failed' || transfer.transfer_status === 'error') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRetryTransfer(transfer.id)}
                            disabled={processingId === transfer.id}
                          >
                            {processingId === transfer.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredTransfers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Send className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma transferência encontrada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Pendentes */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Aguardando Pagamento do Cliente</CardTitle>
              <CardDescription>
                Cobranças emitidas que ainda não foram pagas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Cotação</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Asaas ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-xs">{payment.id.substring(0, 8)}</TableCell>
                      <TableCell className="font-medium">{payment.quote_local_code}</TableCell>
                      <TableCell>{payment.client_name}</TableCell>
                      <TableCell>{payment.supplier_name}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(payment.amount)}</TableCell>
                      <TableCell className="text-xs">{formatDate(payment.created_at)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {payment.asaas_payment_id || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {pendingPayments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>Nenhuma cobrança pendente</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Inconsistências */}
        <TabsContent value="inconsistencies">
          <Card className={inconsistentPayments.length > 0 ? 'border-destructive' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className={inconsistentPayments.length > 0 ? 'text-destructive' : 'text-muted-foreground'} />
                Inconsistências Detectadas
              </CardTitle>
              <CardDescription>
                Pagamentos que requerem ação administrativa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Cotação</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Valor Líquido</TableHead>
                    <TableHead>Problema</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inconsistentPayments.map((payment) => {
                    const isTransferError = payment.transfer_status === 'failed' || payment.transfer_status === 'error';
                    const issueReason = isTransferError 
                      ? `Erro: ${payment.transfer_error || 'Falha na transferência'}`
                      : 'Entrega confirmada mas ainda em garantia';
                    
                    return (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono text-xs">{payment.id.substring(0, 8)}</TableCell>
                        <TableCell className="font-medium">{payment.quote_local_code}</TableCell>
                        <TableCell>{payment.supplier_name}</TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(payment.supplier_net_amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive" className="text-xs">
                            {issueReason}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{payment.delivery_status || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRetryTransfer(payment.id)}
                            disabled={processingId === payment.id}
                          >
                            {processingId === payment.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Reprocessar
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {inconsistentPayments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>Nenhuma inconsistência detectada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
