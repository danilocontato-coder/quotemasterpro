import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wallet, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const CreateAsaasWalletTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [currentWallet, setCurrentWallet] = useState<string | null>(null);
  const [isLoadingWallet, setIsLoadingWallet] = useState(true);
  const { toast } = useToast();

  const supplierId = '4399414c-8554-4099-a4d1-fcb17b972256'; // MOTIZ MOTOS

  useEffect(() => {
    fetchCurrentWallet();
  }, []);

  const fetchCurrentWallet = async () => {
    setIsLoadingWallet(true);
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('asaas_wallet_id')
        .eq('id', supplierId)
        .single();

      if (error) throw error;
      setCurrentWallet(data?.asaas_wallet_id || null);
    } catch (error) {
      console.error('Erro ao buscar wallet atual:', error);
    } finally {
      setIsLoadingWallet(false);
    }
  };

  const handleClearWallet = async () => {
    setIsLoading(true);
    try {
      console.log('🗑️ Limpando wallet antiga do fornecedor:', supplierId);

      const { error } = await supabase
        .from('suppliers')
        .update({ asaas_wallet_id: null, updated_at: new Date().toISOString() })
        .eq('id', supplierId);

      if (error) throw error;

      toast({
        title: 'Wallet antiga removida!',
        description: 'Agora você pode criar uma nova wallet.',
      });

      await fetchCurrentWallet();
    } catch (error: any) {
      console.error('❌ Erro ao limpar wallet:', error);
      toast({
        title: 'Erro ao limpar wallet',
        description: error.message || 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWallet = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      console.log('🔄 Criando wallet Asaas para fornecedor:', supplierId);

      const { data, error } = await supabase.functions.invoke('create-asaas-wallet', {
        body: { supplierId },
      });

      if (error) {
        console.error('❌ Erro ao criar wallet:', error);
        throw error;
      }

      console.log('✅ Wallet criada com sucesso:', data);
      setResult(data);

      toast({
        title: 'Wallet Asaas criada com sucesso!',
        description: `Wallet ID: ${data.wallet_id}`,
      });

      // Atualizar wallet atual e aguardar antes de recarregar
      await fetchCurrentWallet();
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      console.error('❌ Erro completo:', error);
      toast({
        title: 'Erro ao criar wallet',
        description: error.message || 'Erro desconhecido',
        variant: 'destructive',
      });
      setResult({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6 bg-yellow-50 border-yellow-200">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Wallet className="h-6 w-6 text-yellow-600" />
          <div>
            <h3 className="font-semibold text-lg">🔧 Debug: Criar Wallet Asaas</h3>
            <p className="text-sm text-muted-foreground">
              Criar wallet Asaas para o fornecedor MOTIZ MOTOS
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-md border space-y-3">
          <div>
            <p className="text-sm mb-1">
              <strong>Fornecedor:</strong> MOTIZ MOTOS
            </p>
            <p className="text-sm mb-1">
              <strong>ID:</strong> {supplierId}
            </p>
          </div>

          <div className="pt-2 border-t">
            <p className="text-sm font-semibold mb-2">Status da Wallet:</p>
            {isLoadingWallet ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verificando...
              </div>
            ) : currentWallet ? (
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-yellow-700">
                  Wallet existente: <code className="bg-yellow-100 px-1 rounded">{currentWallet}</code>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Pronto para criar nova wallet
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground pt-2 border-t">
            ℹ️ Isso criará uma subconta (wallet) no Asaas Sandbox para permitir splits de pagamento.
          </p>
        </div>

        <div className="flex gap-2">
          {currentWallet && (
            <Button
              onClick={handleClearWallet}
              disabled={isLoading}
              variant="outline"
              className="flex-1 border-yellow-300 text-yellow-700 hover:bg-yellow-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Limpando...
                </>
              ) : (
                <>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Limpar Wallet Antiga
                </>
              )}
            </Button>
          )}
          
          <Button
            onClick={handleCreateWallet}
            disabled={isLoading || !!currentWallet}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando wallet...
              </>
            ) : (
              <>
                <Wallet className="mr-2 h-4 w-4" />
                {currentWallet ? 'Limpe a wallet antiga primeiro' : 'Criar Wallet Asaas'}
              </>
            )}
          </Button>
        </div>

        {result && (
          <div className="bg-white p-4 rounded-md border">
            <p className="text-sm font-semibold mb-2">Resultado:</p>
            <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </Card>
  );
};
