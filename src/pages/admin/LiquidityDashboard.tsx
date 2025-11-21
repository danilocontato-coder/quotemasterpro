import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, TrendingUp, Clock, AlertCircle, RefreshCw, Wallet, ArrowUpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface LiquidityMetrics {
  total_in_escrow: number;
  escrow_count: number;
  releasing_next_7_days: number;
  releasing_next_30_days: number;
  pending_errors: number;
  transferred_this_month: number;
  commission_this_month: number;
}

interface EscrowPayment {
  id: string;
  amount: number;
  quote_id: string;
  quote_local_code: string;
  supplier_name: string;
  created_at: string;
  scheduled_delivery_date?: string;
}

export default function LiquidityDashboard() {
  const [metrics, setMetrics] = useState<LiquidityMetrics>({
    total_in_escrow: 0,
    escrow_count: 0,
    releasing_next_7_days: 0,
    releasing_next_30_days: 0,
    pending_errors: 0,
    transferred_this_month: 0,
    commission_this_month: 0
  });
  const [escrowPayments, setEscrowPayments] = useState<EscrowPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Buscar pagamentos em escrow
      const { data: escrowData, error: escrowError } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          quote_id,
          created_at,
          quotes(local_code),
          suppliers(name),
          deliveries(scheduled_date)
        `)
        .eq('status', 'in_escrow');

      if (escrowError) throw escrowError;
      
      const payments = escrowData?.map((p: any) => ({
        id: p.id,
        amount: p.amount,
        quote_id: p.quote_id,
        quote_local_code: p.quotes?.local_code || 'N/A',
        supplier_name: p.suppliers?.name || 'N/A',
        created_at: p.created_at,
        scheduled_delivery_date: p.deliveries?.[0]?.scheduled_date
      })) || [];

      setEscrowPayments(payments);

      // Calcular métricas
      const totalInEscrow = payments.reduce((sum: number, p: EscrowPayment) => sum + p.amount, 0);
      const escrowCount = payments.length;

      // Liberações próximas 7 e 30 dias
      const now = new Date();
      const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const releasing7d = payments
        .filter((p: EscrowPayment) => p.scheduled_delivery_date && new Date(p.scheduled_delivery_date) <= next7Days)
        .reduce((sum: number, p: EscrowPayment) => sum + p.amount, 0);

      const releasing30d = payments
        .filter((p: EscrowPayment) => p.scheduled_delivery_date && new Date(p.scheduled_delivery_date) <= next30Days)
        .reduce((sum: number, p: EscrowPayment) => sum + p.amount, 0);

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
        pending_errors: 0, // Será implementado quando a tabela existir
        transferred_this_month: transferredThisMonth,
        commission_this_month: commissionThisMonth
      });

    } catch (error: any) {
      console.error('Error fetching liquidity data:', error);
      toast.error('Erro ao carregar dados de liquidez');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Refresh a cada 30 segundos
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
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
            <Wallet className="h-8 w-8" />
            Dashboard de Liquidez
          </h1>
          <p className="text-muted-foreground">
            Monitore pagamentos em escrow e fluxo de caixa
          </p>
        </div>
        <Button onClick={fetchData} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total em Escrow
            </CardTitle>
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
            <CardTitle className="text-sm font-medium">
              Liberações 7 dias
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.releasing_next_7_days)}</div>
            <p className="text-xs text-muted-foreground">
              Entregas agendadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Transferido (Mês)
            </CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(metrics.transferred_this_month)}
            </div>
            <p className="text-xs text-muted-foreground">
              Já liberado aos fornecedores
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Comissão (Mês)
            </CardTitle>
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

      {/* Pagamentos em Escrow */}
      <Card>
        <CardHeader>
          <CardTitle>Pagamentos em Escrow ({metrics.escrow_count})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Cotação</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Entrega Agendada</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {escrowPayments.slice(0, 20).map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-mono text-xs">{payment.id}</TableCell>
                  <TableCell className="font-medium">{payment.quote_local_code}</TableCell>
                  <TableCell>{payment.supplier_name}</TableCell>
                  <TableCell className="font-bold">{formatCurrency(payment.amount)}</TableCell>
                  <TableCell className="text-xs">{formatDate(payment.created_at)}</TableCell>
                  <TableCell className="text-xs">
                    {payment.scheduled_delivery_date 
                      ? formatDate(payment.scheduled_delivery_date)
                      : <span className="text-muted-foreground">Não agendada</span>
                    }
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {escrowPayments.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum pagamento em escrow no momento
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
