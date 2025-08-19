import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useApprovalLevels } from "@/hooks/useApprovalLevels";
import { useToast } from "@/hooks/use-toast";

interface CreateApprovalLevelModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateApprovalLevelModal({ open, onClose }: CreateApprovalLevelModalProps) {
  const { createApprovalLevel } = useApprovalLevels();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    minValue: 0,
    maxValue: 0,
    approvers: [] as string[],
    approvalType: "any" as "all" | "any" | "majority",
    requiredApprovals: 1,
    active: true
  });
  const [newApprover, setNewApprover] = useState("");

  const handleAddApprover = () => {
    if (newApprover.trim() && !formData.approvers.includes(newApprover.trim())) {
      setFormData({
        ...formData,
        approvers: [...formData.approvers, newApprover.trim()]
      });
      setNewApprover("");
    }
  };

  const handleRemoveApprover = (approver: string) => {
    setFormData({
      ...formData,
      approvers: formData.approvers.filter(a => a !== approver)
    });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.description || formData.approvers.length === 0) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (formData.minValue >= formData.maxValue) {
      toast({
        title: "Valores inválidos",
        description: "O valor máximo deve ser maior que o valor mínimo.",
        variant: "destructive",
      });
      return;
    }

    createApprovalLevel(formData);
    toast({
      title: "Nível criado",
      description: "Novo nível de aprovação criado com sucesso.",
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Criar Nível de Aprovação</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do Nível *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Ex: Nível 1 - Básico"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Aprovação</Label>
              <Select value={formData.approvalType} onValueChange={(value: any) => setFormData({...formData, approvalType: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Qualquer aprovador</SelectItem>
                  <SelectItem value="all">Todos os aprovadores</SelectItem>
                  <SelectItem value="majority">Maioria dos aprovadores</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Descrição do nível de aprovação"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor Mínimo (R$)</Label>
              <Input
                type="number"
                value={formData.minValue}
                onChange={(e) => setFormData({...formData, minValue: Number(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <Label>Valor Máximo (R$)</Label>
              <Input
                type="number"
                value={formData.maxValue}
                onChange={(e) => setFormData({...formData, maxValue: Number(e.target.value)})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Aprovadores *</Label>
            <div className="flex gap-2">
              <Input
                value={newApprover}
                onChange={(e) => setNewApprover(e.target.value)}
                placeholder="Nome do aprovador"
                onKeyPress={(e) => e.key === 'Enter' && handleAddApprover()}
              />
              <Button onClick={handleAddApprover}>Adicionar</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.approvers.map((approver) => (
                <Badge key={approver} variant="secondary" className="flex items-center gap-1">
                  {approver}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveApprover(approver)} />
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>Nível Ativo</Label>
            <Switch
              checked={formData.active}
              onCheckedChange={(checked) => setFormData({...formData, active: checked})}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit}>Criar Nível</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}