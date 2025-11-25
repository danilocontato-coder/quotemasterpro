import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WalletSetupAlertProps {
  walletId: string | null;
  onWalletCreated?: () => void;
}

export function WalletSetupAlert({ walletId, onWalletCreated }: WalletSetupAlertProps) {
  const [isCreating, setIsCreating] = useState(false);

  // Validar se é um wallet real (não UUID interno)
  const isValidWallet = walletId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(walletId);

  const handleCreateWallet = async () => {
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-asaas-subaccount', {
        body: {}
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Wallet Asaas configurada com sucesso!', {
          description: 'Agora você pode receber transferências.'
        });
        onWalletCreated?.();
      } else {
        throw new Error(data.error || 'Erro ao criar wallet');
      }
    } catch (error) {
      console.error('Erro ao criar wallet:', error);
      toast.error('Erro ao configurar wallet', {
        description: error.message || 'Tente novamente ou entre em contato com o suporte.'
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Não mostrar nada se já tiver wallet válido
  if (isValidWallet) {
    return null;
  }

  return (
    <Alert variant="destructive" className="border-amber-200 bg-amber-50">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-900">Wallet Asaas não configurada</AlertTitle>
      <AlertDescription className="text-amber-800 space-y-3">
        <p>
          Sua subconta Asaas ainda não foi criada. Você não poderá receber transferências até configurar.
        </p>
        <Button 
          onClick={handleCreateWallet} 
          disabled={isCreating}
          size="sm"
          className="bg-amber-600 hover:bg-amber-700"
        >
          {isCreating ? 'Configurando...' : 'Configurar Wallet Agora'}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
