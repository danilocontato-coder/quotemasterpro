import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useApprovalLevels, type ApprovalLevel } from "@/hooks/useApprovalLevels";
import { useToast } from "@/hooks/use-toast";

interface DeleteApprovalLevelModalProps {
  open: boolean;
  onClose: () => void;
  level: ApprovalLevel;
}

export function DeleteApprovalLevelModal({ open, onClose, level }: DeleteApprovalLevelModalProps) {
  const { deleteApprovalLevel } = useApprovalLevels();
  const { toast } = useToast();

  const handleDelete = () => {
    deleteApprovalLevel(level.id);
    toast({
      title: "Nível excluído",
      description: "Nível de aprovação excluído com sucesso.",
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir Nível</DialogTitle>
        </DialogHeader>
        <p>Tem certeza que deseja excluir o nível "{level.name}"?</p>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}