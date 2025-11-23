import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Calendar, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface IssueInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
  quoteTitle: string;
  quoteAmount: number;
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
}: IssueInvoiceModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    }
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('supplier-issue-invoice', {
        body: {
          quoteId,
          invoiceNumber: data.invoiceNumber,
          dueDate: data.dueDate,
          notes: data.notes,
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Emitir Cobrança
          </DialogTitle>
          <DialogDescription>
            Emita uma cobrança para o cliente referente à cotação aprovada
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Cotação:</strong> {quoteTitle}
              <br />
              <strong>Valor:</strong> R$ {quoteAmount.toFixed(2)}
            </AlertDescription>
          </Alert>

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

          <div className="bg-muted p-4 rounded-lg space-y-1 text-sm">
            <p className="font-medium">Como funciona:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>O cliente receberá a cobrança por e-mail</li>
              <li>Ele poderá pagar via PIX, boleto ou cartão</li>
              <li>O valor ficará em escrow até a entrega</li>
              <li>Após confirmação, você receberá o valor em sua carteira</li>
            </ul>
          </div>

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
