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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Copy, 
  AlertCircle, 
  Check, 
  QrCode, 
  Building2, 
  AlertTriangle,
  ShieldCheck,
  Lock,
  ArrowRight
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
  const [step, setStep] = useState<'warning' | 'payment'>('warning');
  const [acceptedRisk, setAcceptedRisk] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleProceed = () => {
    if (acceptedRisk) {
      setStep('payment');
    }
  };

  const handleConfirmPayment = async () => {
    setIsSubmitting(true);

    try {
      // Atualiza o pagamento para aguardar confirmação manual
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          status: 'manual_confirmation',
          payment_method: hasPixKey ? 'pix' : 'bank_transfer',
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      if (updateError) throw updateError;

      // Registra log de auditoria
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
            method: hasPixKey ? 'pix' : 'bank_transfer',
            pix_key: pixKey,
          },
        });
      }

      // Criar notificação para o fornecedor
      await supabase.from('notifications').insert({
        user_id: payment.supplier_id,
        title: 'Pagamento Direto Realizado',
        message: `O cliente informou que realizou o pagamento de ${formatCurrency(paymentAmount)} referente à cotação ${payment.quotes?.local_code || payment.id.substring(0, 8)}. Verifique sua conta e confirme o recebimento.`,
        type: 'payment',
        reference_id: payment.id,
        reference_type: 'payments',
      });

      toast({
        title: 'Pagamento informado!',
        description: 'O fornecedor foi notificado e irá confirmar o recebimento.',
      });

      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast({
        title: 'Erro ao confirmar pagamento',
        description: 'Tente novamente ou entre em contato com o suporte',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep('warning');
    setAcceptedRisk(false);
    setCopiedField(null);
    onClose();
  };

  // TELA 1: Avisos de Risco
  const WarningStep = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Pagar Direto ao Fornecedor
        </DialogTitle>
        <DialogDescription>
          Pagamento sem a proteção de custódia da plataforma
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {/* ⚠️ ALERTA DE RISCO */}
        <Alert variant="destructive" className="border-red-300 bg-red-50 dark:bg-red-950/30">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="text-red-800 dark:text-red-200">Pagamento Sem Proteção</AlertTitle>
          <AlertDescription className="text-red-700 dark:text-red-300">
            <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
              <li><strong>Sem garantia de reembolso</strong> em caso de problemas</li>
              <li>Fundos transferidos <strong>diretamente</strong>, sem custódia</li>
              <li>A plataforma <strong>não pode mediar</strong> disputas</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* 💚 RECOMENDAÇÃO - Pagar com Segurança */}
        <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-6 w-6 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-green-900 dark:text-green-100">
                Recomendamos: Pagar com Segurança
              </p>
              <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                Use o botão <strong>"Pagar com Segurança"</strong> para ter proteção total. 
                O valor fica em custódia até você confirmar a entrega.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900"
                onClick={handleClose}
              >
                <Lock className="h-4 w-4 mr-2" />
                Voltar e Pagar com Segurança
              </Button>
            </div>
          </div>
        </div>

        <Separator className="my-2" />

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

        {/* ☑️ CHECKBOX DE CONFIRMAÇÃO DE RISCO */}
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <Checkbox 
            id="accept-risk" 
            checked={acceptedRisk}
            onCheckedChange={(checked) => setAcceptedRisk(checked === true)}
            className="mt-0.5"
          />
          <Label 
            htmlFor="accept-risk" 
            className="text-sm text-amber-900 dark:text-amber-200 cursor-pointer leading-relaxed"
          >
            <strong>Entendo e aceito os riscos:</strong> Este pagamento é feito diretamente ao fornecedor, 
            sem a proteção de custódia da plataforma. Em caso de problemas, não haverá garantia de reembolso.
          </Label>
        </div>
      </div>

      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={handleClose}>
          Cancelar
        </Button>
        <Button 
          onClick={handleProceed} 
          disabled={!acceptedRisk}
          variant={acceptedRisk ? "default" : "secondary"}
        >
          Continuar
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </DialogFooter>
    </>
  );

  // TELA 2: QR Code e Dados de Pagamento
  const PaymentStep = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          Dados para Pagamento
        </DialogTitle>
        <DialogDescription>
          Realize o pagamento e depois clique em "Já Paguei"
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {/* Payment Info Summary */}
        <Card className="bg-muted/30">
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="text-muted-foreground">Cotação:</span>{' '}
                <span className="font-medium">{payment.quotes?.local_code || payment.id.substring(0, 8)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Fornecedor:</span>{' '}
                <span className="font-medium">{supplierName}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* VALOR em Destaque */}
        <div className="text-center py-3 bg-primary/5 rounded-lg border border-primary/20">
          <p className="text-sm text-muted-foreground mb-1">Valor a Pagar</p>
          <p className="text-2xl font-bold text-primary">{formatCurrency(paymentAmount)}</p>
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
          </>
        )}

        {/* Dados Bancários (se não tiver PIX mas tiver dados bancários) */}
        {!hasPixKey && hasBankData && bankData && (
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
        )}

        {/* Aviso se não tem nenhum dado */}
        {!hasPixKey && !hasBankData && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-semibold mb-1">Fornecedor sem dados de pagamento cadastrados</p>
                <p>Entre em contato com o fornecedor para obter os dados de pagamento.</p>
              </div>
            </div>
          </div>
        )}

        {/* Info sobre notificação */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p>
                Após clicar em <strong>"Já Paguei"</strong>, o fornecedor será notificado 
                automaticamente para confirmar o recebimento.
              </p>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={() => setStep('warning')}>
          Voltar
        </Button>
        <Button 
          onClick={handleConfirmPayment} 
          disabled={isSubmitting || (!hasPixKey && !hasBankData)}
        >
          {isSubmitting ? (
            'Enviando...'
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Já Paguei
            </>
          )}
        </Button>
      </DialogFooter>
    </>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {step === 'warning' ? <WarningStep /> : <PaymentStep />}
      </DialogContent>
    </Dialog>
  );
};
