import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, Mail, MessageSquare, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WalletSetupAlertProps {
  walletId: string | null;
  walletConfigured?: boolean;
  onWalletCreated?: () => void;
}

export function WalletSetupAlert({ walletId, walletConfigured = true, onWalletCreated }: WalletSetupAlertProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [createdWalletId, setCreatedWalletId] = useState<string | null>(null);

  // Validar se é um wallet real (não UUID interno)
  const isValidWallet = walletId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(walletId);

  // Mostrar alerta se wallet não está configurado OU se o backend reportou que não está configurado
  const shouldShowAlert = !isValidWallet || !walletConfigured;

  const handleCreateWallet = async () => {
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-asaas-subaccount', {
        body: {}
      });

      if (error) throw error;

      if (data.success) {
        setCreatedWalletId(data.walletId);
        setShowInstructions(true);
        toast.success('Subconta Asaas criada com sucesso!', {
          description: 'Verifique seu e-mail e SMS para completar a ativação.'
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

  // Mostrar instruções após criação bem-sucedida
  if (showInstructions && createdWalletId) {
    const asaasUrl = import.meta.env.VITE_ASAAS_ENVIRONMENT === 'production' 
      ? 'https://www.asaas.com' 
      : 'https://sandbox.asaas.com';

    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="space-y-1">
              <CardTitle className="text-green-900">Subconta Asaas Criada com Sucesso!</CardTitle>
              <CardDescription className="text-green-800">
                ID da Subconta: <code className="font-mono text-xs bg-green-100 px-2 py-0.5 rounded">{createdWalletId}</code>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <p className="text-sm text-green-900 font-medium">Para completar a ativação da sua carteira:</p>
            
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm text-green-800">
                <Mail className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>1. Verifique seu e-mail</strong>
                  <p className="text-xs mt-0.5">Você receberá um e-mail do Asaas para criar sua senha de acesso</p>
                </div>
              </div>

              <div className="flex items-start gap-2 text-sm text-green-800">
                <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>2. Use o código SMS</strong>
                  <p className="text-xs mt-0.5">O código SMS que você recebeu será solicitado durante a ativação da conta</p>
                </div>
              </div>

              <div className="flex items-start gap-2 text-sm text-green-800">
                <ExternalLink className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>3. Acesse o painel Asaas</strong>
                  <p className="text-xs mt-0.5">Após criar sua senha, você poderá acessar sua conta e gerenciar seus recebimentos</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              className="text-green-700 border-green-300 hover:bg-green-100"
              onClick={() => window.open(asaasUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir Painel Asaas
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.location.reload()}
            >
              Atualizar Página
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Não mostrar nada se wallet está configurado corretamente
  if (!shouldShowAlert) {
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
