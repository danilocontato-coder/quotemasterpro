import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Calendar, AlertCircle, Building2, Phone, Mail, MapPin, Upload, Info, TrendingUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { calculateCustomerTotal } from "@/lib/asaas-fees";

interface IssueInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
  quoteTitle: string;
  quoteAmount: number;
  freightCost?: number;
  clientData?: {
    name: string;
    cnpj: string;
    email: string;
    phone?: string;
    address?: string;
  };
  quoteItems?: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
}

interface FormData {
  invoiceNumber?: string;
  dueDate: string;
  notes?: string;
}

export function IssueInvoiceModal({
  open,
  onOpenChange,
  quoteId,
  quoteTitle,
  quoteAmount,
  freightCost = 0,
  clientData,
  quoteItems = [],
}: IssueInvoiceModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [nfeFile, setNfeFile] = useState<File | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    }
  });

  // Calcular breakdown de valores
  const itemsSubtotal = quoteItems.reduce((sum, item) => sum + (item.total || 0), 0);
  
  // IMPORTANTE: quote_responses.total_amount JÁ inclui shipping_cost
  // Apenas somar frete se estivermos calculando manualmente dos itens
  const effectiveTotal = quoteAmount > 0 
    ? quoteAmount  // Total da resposta já tem frete incluído
    : itemsSubtotal + freightCost; // Fallback: calcular itens + frete manualmente
  
  const breakdown = calculateCustomerTotal(effectiveTotal, 'UNDEFINED');
  const platformCommission = breakdown.platformCommission;
  const supplierNet = breakdown.supplierNet;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Apenas arquivos PDF são aceitos');
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB
        toast.error('Arquivo muito grande. Máximo: 10MB');
        return;
      }
      setNfeFile(file);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      let nfeUrl: string | undefined;

      // 1. Upload NF-e se fornecida
      if (nfeFile) {
        const fileExt = 'pdf';
        const fileName = `${quoteId}_${Date.now()}.${fileExt}`;
        const filePath = `invoices/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, nfeFile, {
            contentType: 'application/pdf',
            upsert: false
          });

        if (uploadError) {
          throw new Error(`Erro ao fazer upload da NF-e: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage
          .from('attachments')
          .getPublicUrl(filePath);

        nfeUrl = urlData.publicUrl;
      }

      // 2. Invocar edge function para criar cobrança
      const { data: result, error } = await supabase.functions.invoke('supplier-issue-invoice', {
        body: {
          quoteId,
          invoiceNumber: data.invoiceNumber,
          dueDate: data.dueDate,
          notes: data.notes,
          nfeUrl, // Adicionar URL da NF-e
        }
      });

      if (error) throw error;

      if (!result.success) {
        throw new Error(result.error || 'Erro ao emitir cobrança');
      }

      toast.success('Cobrança emitida com sucesso!', {
        description: `O cliente receberá a cobrança no valor de R$ ${result.amount.toFixed(2)}`
      });

      onOpenChange(false);
      
      // Recarregar página para atualizar lista
      window.location.reload();
    } catch (error: any) {
      console.error('Error issuing invoice:', error);
      toast.error('Erro ao emitir cobrança', {
        description: error.message || 'Tente novamente mais tarde'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Emitir Cobrança
          </DialogTitle>
          <DialogDescription>
            Emita uma cobrança para o cliente referente à cotação aprovada
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Dados do Cliente */}
          {clientData && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Dados do Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <strong className="text-muted-foreground">Nome:</strong> {clientData.name}
                </div>
                <div>
                  <strong className="text-muted-foreground">CNPJ:</strong> {clientData.cnpj}
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span>{clientData.email}</span>
                </div>
                {clientData.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span>{clientData.phone}</span>
                  </div>
                )}
                {clientData.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
                    <span className="text-muted-foreground">{clientData.address}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Breakdown de Valores */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Detalhamento de Valores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Itens */}
              {quoteItems.length > 0 && (
                <div className="space-y-2">
                  {quoteItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {item.product_name} ({item.quantity}x)
                      </span>
                      <span>R$ {item.total.toFixed(2)}</span>
                    </div>
                  ))}
                  <Separator />
                </div>
              )}

              {/* Subtotal dos itens */}
              {quoteItems.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal dos Itens</span>
                  <span>R$ {itemsSubtotal.toFixed(2)}</span>
                </div>
              )}

              {/* Frete se houver */}
              {freightCost > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Frete/Entrega</span>
                  <span>R$ {freightCost.toFixed(2)}</span>
                </div>
              )}

              {(quoteItems.length > 0 || freightCost > 0) && <Separator />}

              <div className="flex justify-between text-sm font-medium">
                <span>Valor Base (Cotação)</span>
                <span>R$ {breakdown.baseAmount.toFixed(2)}</span>
              </div>

              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Taxa de pagamento Asaas</span>
                  <span>R$ {breakdown.asaasPaymentFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxa de mensageria Asaas</span>
                  <span>R$ {breakdown.asaasMessagingFee.toFixed(2)}</span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between text-base font-bold">
                <span>Total a Pagar (Cliente)</span>
                <span className="text-primary">R$ {breakdown.customerTotal.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Comissão da Plataforma */}
          <Alert className="border-primary/20 bg-primary/5">
            <TrendingUp className="h-4 w-4 text-primary" />
            <AlertDescription className="space-y-2">
              <div className="flex justify-between items-center">
                <strong className="text-primary">Comissão da Plataforma (5%)</strong>
                <span className="text-lg font-bold text-primary">- R$ {platformCommission.toFixed(2)}</span>
              </div>
              <Separator className="bg-primary/20" />
              <div className="flex justify-between items-center pt-1">
                <strong>Você Receberá</strong>
                <span className="text-xl font-bold text-green-600">R$ {supplierNet.toFixed(2)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                A comissão é calculada sobre o valor base (R$ {breakdown.baseAmount.toFixed(2)}) e será descontada após o pagamento do cliente.
              </p>
            </AlertDescription>
          </Alert>

          {/* Informações da Cotação */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Cotação:</strong> {quoteTitle}
              <br />
              <strong>Valor Base:</strong> R$ {effectiveTotal.toFixed(2)}
            </AlertDescription>
          </Alert>

          {/* Upload NF-e */}
          <div className="space-y-2">
            <Label htmlFor="nfeUpload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload de NF-e (Opcional)
            </Label>
            <Input
              id="nfeUpload"
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            {nfeFile && (
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <FileText className="h-3 w-3" />
                {nfeFile.name} ({(nfeFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Faça upload da Nota Fiscal Eletrônica (PDF) se já tiver emitido por outro sistema
            </p>
          </div>

          {/* Número da NF-e */}
          <div className="space-y-2">
            <Label htmlFor="invoiceNumber">
              Número da NF-e/Invoice (opcional)
            </Label>
            <Input
              id="invoiceNumber"
              {...register("invoiceNumber")}
              placeholder="Ex: 12345"
            />
          </div>

          {/* Data de Vencimento */}
          <div className="space-y-2">
            <Label htmlFor="dueDate" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data de Vencimento *
            </Label>
            <Input
              id="dueDate"
              type="date"
              {...register("dueDate", { required: "Data de vencimento é obrigatória" })}
              min={new Date().toISOString().split('T')[0]}
            />
            {errors.dueDate && (
              <p className="text-sm text-destructive">{errors.dueDate.message}</p>
            )}
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              Observações (opcional)
            </Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Informações adicionais sobre a cobrança..."
              rows={3}
            />
          </div>

          {/* Como funciona */}
          <div className="bg-muted p-4 rounded-lg space-y-1 text-sm">
            <p className="font-medium flex items-center gap-2">
              <Info className="h-4 w-4" />
              Como funciona:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>O cliente receberá a cobrança por e-mail</li>
              <li>Ele poderá pagar via PIX, boleto ou cartão</li>
              <li>O valor ficará em garantia até a entrega</li>
              <li>Após confirmação, você receberá o valor em sua carteira</li>
              <li>A comissão da plataforma será descontada automaticamente</li>
            </ul>
          </div>

          {/* Botões */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Emitindo...' : 'Emitir Cobrança'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
