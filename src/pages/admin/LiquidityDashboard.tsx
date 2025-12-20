import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  DollarSign, TrendingUp, Clock, AlertCircle, RefreshCw, Wallet, 
  ArrowUpCircle, AlertTriangle, CheckCircle, XCircle, Download,
  Loader2, RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface LiquidityMetrics {
  total_in_escrow: number;
  escrow_count: number;
  releasing_next_7_days: number;
  releasing_next_30_days: number;
  pending_payment_count: number;
  pending_payment_total: number;
  transfer_errors_count: number;
  inconsistencies_count: number;
  transferred_this_month: number;
  commission_this_month: number;
  base_amount_in_escrow: number;
  commission_in_escrow: number;
  fees_in_escrow: number;
}

interface EscrowPayment {
  id: string;
  friendly_id: string;
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
}

interface PendingPayment {
  id: string;
  friendly_id: string;
  amount: number;
  quote_local_code: string;
  client_name: string;
  supplier_name: string;
  created_at: string;
  asaas_payment_id?: string;
}

interface InconsistentPayment extends EscrowPayment {
  delivery_actual_date?: string;
  issue_reason: string;
}

export default function LiquidityDashboard() {
  const [metrics, setMetrics] = useState<LiquidityMetrics>({
    total_in_escrow: 0,
    escrow_count: 0,
    releasing_next_7_days: 0,
    releasing_next_30_days: 0,
    pending_payment_count: 0,
    pending_payment_total: 0,
    transfer_errors_count: 0,
    inconsistencies_count: 0,
    transferred_this_month: 0,
    commission_this_month: 0,
    base_amount_in_escrow: 0,
    commission_in_escrow: 0,
    fees_in_escrow: 0
  });
  const [escrowPayments, setEscrowPayments] = useState<EscrowPayment[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [inconsistentPayments, setInconsistentPayments] = useState<InconsistentPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Buscar pagamentos em escrow com FK explícito
      const { data: escrowData, error: escrowError } = await supabase
        .from('payments')
        .select(`
          id,
          friendly_id,
          amount,
          base_amount,
          supplier_net_amount,
          platform_commission_amount,
          asaas_fee,
          quote_id,
          created_at,
          transfer_status,
          quotes(local_code, clients!quotes_client_id_fkey(name)),
          suppliers!payments_supplier_id_fkey(name),
          deliveries(scheduled_date, status, actual_delivery_date)
        `)
        .eq('status', 'in_escrow');

      if (escrowError) {
        console.error('Escrow query error:', escrowError);
        throw escrowError;
      }

      const payments: EscrowPayment[] = escrowData?.map((p: any) => ({
        id: p.id,
        friendly_id: p.friendly_id || p.id.substring(0, 8),
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
        transfer_status: p.transfer_status
      })) || [];

      setEscrowPayments(payments);

      // Identificar inconsistências (entrega confirmada mas ainda em escrow)
      const inconsistencies: InconsistentPayment[] = payments
        .filter(p => p.delivery_status === 'delivered' || p.delivery_status === 'confirmed')
        .map(p => ({
          ...p,
          issue_reason: 'Entrega confirmada mas pagamento ainda em escrow'
        }));

      // Também checar transfer_status com erro
      const transferErrors = payments.filter(p => 
        p.transfer_status === 'failed' || p.transfer_status === 'error'
      );
      
      transferErrors.forEach(p => {
        if (!inconsistencies.find(i => i.id === p.id)) {
          inconsistencies.push({
            ...p,
            issue_reason: 'Erro na transferência'
          });
        }
      });

      setInconsistentPayments(inconsistencies);

      // Buscar pagamentos pendentes (aguardando cliente pagar)
      const { data: pendingData, error: pendingError } = await supabase
        .from('payments')
        .select(`
          id,
          friendly_id,
          amount,
          created_at,
          asaas_payment_id,
          quotes(local_code, clients!quotes_client_id_fkey(name)),
          suppliers!payments_supplier_id_fkey(name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (pendingError) {
        console.error('Pending query error:', pendingError);
      }

      const pending: PendingPayment[] = pendingData?.map((p: any) => ({
        id: p.id,
        friendly_id: p.friendly_id || p.id.substring(0, 8),
        amount: p.amount || 0,
        quote_local_code: p.quotes?.local_code || 'N/A',
        client_name: p.quotes?.clients?.name || 'N/A',
        supplier_name: p.suppliers?.name || 'N/A',
        created_at: p.created_at,
        asaas_payment_id: p.asaas_payment_id
      })) || [];

      setPendingPayments(pending);

      // Calcular métricas
      const totalInEscrow = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const baseAmountInEscrow = payments.reduce((sum, p) => sum + (p.base_amount || 0), 0);
      const commissionInEscrow = payments.reduce((sum, p) => sum + (p.platform_commission_amount || 0), 0);
      const feesInEscrow = payments.reduce((sum, p) => sum + (p.asaas_fee || 0), 0);
      const escrowCount = payments.length;

      // Liberações próximas 7 e 30 dias
      const now = new Date();
      const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const releasing7d = payments
        .filter(p => p.scheduled_delivery_date && new Date(p.scheduled_delivery_date) <= next7Days)
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      const releasing30d = payments
        .filter(p => p.scheduled_delivery_date && new Date(p.scheduled_delivery_date) <= next30Days)
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      // Pendentes
      const pendingPaymentTotal = pending.reduce((sum, p) => sum + (p.amount || 0), 0);

      // Transferências deste mês
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const { data: completedData } = await supabase
        .from('payments')
        .select('amount, platform_commission_amount')
        .eq('status', 'completed')
        .gte('transfer_date', startOfMonth.toISOString());

      const transferredThisMonth = completedData?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const commissionThisMonth = completedData?.reduce((sum, p) => sum + (p.platform_commission_amount || 0), 0) || 0;

      setMetrics({
        total_in_escrow: totalInEscrow,
        escrow_count: escrowCount,
        releasing_next_7_days: releasing7d,
        releasing_next_30_days: releasing30d,
        pending_payment_count: pending.length,
        pending_payment_total: pendingPaymentTotal,
        transfer_errors_count: transferErrors.length,
        inconsistencies_count: inconsistencies.length,
        transferred_this_month: transferredThisMonth,
        commission_this_month: commissionThisMonth,
        base_amount_in_escrow: baseAmountInEscrow,
        commission_in_escrow: commissionInEscrow,
        fees_in_escrow: feesInEscrow
      });

    } catch (error: any) {
      console.error('Error fetching liquidity data:', error);
      toast.error('Erro ao carregar dados de liquidez: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
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

  const exportToCSV = () => {
    const headers = ['ID', 'Cotação', 'Cliente', 'Fornecedor', 'Valor', 'Base', 'Comissão', 'Taxa', 'Status Entrega', 'Criado'];
    const rows = escrowPayments.map(p => [
      p.friendly_id,
      p.quote_local_code,
      p.client_name,
      p.supplier_name,
      p.amount,
      p.base_amount,
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
    a.download = `liquidez-escrow-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Relatório exportado');
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
            Monitore pagamentos em garantia e fluxo de caixa
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Alertas de Inconsistências */}
      {metrics.inconsistencies_count > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div className="flex-1">
              <h3 className="font-semibold text-destructive">
                {metrics.inconsistencies_count} Inconsistência(s) Detectada(s)
              </h3>
              <p className="text-sm text-muted-foreground">
                Pagamentos em garantia com entregas já confirmadas ou erros de transferência
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

      {/* Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total em Garantia</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.total_in_escrow)}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.escrow_count} pagamentos retidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aguardando Pagamento</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(metrics.pending_payment_total)}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.pending_payment_count} cobranças pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transferido (Mês)</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(metrics.transferred_this_month)}
            </div>
            <p className="text-xs text-muted-foreground">
              Liberado aos fornecedores
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissão (Mês)</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(metrics.commission_this_month)}
            </div>
            <p className="text-xs text-muted-foreground">
              Receita da plataforma
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Financeiro */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Breakdown Financeiro (Garantia)</CardTitle>
          <CardDescription>Composição do valor total em garantia</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Total em Garantia</p>
              <p className="text-2xl font-bold">{formatCurrency(metrics.total_in_escrow)}</p>
            </div>
            <div className="p-4 rounded-lg bg-blue-500/10">
              <p className="text-sm text-blue-600">Valor Base (Fornecedores)</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(metrics.base_amount_in_escrow)}</p>
            </div>
            <div className="p-4 rounded-lg bg-green-500/10">
              <p className="text-sm text-green-600">Comissão Plataforma (5%)</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(metrics.commission_in_escrow)}</p>
            </div>
            <div className="p-4 rounded-lg bg-amber-500/10">
              <p className="text-sm text-amber-600">Taxas Asaas</p>
              <p className="text-2xl font-bold text-amber-600">{formatCurrency(metrics.fees_in_escrow)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs para diferentes visualizações */}
      <Tabs defaultValue="escrow" className="space-y-4">
        <TabsList>
          <TabsTrigger value="escrow">
            Em Garantia ({metrics.escrow_count})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Aguardando Pagamento ({metrics.pending_payment_count})
          </TabsTrigger>
          <TabsTrigger value="inconsistencies" id="tab-inconsistencies">
            <span className={metrics.inconsistencies_count > 0 ? 'text-destructive' : ''}>
              Inconsistências ({metrics.inconsistencies_count})
            </span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Pagamentos em Escrow */}
        <TabsContent value="escrow">
          <Card>
            <CardHeader>
              <CardTitle>Pagamentos em Escrow</CardTitle>
              <CardDescription>
                Pagamentos recebidos aguardando confirmação de entrega
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
                    <TableHead className="text-right">Líquido Fornecedor</TableHead>
                    <TableHead>Status Entrega</TableHead>
                    <TableHead>Entrega Agendada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {escrowPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-xs">{payment.friendly_id}</TableCell>
                      <TableCell className="font-medium">{payment.quote_local_code}</TableCell>
                      <TableCell>{payment.client_name}</TableCell>
                      <TableCell>{payment.supplier_name}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(payment.amount)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(payment.supplier_net_amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          payment.delivery_status === 'delivered' ? 'default' :
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

              {escrowPayments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>Nenhum pagamento em escrow no momento</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Pagamentos Pendentes */}
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
                      <TableCell className="font-mono text-xs">{payment.friendly_id}</TableCell>
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
          <Card className={metrics.inconsistencies_count > 0 ? 'border-destructive' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className={metrics.inconsistencies_count > 0 ? 'text-destructive' : 'text-muted-foreground'} />
                Inconsistências Detectadas
              </CardTitle>
              <CardDescription>
                Pagamentos que requerem ação administrativa (entrega confirmada mas ainda em escrow, ou erros de transferência)
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
                    <TableHead>Status Entrega</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inconsistentPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-xs">{payment.friendly_id}</TableCell>
                      <TableCell className="font-medium">{payment.quote_local_code}</TableCell>
                      <TableCell>{payment.supplier_name}</TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(payment.supplier_net_amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive" className="text-xs">
                          {payment.issue_reason}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{payment.delivery_status}</Badge>
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
                  ))}
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
