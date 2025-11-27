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
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Copy, 
  Upload, 
  AlertCircle, 
  Check, 
  QrCode, 
  Building2, 
  Smartphone,
  FileText,
  Camera
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface DirectPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: {
    id: string;
    amount: number;
    base_amount?: number;
    supplier_id: string;
    quotes?: {
      local_code?: string;
    };
  };
  supplierName: string;
  pixKey?: string | null;
  bankData?: {
    bank_code?: string;
    bank_name?: string;
    agency?: string;
    account_number?: string;
    account_type?: string;
    account_holder_name?: string;
    account_holder_document?: string;
  } | null;
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

export const DirectPaymentModal = ({
  isOpen,
  onClose,
  payment,
  supplierName,
  pixKey,
  bankData,
  onSuccess,
}: DirectPaymentModalProps) => {
  const [paymentMethod, setPaymentMethod] = useState(pixKey ? 'pix' : '');
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();

  const hasPixKey = !!pixKey;
  const hasBankData = !!(bankData?.account_number && bankData?.agency);
  const paymentAmount = payment.base_amount || payment.amount;

  // Gerar payload PIX com valor embutido
  const pixPayload = useMemo(() => {
    if (!pixKey) return '';
    try {
      return generatePixPayload(
        pixKey,
        paymentAmount,
        supplierName,
        `PAY${payment.id.substring(0, 8)}`
      );
    } catch (error) {
      console.error('Erro ao gerar payload PIX:', error);
      return pixKey;
    }
  }, [pixKey, paymentAmount, supplierName, payment.id]);

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
      const files = Array.from(e.target.files);
      const maxSize = 10 * 1024 * 1024;
      const validFiles = files.filter(f => f.size <= maxSize);
      
      if (validFiles.length < files.length) {
        toast({
          title: 'Arquivo muito grande',
          description: 'Alguns arquivos excedem 10MB e foram ignorados',
          variant: 'destructive',
        });
      }
      
      setAttachments(prev => [...prev, ...validFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!paymentMethod) {
      toast({
        title: 'Selecione o método de pagamento',
        variant: 'destructive',
      });
      return;
    }

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
          payment_method: paymentMethod,
          transaction_id: transactionId || null,
          offline_notes: notes || null,
          offline_attachments: uploadedUrls,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      if (updateError) throw updateError;

      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'DIRECT_PAYMENT_SUBMITTED',
          entity_type: 'payments',
          entity_id: payment.id,
          panel_type: 'client',
          details: {
            payment_id: payment.id,
            method: paymentMethod,
            pix_key: pixKey,
            transaction_id: transactionId,
            attachments_count: uploadedUrls.length,
          },
        });
      }

      toast({
        title: 'Pagamento registrado',
        description: 'O fornecedor foi notificado e precisa confirmar o recebimento',
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error submitting payment:', error);
      toast({
        title: 'Erro ao registrar pagamento',
        description: 'Tente novamente ou entre em contato com o suporte',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const paymentMethods = [
    { value: 'pix', label: 'PIX', icon: Smartphone },
    { value: 'bank_transfer', label: 'Transferência Bancária', icon: Building2 },
    { value: 'cash', label: 'Dinheiro', icon: null },
    { value: 'check', label: 'Cheque', icon: null },
    { value: 'other', label: 'Outro', icon: null },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            💰 Pagar Direto ao Fornecedor
          </DialogTitle>
          <DialogDescription>
            {hasPixKey 
              ? 'Escaneie o QR Code ou copie o código PIX para pagar'
              : 'Realize o pagamento e anexe o comprovante'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Info Summary */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Cotação</p>
                  <p className="font-medium">{payment.quotes?.local_code || payment.id.substring(0, 8)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fornecedor</p>
                  <p className="font-medium">{supplierName}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* VALOR em Destaque */}
          <div className="text-center py-4 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm text-muted-foreground mb-1">Valor a Pagar</p>
            <p className="text-3xl font-bold text-primary">{formatCurrency(paymentAmount)}</p>
          </div>

          {/* QR Code PIX (se tiver chave) */}
          {hasPixKey && pixKey && (
            <>
              <div className="flex flex-col items-center gap-3 p-4 bg-white dark:bg-background rounded-lg border-2 border-primary/30">
                <div className="flex items-center gap-2 text-primary">
                  <QrCode className="h-5 w-5" />
                  <span className="font-semibold">PIX com QR Code</span>
                </div>
                
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <QRCode value={pixPayload} size={180} level="M" />
                </div>
                
                <p className="text-xs text-muted-foreground text-center">
                  QR Code com valor já incluído - escaneie no app do banco
                </p>
              </div>

              {/* Copia e Cola */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">PIX Copia e Cola</Label>
                <div className="flex gap-2">
                  <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-xs break-all max-h-16 overflow-y-auto">
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

              <Separator />
            </>
          )}

          {/* Dados Bancários (se não tiver PIX mas tiver dados bancários) */}
          {!hasPixKey && hasBankData && bankData && (
            <>
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Dados Bancários</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Banco</p>
                    <p className="font-medium">{bankData.bank_name || bankData.bank_code}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Agência</p>
                    <p className="font-medium">{bankData.agency}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Conta</p>
                    <p className="font-medium">{bankData.account_number}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tipo</p>
                    <p className="font-medium capitalize">{bankData.account_type || 'Corrente'}</p>
                  </div>
                  {bankData.account_holder_name && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Titular</p>
                      <p className="font-medium">{bankData.account_holder_name}</p>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Aviso se não tem nenhum dado */}
          {!hasPixKey && !hasBankData && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-semibold mb-1">Fornecedor sem dados de pagamento cadastrados</p>
                  <p>Entre em contato com o fornecedor para obter os dados de pagamento e registre abaixo.</p>
                </div>
              </div>
            </div>
          )}

          {/* Instruções */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-semibold mb-1">Após realizar o pagamento:</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Tire print ou baixe o comprovante</li>
                  <li>Anexe abaixo</li>
                  <li>Aguarde confirmação do fornecedor</li>
                </ol>
              </div>
            </div>
          </div>

          <Separator />

          {/* Método de Pagamento */}
          <div className="space-y-2">
            <Label>Método de Pagamento *</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Upload de Comprovante */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Comprovante de Pagamento *
            </Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-2">
                Arraste ou clique para enviar
              </p>
              <Input
                type="file"
                accept="image/*,.pdf"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="proof-upload"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('proof-upload')?.click()}
              >
                <Camera className="h-4 w-4 mr-2" />
                Selecionar Arquivo
              </Button>
            </div>
            
            {attachments.length > 0 && (
              <div className="space-y-2 mt-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm truncate">{file.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttachment(index)}
                    >
                      Remover
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ID da Transação */}
          <div className="space-y-2">
            <Label htmlFor="transaction-id" className="text-sm font-medium">
              ID da Transação (opcional)
            </Label>
            <Input
              id="transaction-id"
              placeholder="Código PIX, número do comprovante..."
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
            />
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Observações (opcional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Informações adicionais..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[60px]"
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isUploading || !paymentMethod}>
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
