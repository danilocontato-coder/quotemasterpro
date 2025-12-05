import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Clock, CheckCircle2, AlertTriangle, CreditCard, Receipt, Smartphone, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AsaasFees {
  pix: number;
  boleto: number;
  credit_card: {
    installment_1: { percentage: number; fixed: number };
    installment_2_6: { percentage: number; fixed: number };
    installment_7_12: { percentage: number; fixed: number };
  };
  messaging: number;
  whatsapp?: number;
  anticipation?: {
    credit_card: number;
    credit_card_installment: number;
    boleto: number;
    pix: number;
  };
  last_synced?: string;
  source?: string;
}

export function AsaasFeesSettings() {
  const [fees, setFees] = useState<AsaasFees | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadFees = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'asaas_fees')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar taxas:', error);
        return;
      }

      if (data?.setting_value) {
        setFees(data.setting_value as unknown as AsaasFees);
      }
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFees();
  }, []);

  const syncFromAsaas = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-asaas-fees');

      if (error) throw error;

      if (data?.success) {
        toast.success('Taxas sincronizadas com sucesso!');
        await loadFees();
      } else {
        throw new Error(data?.error || 'Erro desconhecido');
      }
    } catch (err: any) {
      console.error('Erro ao sincronizar:', err);
      toast.error(`Erro ao sincronizar: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Taxas do Asaas
          </CardTitle>
          <CardDescription>
            Taxas de processamento cobradas pelo Asaas em cada transação
          </CardDescription>
        </div>
        <Button onClick={syncFromAsaas} disabled={isSyncing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Sincronizando...' : 'Sincronizar com Asaas'}
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status de sincronização */}
        {fees?.last_synced ? (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Última sincronização: {formatDistanceToNow(new Date(fees.last_synced), { addSuffix: true, locale: ptBR })}
              <Badge variant="outline" className="ml-2">
                {fees.source === 'asaas_api' ? 'API Asaas' : 'Valores padrão'}
              </Badge>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Taxas ainda não sincronizadas. Clique em "Sincronizar com Asaas" para buscar os valores atuais.
            </AlertDescription>
          </Alert>
        )}

        {/* Tabela de taxas de pagamento */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Taxas de Pagamento
          </h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Método</TableHead>
                <TableHead className="text-right">Taxa Fixa</TableHead>
                <TableHead className="text-right">Taxa Percentual</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-green-500" />
                  PIX
                </TableCell>
                <TableCell className="text-right font-mono">
                  {fees ? formatCurrency(fees.pix) : formatCurrency(1.99)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">-</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-blue-500" />
                  Boleto
                </TableCell>
                <TableCell className="text-right font-mono">
                  {fees ? formatCurrency(fees.boleto) : formatCurrency(1.99)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">-</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-purple-500" />
                  Cartão à Vista (1x)
                </TableCell>
                <TableCell className="text-right font-mono">
                  {fees ? formatCurrency(fees.credit_card.installment_1.fixed) : formatCurrency(0.49)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {fees ? formatPercentage(fees.credit_card.installment_1.percentage) : formatPercentage(2.99)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="flex items-center gap-2 pl-8">
                  Parcelado 2-6x
                </TableCell>
                <TableCell className="text-right font-mono">
                  {fees ? formatCurrency(fees.credit_card.installment_2_6.fixed) : formatCurrency(0.49)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {fees ? formatPercentage(fees.credit_card.installment_2_6.percentage) : formatPercentage(3.49)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="flex items-center gap-2 pl-8">
                  Parcelado 7-12x
                </TableCell>
                <TableCell className="text-right font-mono">
                  {fees ? formatCurrency(fees.credit_card.installment_7_12.fixed) : formatCurrency(0.49)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {fees ? formatPercentage(fees.credit_card.installment_7_12.percentage) : formatPercentage(3.99)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Taxas de mensageria */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Taxas de Notificação
          </h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor por Envio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>SMS / E-mail (mensageria padrão)</TableCell>
                <TableCell className="text-right font-mono">
                  {fees ? formatCurrency(fees.messaging) : formatCurrency(0.99)}
                </TableCell>
              </TableRow>
              {fees?.whatsapp && (
                <TableRow>
                  <TableCell>WhatsApp</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(fees.whatsapp)}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Taxas de antecipação */}
        {fees?.anticipation && (
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Taxas de Antecipação (por mês)
            </h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de Recebível</TableHead>
                  <TableHead className="text-right">Taxa Mensal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Cartão à Vista</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatPercentage(fees.anticipation.credit_card)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Cartão Parcelado</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatPercentage(fees.anticipation.credit_card_installment)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Boleto</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatPercentage(fees.anticipation.boleto)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>PIX</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatPercentage(fees.anticipation.pix)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}

        {/* Nota explicativa */}
        <Alert>
          <AlertDescription className="text-sm text-muted-foreground">
            <strong>Como funciona:</strong> As taxas de pagamento são repassadas ao cliente no valor total da cobrança. 
            A taxa de mensageria é cobrada por cobrança enviada. 
            As taxas de antecipação são opcionais e pagas pelo fornecedor caso opte por receber antes do prazo padrão.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
