import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Copy, Check, QrCode, Building2, Smartphone, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import QRCode from "react-qr-code";

interface BankData {
  bank_code?: string;
  bank_name?: string;
  agency?: string;
  account_number?: string;
  account_type?: string;
  account_holder_name?: string;
  account_holder_document?: string;
}

interface DirectPaymentDetailsProps {
  supplierName: string;
  pixKey?: string;
  bankData?: BankData;
  amount: number;
  quoteReference?: string;
  onCopySuccess?: () => void;
}

// Gerar código PIX "Copia e Cola" no formato BR Code EMV
function generatePixPayload(
  pixKey: string, 
  amount: number, 
  merchantName: string,
  description?: string
): string {
  // Função auxiliar para formatar campos EMV
  const formatField = (id: string, value: string): string => {
    const length = value.length.toString().padStart(2, '0');
    return `${id}${length}${value}`;
  };

  // Detectar tipo de chave e formatar
  const pixKeyClean = pixKey.replace(/[^\w@.+-]/g, '');
  
  // Merchant Account Information (ID 26)
  const gui = formatField('00', 'br.gov.bcb.pix'); // GUI do PIX
  const chavePix = formatField('01', pixKeyClean); // Chave PIX
  const merchantAccountInfo = formatField('26', gui + chavePix);

  // Valor formatado com 2 casas decimais
  const amountStr = amount.toFixed(2);

  // Campos principais
  const payloadFormatIndicator = formatField('00', '01'); // Versão
  const pointOfInitiation = formatField('01', '12'); // Dinâmico (12) para pagamento único
  const merchantCategoryCode = formatField('52', '0000'); // MCC genérico
  const transactionCurrency = formatField('53', '986'); // BRL
  const transactionAmount = formatField('54', amountStr);
  const countryCode = formatField('58', 'BR');
  const merchantNameField = formatField('59', merchantName.substring(0, 25).toUpperCase());
  const merchantCity = formatField('60', 'BRASIL');
  
  // Additional Data Field (ID 62)
  const txid = formatField('05', (description || 'COTIZ').substring(0, 25).replace(/[^A-Za-z0-9]/g, ''));
  const additionalDataField = formatField('62', txid);

  // Montar payload sem CRC
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
    '6304'; // Placeholder para CRC

  // Calcular CRC16-CCITT
  const crc = calculateCRC16(payloadWithoutCRC);
  
  return payloadWithoutCRC.slice(0, -4) + formatField('63', crc);
}

// Calcular CRC16-CCITT (XModem)
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

