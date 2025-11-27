import React, { useState, useMemo } from 'react';
import QRCode from 'react-qr-code';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Copy, Upload, AlertCircle, Check } from 'lucide-react';
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

// Gerar código PIX "Copia e Cola" no formato BR Code EMV com valor embutido
function generatePixPayload(
  pixKey: string, 
  amount: number, 
  merchantName: string,
  description?: string
): string {
  const formatField = (id: string, value: string): string => {
    const length = value.length.toString().padStart(2, '0');
    return `${id}${length}${value}`;
  };

  const pixKeyClean = pixKey.replace(/[^\w@.+-]/g, '');
  
  // Merchant Account Information (ID 26)
  const gui = formatField('00', 'br.gov.bcb.pix');
  const chavePix = formatField('01', pixKeyClean);
  const merchantAccountInfo = formatField('26', gui + chavePix);

  const amountStr = amount.toFixed(2);

  const payloadFormatIndicator = formatField('00', '01');
  const pointOfInitiation = formatField('01', '12');
  const merchantCategoryCode = formatField('52', '0000');
  const transactionCurrency = formatField('53', '986');
  const transactionAmount = formatField('54', amountStr);
  const countryCode = formatField('58', 'BR');
  const merchantNameField = formatField('59', merchantName.substring(0, 25).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  const merchantCity = formatField('60', 'BRASIL');
  
  const txid = formatField('05', (description || 'COTIZ').substring(0, 25).replace(/[^A-Za-z0-9]/g, ''));
  const additionalDataField = formatField('62', txid);

  const payloadWithoutCRC = 
    payloadFormatIndicator +
    pointOfInitiation +
    merchantAccountInfo +
    merchantCategoryCode +
    transactionCurrency +
    transactionAmount +
    countryCode +
    merchantNameField +
    merchantCity +
    additionalDataField +
    '6304';

  const crc = calculateCRC16(payloadWithoutCRC);
  
  return payloadWithoutCRC.slice(0, -4) + formatField('63', crc);
}

function calculateCRC16(str: string): string {
  let crc = 0xFFFF;
  const polynomial = 0x1021;

  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc <<= 1;
      }
      crc &= 0xFFFF;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function formatPixKeyDisplay(pixKey: string): string {
  const cleanKey = pixKey.replace(/[^\w@.+-]/g, '');
  
  if (/^\d{11}$/.test(cleanKey)) {
    return cleanKey.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (/^\d{14}$/.test(cleanKey)) {
    return cleanKey.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  if (/^(\+55)?\d{10,11}$/.test(cleanKey)) {
    const phone = cleanKey.replace(/^\+55/, '');
    if (phone.length === 11) {
      return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return phone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  
  return pixKey;
}

function getPixKeyType(pixKey: string): string {
  const cleanKey = pixKey.replace(/[^\w@.+-]/g, '');
  
  if (/^\d{11}$/.test(cleanKey)) return 'CPF';
  if (/^\d{14}$/.test(cleanKey)) return 'CNPJ';
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanKey)) return 'E-mail';
  if (/^(\+55)?\d{10,11}$/.test(cleanKey)) return 'Telefone';
  if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(cleanKey)) return 'Chave Aleatória';
  
  return 'Chave PIX';
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
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();

  // Gerar payload PIX com valor embutido
  const pixPayload = useMemo(() => {
    try {
      return generatePixPayload(
        pixKey,
        payment.amount,
        supplierName,
        `PAY${payment.id.substring(0, 8)}`
      );
    } catch (error) {
      console.error('Erro ao gerar payload PIX:', error);
      return pixKey; // Fallback para chave simples
    }
  }, [pixKey, payment.amount, supplierName, payment.id]);

  const handleCopy = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast({
        title: `${fieldName} copiado!`,
        description: 'Pronto para colar no app do seu banco',
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast({
        title: 'Erro ao copiar',
        variant: 'destructive',
      });
    }
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
      const uploadedUrls: string[] = [];
      
      for (const file of attachments) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${payment.id}-${Date.now()}.${fileExt}`;
        const filePath = `payment-proofs/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('attachments')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            💰 Pagar via PIX
          </DialogTitle>
          <DialogDescription>
            Escaneie o QR Code ou copie o código PIX para pagar {supplierName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* QR Code com valor embutido */}
          <div className="flex flex-col items-center gap-3 p-4 bg-white rounded-lg border">
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <QRCode value={pixPayload} size={180} level="M" />
            </div>
            <Badge variant="default" className="text-lg px-4 py-1">
              {formatCurrency(payment.amount)}
            </Badge>
            <p className="text-xs text-muted-foreground text-center">
              QR Code com valor já incluído - escaneie direto no app do banco
            </p>
          </div>

          <Separator />

          {/* Copia e Cola */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">PIX Copia e Cola (com valor)</Label>
            <div className="flex gap-2">
              <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-xs break-all max-h-20 overflow-y-auto">
                {pixPayload}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(pixPayload, 'Código PIX')}
                className="flex-shrink-0"
              >
                {copiedField === 'Código PIX' ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Chave PIX */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Chave PIX</Label>
              <Badge variant="secondary" className="text-xs">{getPixKeyType(pixKey)}</Badge>
            </div>
            <div className="flex gap-2">
              <Input 
                value={formatPixKeyDisplay(pixKey)} 
                readOnly 
                className="font-mono text-sm bg-muted" 
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopy(pixKey.replace(/[^\w@.+-]/g, ''), 'Chave PIX')}
              >
                {copiedField === 'Chave PIX' ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Beneficiário */}
          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <p className="text-muted-foreground">Beneficiário</p>
            <p className="font-medium">{supplierName}</p>
          </div>

          <Separator />

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
            <Label htmlFor="proof" className="text-sm font-medium">
              Comprovante de Pagamento *
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
            <Label htmlFor="transaction-id" className="text-sm font-medium">
              ID da Transação PIX (opcional)
            </Label>
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
            <Label htmlFor="notes" className="text-sm font-medium">
              Observações (opcional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Adicione informações adicionais sobre o pagamento..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 min-h-[60px]"
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
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
