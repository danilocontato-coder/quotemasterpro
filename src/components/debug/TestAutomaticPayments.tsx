import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Play, RefreshCw } from 'lucide-react';

export function TestAutomaticPayments() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const testAutomaticPaymentCreation = async () => {
    setIsLoading(true);
    setResults([]);

    try {
      // 1. Buscar cotações aprovadas sem pagamentos
      const { data: quotes, error: quotesError } = await supabase
        .from('quotes')
        .select('*')
        .eq('status', 'approved');

      if (quotesError) {
        toast.error('Erro ao buscar cotações: ' + quotesError.message);
        return;
      }

      const results: any[] = [];

      for (const quote of quotes || []) {
        // Verificar se já existe pagamento
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('id')
          .eq('quote_id', quote.id)
          .maybeSingle();

        if (!existingPayment && quote.total && quote.total > 0) {
          results.push({
            quote_id: quote.id,
            quote_title: quote.title,
            quote_total: quote.total,
            status: 'NEEDS_PAYMENT',
            action: 'Will try to create payment via Edge Function'
          });

          // Tentar criar pagamento via Edge Function
          try {
            const { data, error } = await supabase.functions.invoke('create-automatic-payment', {
              body: {
                quote_id: quote.id,
                client_id: quote.client_id,
                supplier_id: quote.supplier_id || null, // Permitir null
                amount: quote.total
              }
            });

            if (error) {
              results[results.length - 1].result = 'ERROR: ' + error.message;
            } else {
              results[results.length - 1].result = 'SUCCESS: Payment created';
              toast.success(`Pagamento criado para cotação #${quote.local_code || quote.id}`);
            }
          } catch (err: any) {
            results[results.length - 1].result = 'ERROR: ' + err.message;
          }
        } else if (existingPayment) {
          results.push({
            quote_id: quote.id,
            quote_title: quote.title,
            quote_total: quote.total,
            status: 'HAS_PAYMENT',
            action: 'Already has payment',
            result: 'SKIPPED'
          });
        } else {
          results.push({
            quote_id: quote.id,
            quote_title: quote.title,
            quote_total: quote.total || 0,
            status: 'NO_VALUE',
            action: 'Quote has no value or value is zero',
            result: 'SKIPPED'
          });
        }
      }

      setResults(results);
    } catch (error: any) {
      toast.error('Erro durante teste: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Teste de Pagamentos Automáticos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={testAutomaticPaymentCreation}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isLoading ? 'Testando...' : 'Testar Criação Automática'}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium">Resultados do Teste:</h3>
            <div className="space-y-2">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    result.status === 'NEEDS_PAYMENT'
                      ? 'border-orange-200 bg-orange-50'
                      : result.status === 'HAS_PAYMENT'
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">
                        Cotação #{result.quote_id} - {result.quote_title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Valor: R$ {result.quote_total?.toFixed(2) || '0,00'}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Status:</span> {result.status}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Ação:</span> {result.action}
                      </p>
                      {result.result && (
                        <p className={`text-sm font-medium ${
                          result.result.startsWith('SUCCESS') ? 'text-green-600' :
                          result.result.startsWith('ERROR') ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                          <span className="font-medium">Resultado:</span> {result.result}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Para usar no console do navegador
(window as any).TestAutomaticPayments = TestAutomaticPayments;