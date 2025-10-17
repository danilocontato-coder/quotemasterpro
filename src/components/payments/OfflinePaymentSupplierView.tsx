import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, 
  CheckCircle, 
  Download, 
  FileText, 
  Image as ImageIcon,
  Receipt,
  XCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface OfflinePaymentSupplierViewProps {
  payment: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function OfflinePaymentSupplierView({ 
  payment, 
  open, 
  onOpenChange, 
  onConfirm 
}: OfflinePaymentSupplierViewProps) {
  const [confirmationNotes, setConfirmationNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const { toast } = useToast();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const handleDownloadAttachment = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('attachments')
        .download(filePath);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = filePath.split('/').pop() || 'comprovante';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Download iniciado",
        description: "O arquivo está sendo baixado.",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o arquivo.",
        variant: "destructive"
      });
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return <ImageIcon className="h-8 w-8 text-blue-500" />;
    }
    return <FileText className="h-8 w-8 text-gray-500" />;
  };

  const handleConfirm = async (approve: boolean) => {
    if (!approve && !confirmationNotes.trim()) {
      toast({
        title: "Justificativa necessária",
        description: "Por favor, informe o motivo da rejeição.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setAction(approve ? 'approve' : 'reject');

    try {
      // Call approve_offline_payment function
      const { data, error } = await supabase.rpc('approve_offline_payment', {
        p_payment_id: payment.id,
        p_approved: approve,
        p_notes: confirmationNotes || null
      });

      if (error) throw error;

      toast({
        title: approve ? "Pagamento confirmado" : "Pagamento rejeitado",
        description: approve 
          ? "O pagamento foi confirmado e os fundos serão liberados."
          : "O pagamento foi rejeitado e o cliente será notificado.",
        variant: approve ? "default" : "destructive"
      });

      onConfirm();
      onOpenChange(false);
      setConfirmationNotes("");
      setAction(null);
    } catch (error: any) {
      console.error('Error confirming payment:', error);
      toast({
        title: "Erro ao processar",
        description: error.message || "Não foi possível processar a confirmação.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Confirmar Pagamento Offline
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Summary */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Cotação</p>
                  <p className="font-medium">{payment.quote_local_code || payment.quote_title || `#${payment.quote_id.substring(0, 8)}`}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{payment.client_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor</p>
                  <p className="font-bold text-lg text-green-600">{formatCurrency(payment.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className="bg-yellow-100 text-yellow-800">
                    Confirmação Pagamento Manual
                  </Badge>
                </div>
              </div>

              {payment.payment_method && (
                <div>
                  <p className="text-sm text-muted-foreground">Método de Pagamento</p>
                  <p className="font-medium capitalize">Pix</p>
                </div>
              )}

              {payment.transaction_id && (
                <div>
                  <p className="text-sm text-muted-foreground">ID da Transação</p>
                  <p className="font-mono text-sm bg-gray-50 p-2 rounded">{payment.transaction_id}</p>
                </div>
              )}

              {payment.offline_notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Observações do Cliente</p>
                  <p className="text-sm bg-gray-50 p-3 rounded">{payment.offline_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Warning Box */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-amber-900 mb-1">Confirmação Necessária</p>
                <p className="text-sm text-amber-800">
                  O cliente informou que já realizou o pagamento offline. Revise os comprovantes anexados e confirme 
                  apenas se você realmente recebeu o valor. Após a confirmação, a entrega será autorizada automaticamente.
                </p>
              </div>
            </div>
          </div>

          {/* Attachments */}
          {payment.offline_attachments && payment.offline_attachments.length > 0 && (
            <div className="space-y-3">
              <Label>Comprovantes de Pagamento ({payment.offline_attachments.length})</Label>
              <div className="grid grid-cols-1 gap-3">
                {payment.offline_attachments.map((filePath: string, index: number) => {
                  const fileName = filePath.split('/').pop() || 'Arquivo';
                  return (
                    <Card key={index} className="hover:bg-gray-50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            {getFileIcon(fileName)}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{fileName}</p>
                              <p className="text-xs text-muted-foreground">
                                Comprovante de pagamento
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadAttachment(filePath)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Baixar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Confirmation Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (obrigatório em caso de rejeição)</Label>
            <Textarea
              id="notes"
              placeholder="Adicione observações sobre a confirmação ou motivo da rejeição..."
              value={confirmationNotes}
              onChange={(e) => setConfirmationNotes(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleConfirm(false)}
            disabled={isLoading || action === 'approve'}
          >
            {isLoading && action === 'reject' ? (
              "Rejeitando..."
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                Rejeitar Pagamento
              </>
            )}
          </Button>
          <Button
            onClick={() => handleConfirm(true)}
            disabled={isLoading || action === 'reject'}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading && action === 'approve' ? (
              "Confirmando..."
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirmar Recebimento
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
