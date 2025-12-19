import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, Shield, CheckCircle2 } from 'lucide-react';

interface SupplierDeliveryConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deliveryId?: string;
  quoteLocalCode?: string;
  clientName?: string;
  onConfirmed?: () => void;
}

export const SupplierDeliveryConfirmationModal = ({ 
  open, 
  onOpenChange, 
  deliveryId,
  quoteLocalCode,
  clientName,
  onConfirmed 
}: SupplierDeliveryConfirmationModalProps) => {
  const [confirmationCode, setConfirmationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleConfirmDelivery = async () => {
    console.log('🎯 [SUPPLIER-MODAL] Fornecedor confirmando entrega', {
      confirmation_code: confirmationCode.trim(),
      delivery_id: deliveryId,
      timestamp: new Date().toISOString()
    });

    if (!confirmationCode.trim()) {
      toast({
        title: "Código obrigatório",
        description: "Por favor, insira o código que o cliente informou.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('confirm-delivery', {
        body: {
          confirmation_code: confirmationCode.trim()
        }
      });

      console.log('📡 [SUPPLIER-MODAL] Resposta recebida', {
        success: !error,
        has_data: !!data,
        error: error?.message
      });

      if (error) {
        throw error;
      }

      if (data?.error || data?.code) {
        throw new Error(data?.error || 'Erro desconhecido');
      }

      toast({
        title: "✅ Entrega Confirmada!",
        description: "A entrega foi confirmada e o pagamento será liberado para sua conta.",
      });

      setConfirmationCode('');
      onOpenChange(false);
      onConfirmed?.();

    } catch (error: any) {
      console.error('❌ [SUPPLIER-MODAL] Erro ao confirmar', error);
      
      let errorMessage = error.message || "Não foi possível confirmar a entrega.";
      
      if (error.message?.includes('já foi utilizado')) {
        errorMessage = "Este código já foi utilizado. A entrega já foi confirmada anteriormente.";
      } else if (error.message?.includes('expirou')) {
        errorMessage = "Este código expirou. Entre em contato com o cliente para verificar.";
      } else if (error.message?.includes('não encontrado')) {
        errorMessage = "Código inválido. Verifique se o cliente informou corretamente.";
      } else if (error.message?.includes('permissão')) {
        errorMessage = "Você só pode confirmar entregas das suas cotações.";
      }
      
      toast({
        title: "Erro na confirmação",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Confirmar Entrega Realizada
          </DialogTitle>
          <DialogDescription>
            {quoteLocalCode && clientName 
              ? `Cotação ${quoteLocalCode} - ${clientName}`
              : 'Digite o código que o cliente informou para confirmar a entrega'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
            <Shield className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-green-900 dark:text-green-100 mb-1">Como funciona?</p>
              <p className="text-green-700 dark:text-green-300">
                Ao realizar a entrega, o cliente informa o código de 6 dígitos que recebeu. 
                Digite esse código aqui para confirmar que a entrega foi realizada. 
                O pagamento será liberado automaticamente para sua conta.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmationCode">Código informado pelo cliente</Label>
            <Input
              id="confirmationCode"
              type="text"
              placeholder="Digite os 6 dígitos"
              maxLength={6}
              pattern="[0-9]{6}"
              value={confirmationCode}
              onChange={(e) => setConfirmationCode(e.target.value.replace(/\D/g, ''))}
              className="text-center text-2xl font-mono tracking-[0.5em] h-14"
            />
            <p className="text-xs text-muted-foreground">
              O cliente recebeu este código por e-mail e WhatsApp quando a entrega foi agendada
            </p>
          </div>

          <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-xs text-blue-700 dark:text-blue-300">
              <p className="font-medium">Após a confirmação:</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>O status da entrega será atualizado para "Entregue"</li>
                <li>O pagamento será transferido para sua conta</li>
                <li>O cliente receberá uma notificação</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmDelivery}
              disabled={isLoading || confirmationCode.length !== 6}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isLoading ? "Confirmando..." : "Confirmar Entrega"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
