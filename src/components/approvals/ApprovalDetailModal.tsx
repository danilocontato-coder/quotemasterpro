import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApprovals, type Approval } from "@/hooks/useApprovals";
import { useToast } from "@/hooks/use-toast";

interface ApprovalDetailModalProps {
  open: boolean;
  onClose: () => void;
  approval: Approval;
}

export function ApprovalDetailModal({ open, onClose, approval }: ApprovalDetailModalProps) {
  const { approveRequest, rejectRequest } = useApprovals();
  const { toast } = useToast();

  const handleApprove = () => {
    approveRequest(approval.id, "Current User", "Aprovado");
    toast({ title: "Aprovação realizada", description: "Cotação aprovada com sucesso." });
    onClose();
  };

  const handleReject = () => {
    rejectRequest(approval.id, "Current User", "Rejeitado");
    toast({ title: "Aprovação rejeitada", description: "Cotação rejeitada." });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes da Aprovação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium">{approval.quote.title}</h3>
            <p className="text-sm text-muted-foreground">Cliente: {approval.quote.client}</p>
            <p className="text-sm">Valor: R$ {approval.quote.total.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm"><strong>Status:</strong> <Badge>{approval.status}</Badge></p>
            <p className="text-sm"><strong>Prioridade:</strong> <Badge>{approval.priority}</Badge></p>
          </div>
        </div>
        {approval.status === "pending" && (
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>Fechar</Button>
            <Button variant="destructive" onClick={handleReject}>Rejeitar</Button>
            <Button onClick={handleApprove}>Aprovar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}