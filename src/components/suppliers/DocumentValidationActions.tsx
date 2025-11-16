import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface DocumentValidationActionsProps {
  documentId: string;
  onValidate: (documentId: string, status: 'validated' | 'rejected', reason?: string) => Promise<void>;
  disabled?: boolean;
}

export function DocumentValidationActions({
  documentId,
  onValidate,
  disabled = false,
}: DocumentValidationActionsProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await onValidate(documentId, 'validated');
      toast({
        title: "Documento aprovado",
        description: "O documento foi validado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao aprovar",
        description: "Não foi possível aprovar o documento.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "Por favor, informe o motivo da rejeição.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onValidate(documentId, 'rejected', rejectionReason);
      toast({
        title: "Documento rejeitado",
        description: "O documento foi rejeitado.",
      });
      setShowRejectDialog(false);
      setRejectionReason('');
    } catch (error) {
      toast({
        title: "Erro ao rejeitar",
        description: "Não foi possível rejeitar o documento.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleApprove}
          disabled={disabled || isSubmitting}
          className="text-success hover:text-success hover:bg-success/10"
        >
          <Check className="h-4 w-4 mr-1" />
          Aprovar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowRejectDialog(true)}
          disabled={disabled || isSubmitting}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <X className="h-4 w-4 mr-1" />
          Rejeitar
        </Button>
      </div>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Documento</DialogTitle>
            <DialogDescription>
              Por favor, informe o motivo da rejeição. Esta informação será enviada ao fornecedor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rejection-reason">Motivo da rejeição *</Label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Ex: Documento ilegível, data de validade expirada, informações incompletas..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason('');
              }}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReject}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground"
            >
              Rejeitar Documento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
