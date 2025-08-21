import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface DeleteItemModalProps {
  item: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (item: any, reason?: string) => void;
}

export function DeleteItemModal({ item, open, onOpenChange, onConfirm }: DeleteItemModalProps) {
  const [reason, setReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  if (!item) return null;

  const isService = item.category === 'Serviços' || item.type === 'service';
  const hasStock = !isService && (item.stock_quantity || 0) > 0;

  const handleConfirm = async () => {
    if (hasStock && !reason.trim()) {
      toast.error("É obrigatório informar o motivo para exclusão de itens com estoque");
      return;
    }

    setIsDeleting(true);
    
    try {
      await onConfirm(item, reason.trim() || undefined);
      
      // Reset form
      setReason("");
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao excluir item");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Confirmar Exclusão
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Trash2 className="h-5 w-5 text-destructive mt-1 flex-shrink-0" />
                <div className="space-y-2">
                  <p className="font-medium">
                    Tem certeza que deseja excluir este {isService ? 'serviço' : 'produto'}?
                  </p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p><strong>Código:</strong> {item.code}</p>
                    <p><strong>Nome:</strong> {item.name}</p>
                    {!isService && (
                      <p><strong>Estoque atual:</strong> {item.stock_quantity || 0} unidades</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {hasStock && (
            <Card className="border-warning/20 bg-warning/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-warning mt-1 flex-shrink-0" />
                  <div className="space-y-2">
                    <p className="font-medium text-warning">Atenção: Item com estoque</p>
                    <p className="text-sm text-muted-foreground">
                      Este produto possui {item.stock_quantity || 0} unidades em estoque. 
                      A exclusão resultará na perda total do controle deste estoque.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {(hasStock || isService) && (
            <div className="space-y-2">
              <Label htmlFor="reason" className="flex items-center gap-2">
                Motivo da exclusão {hasStock && <span className="text-destructive">*</span>}
              </Label>
              <Textarea
                id="reason"
                placeholder={
                  hasStock 
                    ? "Explique o motivo da exclusão (obrigatório para itens com estoque)..."
                    : "Explique o motivo da exclusão (opcional)..."
                }
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                required={hasStock}
              />
              <p className="text-xs text-muted-foreground">
                {hasStock ? (
                  "O motivo será registrado no log de auditoria."
                ) : (
                  "Esta informação será registrada no log de auditoria (opcional)."
                )}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isDeleting}
              className="flex items-center gap-2"
            >
              {isDeleting ? (
                <>Excluindo...</>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Excluir {isService ? 'Serviço' : 'Produto'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}