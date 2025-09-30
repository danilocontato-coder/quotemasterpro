import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function DebugCostCenters() {
  const [debugResult, setDebugResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const runDebug = async () => {
    try {
      setIsLoading(true);
      setDebugResult(null);

      const { data, error } = await supabase.functions.invoke('debug-cost-centers', {
        body: {}
      });

      if (error) {
        console.error('Debug function error:', error);
        toast({
          title: 'Erro',
          description: `Erro ao executar debug: ${error.message}`,
          variant: 'destructive'
        });
        return;
      }

      console.log('Debug result:', data);
      setDebugResult(data);

      toast({
        title: 'Debug executado',
        description: 'Verifique os resultados abaixo e o console do navegador'
      });

    } catch (err) {
      console.error('Error running debug:', err);
      toast({
        title: 'Erro',
        description: 'Erro ao executar debug',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Debug - Centros de Custo</h1>
        <p className="text-muted-foreground">
          Ferramenta de debug para investigar problemas com centros de custo
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Executar Debug</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={runDebug} disabled={isLoading}>
            {isLoading ? 'Executando...' : 'Executar Debug'}
          </Button>
        </CardContent>
      </Card>

      {debugResult && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado do Debug</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Informações do Usuário</h3>
                <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
                  {JSON.stringify({
                    user_id: debugResult.debug?.user_id,
                    client_id: debugResult.debug?.client_id
                  }, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Centros de Custo Existentes</h3>
                <p className="text-sm mb-2">
                  Total: {debugResult.debug?.existing_centers_count || 0}
                </p>
                <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs max-h-64">
                  {JSON.stringify(debugResult.debug?.existing_centers || [], null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Teste de Inserção Direta</h3>
                {debugResult.debug?.test_insert_error ? (
                  <div className="text-destructive text-sm">
                    Erro: {debugResult.debug.test_insert_error}
                  </div>
                ) : (
                  <div className="text-green-600 text-sm">
                    ✓ Inserção direta funcionou
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold mb-2">Teste RPC Function</h3>
                {debugResult.debug?.rpc_error ? (
                  <div className="text-destructive text-sm">
                    Erro: {debugResult.debug.rpc_error}
                  </div>
                ) : (
                  <div className="text-green-600 text-sm">
                    ✓ RPC executou sem erros
                  </div>
                )}
                <p className="text-sm mt-2">
                  Centros após RPC: {debugResult.debug?.after_rpc_count || 0}
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Logs de Auditoria</h3>
                <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs max-h-64">
                  {JSON.stringify(debugResult.debug?.audit_logs || [], null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Resultado Completo</h3>
                <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs max-h-96">
                  {JSON.stringify(debugResult, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
