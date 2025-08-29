import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSupabaseApprovals, type Approval } from "@/hooks/useSupabaseApprovals";
import { useToast } from "@/hooks/use-toast";

interface ApprovalDetailModalProps {
  open: boolean;
  onClose: () => void;
  approval: Approval;
}

export function ApprovalDetailModal({ open, onClose, approval }: ApprovalDetailModalProps) {
  const { toast } = useToast();

  const handleApprove = () => {
    // TODO: Implement approval logic with Supabase
    toast({ title: "Aprovação realizada", description: "Cotação aprovada com sucesso." });
    onClose();
  };

  const handleReject = () => {
    // TODO: Implement rejection logic with Supabase
    toast({ title: "Aprovação rejeitada", description: "Cotação rejeitada." });
    onClose();
  };

  if (!approval) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes da Aprovação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium">Cotação #{approval.quote_id}</h3>
            <p className="text-sm text-muted-foreground">ID da Aprovação: {approval.id}</p>
            {approval.comments && (
              <p className="text-sm mt-2">Comentários: {approval.comments}</p>
            )}
          </div>
          <div>
            <p className="text-sm"><strong>Status:</strong> <Badge>{approval.status}</Badge></p>
            <p className="text-sm"><strong>Criado em:</strong> {new Date(approval.created_at).toLocaleDateString('pt-BR')}</p>
            {approval.approved_at && (
              <p className="text-sm"><strong>Aprovado em:</strong> {new Date(approval.approved_at).toLocaleDateString('pt-BR')}</p>
            )}
          </div>
        </div>
        {approval.status === "pending" && (
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>Fechar</Button>
            <Button variant="destructive" onClick={handleReject}>Rejeitar</Button>
            <Button onClick={handleApprove}>Aprovar</Button>
          </div>
        )}
        {approval.status !== "pending" && (
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}