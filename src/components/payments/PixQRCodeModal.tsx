import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Copy, Upload, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface PixQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: {
    id: string;
    amount: number;
    supplier_id: string;
  };
  supplierName: string;
  pixKey: string;
  onSuccess?: () => void;
}

export const PixQRCodeModal = ({
  isOpen,
  onClose,
  payment,
  supplierName,
  pixKey,
  onSuccess,
}: PixQRCodeModalProps) => {
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleCopyPixKey = () => {
    navigator.clipboard.writeText(pixKey);
    toast({
      title: 'Chave PIX copiada',
      description: 'A chave PIX foi copiada para a área de transferência',
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  const handleSubmit = async () => {
    if (attachments.length === 0) {
      toast({
        title: 'Comprovante obrigatório',
        description: 'Por favor, anexe o comprovante de pagamento',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Upload attachments to storage
      const uploadedUrls: string[] = [];
      
      for (const file of attachments) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${payment.id}-${Date.now()}.${fileExt}`;
        const filePath = `payment-proofs/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('attachments')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      // Update payment with offline payment info
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          status: 'manual_confirmation',
          payment_method: 'pix',
          transaction_id: transactionId || null,
          offline_notes: notes || null,
          offline_attachments: uploadedUrls,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      if (updateError) throw updateError;

      // Create audit log
      await supabase.from('audit_logs').insert({
        action: 'PAYMENT_PIX_INFORMED',
        entity_type: 'payments',
        entity_id: payment.id,
        panel_type: 'client',
        details: {
          payment_id: payment.id,
          method: 'pix',
          pix_key: pixKey,
          transaction_id: transactionId,
          attachments_count: uploadedUrls.length,
        },
      });

      toast({
        title: 'Pagamento registrado',
        description: 'O fornecedor foi notificado e precisa confirmar o recebimento',
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error submitting PIX payment:', error);
      toast({
        title: 'Erro ao registrar pagamento',
        description: 'Tente novamente ou entre em contato com o suporte',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            💰 Pagar via PIX - {supplierName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* QR Code */}
          <div className="flex flex-col items-center gap-4 p-4 bg-background border rounded-lg">
            <div className="bg-white p-4 rounded-lg">
              <QRCode value={pixKey} size={200} />
            </div>

            {/* PIX Key */}
            <div className="w-full">
              <Label>Chave PIX</Label>
              <div className="flex gap-2 mt-1">
                <Input value={pixKey} readOnly className="font-mono text-sm" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyPixKey}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Amount */}
            <div className="w-full text-center">
              <p className="text-sm text-muted-foreground">Valor</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(payment.amount)}
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-semibold mb-1">Após realizar o pagamento:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Tire print do comprovante</li>
                  <li>Anexe abaixo</li>
                  <li>Aguarde confirmação do fornecedor</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Proof Upload */}
          <div>
            <Label htmlFor="proof" className="required">
              Comprovante de Pagamento
            </Label>
            <div className="mt-1">
              <Input
                id="proof"
                type="file"
                accept="image/*,.pdf"
                multiple
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              {attachments.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {attachments.length} arquivo(s) selecionado(s)
                </p>
              )}
            </div>
          </div>

          {/* Transaction ID */}
          <div>
            <Label htmlFor="transaction-id">ID da Transação PIX (opcional)</Label>
            <Input
              id="transaction-id"
              placeholder="Ex: E12345678202501191234567890AB"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Adicione informações adicionais sobre o pagamento..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isUploading}>
            {isUploading ? (
              <>
                <Upload className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              'Confirmar Pagamento'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
