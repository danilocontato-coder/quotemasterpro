import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, Camera, Receipt, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface OfflinePaymentModalProps {
  payment: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function OfflinePaymentModal({ payment, open, onOpenChange, onConfirm }: OfflinePaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const paymentMethods = [
    { value: "bank_transfer", label: "Transferência Bancária" },
    { value: "pix", label: "PIX" },
    { value: "cash", label: "Dinheiro" },
    { value: "check", label: "Cheque" },
    { value: "bank_slip", label: "Boleto Bancário" },
    { value: "other", label: "Outro" }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Validar tamanho de cada arquivo (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];
    
    files.forEach(file => {
      if (file.size > maxSize) {
        invalidFiles.push(`${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
      } else {
        validFiles.push(file);
      }
    });
    
    if (invalidFiles.length > 0) {
      toast({
        title: "Arquivos muito grandes",
        description: `Os seguintes arquivos excedem 10MB: ${invalidFiles.join(', ')}`,
        variant: "destructive"
      });
    }
    
    setAttachments(prev => [...prev, ...validFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = async () => {
    if (!paymentMethod) {
      toast({
        title: "Campo obrigatório",
        description: "Selecione o método de pagamento.",
        variant: "destructive"
      });
      return;
    }
    
    // Validar transaction_id para PIX
    if (paymentMethod === 'pix' && !transactionId.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Para pagamento via PIX, o código da transação é obrigatório.",
        variant: "destructive"
      });
      return;
    }
    
    // Validar se tem pelo menos um comprovante
    if (attachments.length === 0) {
      toast({
        title: "Comprovante necessário",
        description: "Adicione pelo menos um comprovante de pagamento.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Upload attachments if any
      let attachmentUrls: string[] = [];
      let uploadErrors: string[] = [];
      
      if (attachments.length > 0) {
        toast({
          title: "Upload em progresso",
          description: `Enviando ${attachments.length} arquivo(s)...`,
        });
        
        for (const file of attachments) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
          const filePath = `payments/${payment.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(filePath, file);

          if (uploadError) {
            console.error('Upload error:', uploadError);
            uploadErrors.push(file.name);
          } else {
            attachmentUrls.push(filePath);
          }
        }
        
        if (uploadErrors.length > 0) {
          toast({
            title: "Erro no upload",
            description: `Falha ao enviar: ${uploadErrors.join(', ')}`,
            variant: "destructive"
          });
        }
      }

      // Update payment with offline confirmation
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'manual_confirmation',
          payment_method: paymentMethod,
          transaction_id: transactionId,
          offline_notes: notes,
          offline_attachments: attachmentUrls,
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id);

      if (error) throw error;

      // Create audit log
      await supabase
        .from('audit_logs')
        .insert({
          action: 'OFFLINE_PAYMENT_SUBMITTED',
          entity_type: 'payments',
          entity_id: payment.id,
          details: {
            payment_method: paymentMethod,
            transaction_id: transactionId,
            attachments_count: attachmentUrls.length
          }
        });

      toast({
        title: "Pagamento offline registrado",
        description: "Aguarde a confirmação da equipe financeira.",
      });

      onConfirm();
      onOpenChange(false);
      
      // Reset form
      setPaymentMethod("");
      setTransactionId("");
      setNotes("");
      setAttachments([]);

    } catch (error) {
      console.error('Error submitting offline payment:', error);
      toast({
        title: "Erro ao registrar pagamento",
        description: "Não foi possível registrar o pagamento offline.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Registrar Pagamento Offline
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Info */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Cotação</p>
                  <p className="font-medium">#{payment.quote_id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Valor</p>
                  <p className="font-bold text-lg">{formatCurrency(payment.amount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warning */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-amber-900 mb-1">Pagamento Offline</p>
                <p className="text-sm text-amber-800">
                  Este pagamento será analisado pela equipe financeira. O status será atualizado após a confirmação.
                  Certifique-se de anexar comprovantes válidos.
                </p>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Método de Pagamento *</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o método de pagamento" />
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

          {/* Transaction ID */}
          <div className="space-y-2">
            <Label htmlFor="transactionId">
              ID da Transação / Número do Comprovante
              {paymentMethod === 'pix' && ' *'}
            </Label>
            <Input
              id="transactionId"
              placeholder={
                paymentMethod === 'pix' 
                  ? "Código PIX (obrigatório)" 
                  : "Número do comprovante, ID da transferência, etc."
              }
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              required={paymentMethod === 'pix'}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Informações adicionais sobre o pagamento..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Comprovantes de Pagamento</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="text-center">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  Arraste arquivos aqui ou clique para selecionar
                </p>
                <p className="text-xs text-gray-500">
                  PDF, imagens até 10MB cada
                </p>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  className="mt-2"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Selecionar Arquivos
                </Button>
              </div>
            </div>

            {/* Attachment List with Preview */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Arquivos selecionados: <span className="text-muted-foreground">({attachments.length})</span>
                </p>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 border rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {file.type.startsWith('image/') ? (
                          <div className="relative h-10 w-10 rounded overflow-hidden bg-gray-200 flex-shrink-0">
                            <img 
                              src={URL.createObjectURL(file)} 
                              alt={file.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <FileText className="h-10 w-10 text-gray-400 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                            {file.size > 5 * 1024 * 1024 && (
                              <span className="text-amber-600 ml-1">(⚠️ Arquivo grande)</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                        className="flex-shrink-0"
                      >
                        Remover
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={isLoading || !paymentMethod || (paymentMethod === 'pix' && !transactionId)}
              className="flex-1"
            >
              {isLoading ? "Registrando..." : "Registrar Pagamento"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}