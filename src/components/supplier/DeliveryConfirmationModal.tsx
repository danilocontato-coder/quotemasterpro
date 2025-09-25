import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, Shield } from 'lucide-react';

interface DeliveryConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmed?: () => void;
}

export const DeliveryConfirmationModal = ({ 
  open, 
  onOpenChange, 
  onConfirmed 
}: DeliveryConfirmationModalProps) => {
  const [confirmationCode, setConfirmationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleConfirmDelivery = async () => {
    if (!confirmationCode.trim()) {
      toast({
        title: "Código obrigatório",
        description: "Por favor, insira o código de confirmação.",
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

      if (error) {
        throw error;
      }

      toast({
        title: "Entrega Confirmada!",
        description: "A entrega foi confirmada com sucesso. O pagamento foi liberado para o fornecedor.",
      });

      setConfirmationCode('');
      onOpenChange(false);
      onConfirmed?.();

    } catch (error: any) {
      console.error('Erro ao confirmar entrega:', error);
      toast({
        title: "Erro na confirmação",
        description: error.message || "Não foi possível confirmar a entrega. Verifique o código e tente novamente.",
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
            Confirmar Recebimento da Entrega
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 mb-1">Como funciona?</p>
              <p className="text-blue-700">
                O fornecedor compartilhará um código de 6 dígitos com você. 
                Digite esse código abaixo para confirmar que recebeu a entrega.
                Após a confirmação, o pagamento será liberado automaticamente.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmationCode">Código de Confirmação</Label>
            <Input
              id="confirmationCode"
              type="text"
              placeholder="Digite o código de 6 dígitos"
              value={confirmationCode}
              onChange={(e) => setConfirmationCode(e.target.value)}
              maxLength={6}
              className="text-center text-lg font-mono tracking-wider"
            />
            <p className="text-xs text-muted-foreground">
              Código fornecido pelo entregador/fornecedor
            </p>
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
              disabled={isLoading || !confirmationCode.trim()}
              className="flex-1"
            >
              {isLoading ? "Confirmando..." : "Confirmar Entrega"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};