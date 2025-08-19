import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApprovalLevels, type ApprovalLevel } from "@/hooks/useApprovalLevels";
import { useToast } from "@/hooks/use-toast";

interface EditApprovalLevelModalProps {
  open: boolean;
  onClose: () => void;
  level: ApprovalLevel;
}

export function EditApprovalLevelModal({ open, onClose, level }: EditApprovalLevelModalProps) {
  const { updateApprovalLevel } = useApprovalLevels();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    minValue: 0,
    maxValue: 0
  });

  useEffect(() => {
    if (level) {
      setFormData({
        name: level.name,
        description: level.description,
        minValue: level.minValue,
        maxValue: level.maxValue
      });
    }
  }, [level]);

  const handleSubmit = () => {
    updateApprovalLevel(level.id, formData);
    toast({
      title: "Nível atualizado",
      description: "Nível de aprovação atualizado com sucesso.",
    });
    onClose();
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
            <Label>Descrição</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
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