// Formatar chave PIX para exibição
function formatPixKeyDisplay(pixKey: string): string {
  const cleanKey = pixKey.replace(/[^\w@.+-]/g, '');
  
  // CPF
  if (/^\d{11}$/.test(cleanKey)) {
    return cleanKey.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  // CNPJ
  if (/^\d{14}$/.test(cleanKey)) {
    return cleanKey.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  // Telefone
  if (/^(\+55)?\d{10,11}$/.test(cleanKey)) {
    const phone = cleanKey.replace(/^\+55/, '');
    if (phone.length === 11) {
      return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return phone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  
  return pixKey;
}

// Detectar tipo de chave
function getPixKeyType(pixKey: string): string {
  const cleanKey = pixKey.replace(/[^\w@.+-]/g, '');
  
  if (/^\d{11}$/.test(cleanKey)) return 'CPF';
  if (/^\d{14}$/.test(cleanKey)) return 'CNPJ';
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanKey)) return 'E-mail';
  if (/^(\+55)?\d{10,11}$/.test(cleanKey)) return 'Telefone';
  if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(cleanKey)) return 'Chave Aleatória';
  
  return 'Chave PIX';
}

export function DirectPaymentDetails({
  supplierName,
  pixKey,
  bankData,
  amount,
  quoteReference,
  onCopySuccess
}: DirectPaymentDetailsProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const hasPixKey = pixKey && pixKey.trim() !== '';
  const hasBankData = bankData && bankData.account_number && bankData.agency;

  // Gerar payload PIX com valor embutido
  const pixPayload = useMemo(() => {
    if (!hasPixKey) return null;
    try {
      return generatePixPayload(
        pixKey!,
        amount,
        supplierName,
        quoteReference
      );
    } catch (error) {
      console.error('Erro ao gerar payload PIX:', error);
      return null;
    }
  }, [pixKey, amount, supplierName, quoteReference]);

  const handleCopy = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast.success(`${fieldName} copiado!`);
      onCopySuccess?.();
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast.error('Erro ao copiar');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (!hasPixKey && !hasBankData) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Dados de pagamento não disponíveis</p>
              <p className="text-sm text-muted-foreground mt-1">
                O fornecedor não configurou dados bancários ou chave PIX. Entre em contato diretamente para obter as informações de pagamento.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const defaultTab = hasPixKey ? 'pix' : 'bank';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>Dados para Pagamento Direto</span>
          <Badge variant="outline" className="font-normal">
            {formatCurrency(amount)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pix" disabled={!hasPixKey} className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              PIX
            </TabsTrigger>
            <TabsTrigger value="bank" disabled={!hasBankData} className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Transferência
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pix" className="space-y-4 mt-4">
            {hasPixKey && (
              <>
                {/* QR Code */}
                {pixPayload && (
                  <div className="flex flex-col items-center p-4 bg-white rounded-lg border">
                    <QRCode 
                      value={pixPayload} 
                      size={180}
                      level="M"
                    />
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Escaneie o QR Code com o app do seu banco
                    </p>
                    <Badge variant="secondary" className="mt-2">
                      Valor: {formatCurrency(amount)}
                    </Badge>
                  </div>
                )}

                <Separator />

                {/* Copia e Cola */}
                {pixPayload && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">PIX Copia e Cola</Label>
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
                )}

                <Separator />

                {/* Chave PIX */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Chave PIX</Label>
                    <Badge variant="secondary">{getPixKeyType(pixKey!)}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 p-3 bg-muted rounded-lg font-medium">
                      {formatPixKeyDisplay(pixKey!)}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(pixKey!.replace(/[^\w@.+-]/g, ''), 'Chave PIX')}
                      className="flex-shrink-0"
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
              </>
            )}
          </TabsContent>

          <TabsContent value="bank" className="space-y-4 mt-4">
            {hasBankData && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {/* Banco */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Banco</Label>
                    <p className="font-medium">
                      {bankData.bank_code && `${bankData.bank_code} - `}
                      {bankData.bank_name || 'Não informado'}
                    </p>
                  </div>

                  {/* Tipo de Conta */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Tipo de Conta</Label>
                    <p className="font-medium">
                      {bankData.account_type === 'checking' ? 'Corrente' : 
                       bankData.account_type === 'savings' ? 'Poupança' : 
                       bankData.account_type || 'Não informado'}
                    </p>
                  </div>

                  {/* Agência */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Agência</Label>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{bankData.agency}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleCopy(bankData.agency!, 'Agência')}
                      >
                        {copiedField === 'Agência' ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Conta */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Conta</Label>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{bankData.account_number}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleCopy(bankData.account_number!, 'Conta')}
                      >
                        {copiedField === 'Conta' ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Beneficiário */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Beneficiário</Label>
                  <p className="font-medium">{bankData.account_holder_name || supplierName}</p>
                  {bankData.account_holder_document && (
                    <p className="text-sm text-muted-foreground">
                      CNPJ/CPF: {bankData.account_holder_document}
                    </p>
                  )}
                </div>

                {/* Valor */}
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Valor a transferir:</span>
                    <span className="font-bold text-lg text-primary">{formatCurrency(amount)}</span>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Label component for consistency
function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={className} {...props}>
      {children}
    </label>
  );
}
