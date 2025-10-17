import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wallet } from 'lucide-react';

export const CreateAsaasWalletTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const supplierId = '4399414c-8554-4099-a4d1-fcb17b972256'; // MOTIZ MOTOS

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

      // Aguardar 2 segundos e recarregar a página para ver os dados atualizados
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
            <h3 className="font-semibold text-lg">Teste: Criar Wallet Asaas</h3>
            <p className="text-sm text-muted-foreground">
              Criar wallet Asaas para o fornecedor MOTIZ MOTOS
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-md border">
          <p className="text-sm mb-2">
            <strong>Fornecedor:</strong> MOTIZ MOTOS
          </p>
          <p className="text-sm mb-2">
            <strong>ID:</strong> {supplierId}
          </p>
          <p className="text-sm text-muted-foreground">
            Isso criará uma subconta (wallet) no Asaas Sandbox para permitir splits de pagamento.
          </p>
        </div>

        <Button
          onClick={handleCreateWallet}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Criando wallet...
            </>
          ) : (
            <>
              <Wallet className="mr-2 h-4 w-4" />
              Criar Wallet Asaas
            </>
          )}
        </Button>

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
