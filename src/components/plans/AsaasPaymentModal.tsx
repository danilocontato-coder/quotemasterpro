import { useState } from 'react';
import { Copy, ExternalLink, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface AsaasPaymentModalProps {
  open: boolean;
  onClose: () => void;
  planName: string;
  planPrice: number;
  paymentData: {
    payment_url?: string;
    payment_barcode?: string;
    qr_code?: string;
    subscription_id: string;
  };
}

export function AsaasPaymentModal({
  open,
  onClose,
  planName,
  planPrice,
  paymentData
}: AsaasPaymentModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(paymentData.payment_barcode ? 'boleto' : 'pix');

  const handleCopy = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copiado!",
        description: `${type} copiado para a área de transferência`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar",
        variant: "destructive",
      });
    }
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Complete seu pagamento</DialogTitle>
          <DialogDescription>
            Plano: {planName} - R$ {planPrice.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            {paymentData.payment_barcode && (
              <TabsTrigger value="boleto">Boleto</TabsTrigger>
            )}
            {paymentData.qr_code && (
              <TabsTrigger value="pix">PIX</TabsTrigger>
            )}
          </TabsList>

          {paymentData.payment_barcode && (
            <TabsContent value="boleto" className="space-y-4 mt-4">
              <div className="space-y-3">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Código de barras:</p>
                  <p className="text-xs font-mono break-all">{paymentData.payment_barcode}</p>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleCopy(paymentData.payment_barcode!, 'Código de barras')}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Código
                  </Button>
                  
                  {paymentData.payment_url && (
                    <Button
                      variant="default"
                      className="flex-1"
                      onClick={() => window.open(paymentData.payment_url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Visualizar Boleto
                    </Button>
                  )}
                </div>

                <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/50 rounded">
                  <p>• O boleto pode levar até 48h para compensar</p>
                  <p>• Você pode pagar em qualquer banco ou lotérica</p>
                  <p>• Após a compensação, seu plano será ativado automaticamente</p>
                </div>
              </div>
            </TabsContent>
          )}

          {paymentData.qr_code && (
            <TabsContent value="pix" className="space-y-4 mt-4">
              <div className="space-y-3">
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <img 
                    src={paymentData.qr_code} 
                    alt="QR Code PIX" 
                    className="w-48 h-48"
                  />
                </div>
                
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleCopy(paymentData.qr_code!, 'Chave PIX')}
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Copiar Código PIX
                </Button>

                <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/50 rounded">
                  <p>• Pagamento compensado em tempo real</p>
                  <p>• Escaneie o QR Code ou copie o código PIX</p>
                  <p>• Após o pagamento, seu plano será ativado imediatamente</p>
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>

        <div className="border-t pt-4 space-y-3">
          <p className="text-sm text-muted-foreground text-center">
            Após o pagamento, seu plano será ativado automaticamente
          </p>
          
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Fechar
            </Button>
            <Button variant="default" className="flex-1" onClick={handleReload}>
              Já paguei, recarregar página
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
