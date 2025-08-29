import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSupabaseApprovalLevels, type ApprovalLevel } from "@/hooks/useSupabaseApprovalLevels";
import { useToast } from "@/hooks/use-toast";

interface EditApprovalLevelModalProps {
  open: boolean;
  onClose: () => void;
  level: ApprovalLevel;
}

export function EditApprovalLevelModal({ open, onClose, level }: EditApprovalLevelModalProps) {
  const { updateApprovalLevel } = useSupabaseApprovalLevels();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    active: true,
    amount_threshold: 0,
    order_level: 1,
    approvers: [] as string[]
  });

  useEffect(() => {
    if (level) {
      setFormData({
        name: level.name,
        active: level.active,
        amount_threshold: level.amount_threshold,
        order_level: level.order_level,
        approvers: level.approvers
      });
    }
  }, [level]);

  const handleSubmit = async () => {
    const success = await updateApprovalLevel(level.id, formData);
    if (success) {
      toast({
        title: "Nível atualizado",
        description: "Nível de aprovação atualizado com sucesso.",
      });
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Nível de Aprovação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label>Limite de Valor (R$)</Label>
            <Input
              type="number"
              value={formData.amount_threshold}
              onChange={(e) => setFormData({...formData, amount_threshold: parseFloat(e.target.value)})}
              placeholder="0.00"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit}>Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}