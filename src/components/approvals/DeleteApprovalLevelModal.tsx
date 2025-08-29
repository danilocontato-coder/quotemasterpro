import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSupabaseApprovalLevels, type ApprovalLevel } from "@/hooks/useSupabaseApprovalLevels";
import { useToast } from "@/hooks/use-toast";

interface DeleteApprovalLevelModalProps {
  open: boolean;
  onClose: () => void;
  level: ApprovalLevel;
}

export function DeleteApprovalLevelModal({ open, onClose, level }: DeleteApprovalLevelModalProps) {
  const { deleteApprovalLevel } = useSupabaseApprovalLevels();
  const { toast } = useToast();

  const handleDelete = async () => {
    const success = await deleteApprovalLevel(level.id);
    if (success) {
      toast({
        title: "Nível excluído",
        description: "Nível de aprovação excluído com sucesso.",
      });
      onClose();
    }
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