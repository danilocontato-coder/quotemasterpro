import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";
import { useApprovalLevels } from "@/hooks/useApprovalLevels";
import { useProfiles } from "@/hooks/useProfiles";
import { useToast } from "@/hooks/use-toast";

interface CreateApprovalLevelModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateApprovalLevelModal({ open, onClose }: CreateApprovalLevelModalProps) {
  const { createApprovalLevel } = useApprovalLevels();
  const { profiles } = useProfiles();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    minValue: 0,
    maxValue: 0,
    approvers: [] as string[],
    approvalType: "any" as "all" | "any" | "majority",
    requiredApprovals: 1,
    active: true,
    requireAll: false
  });

  const handleProfileChange = (profileId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      approvers: checked
        ? [...prev.approvers, profileId]
        : prev.approvers.filter(id => id !== profileId)
    }));
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <X className="h-5 w-5" />
            Novo Nível de Aprovação
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Configure as regras de aprovação para diferentes faixas de valores
          </p>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Nível *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Ex: Aprovação Síndico"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minValue">Valor Mínimo (R$) *</Label>
              <Input
                id="minValue"
                type="number"
                step="0.01"
                value={formData.minValue}
                onChange={(e) => setFormData({...formData, minValue: Number(e.target.value)})}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxValue">Valor Máximo (R$)</Label>
              <Input
                id="maxValue"
                type="number"
                step="0.01"
                value={formData.maxValue || ""}
                onChange={(e) => setFormData({...formData, maxValue: Number(e.target.value)})}
                placeholder="Deixe vazio para ilimitado"
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-base font-medium">Papéis Requeridos *</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {profiles.filter(p => p.active).map((profile) => (
                <div key={profile.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={profile.id}
                    checked={formData.approvers.includes(profile.id)}
                    onCheckedChange={(checked) => 
                      handleProfileChange(profile.id, checked as boolean)
                    }
                  />
                  <Label htmlFor={profile.id} className="text-sm">
                    {profile.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Switch
              id="requireAll"
              checked={formData.requireAll}
              onCheckedChange={(checked) => setFormData({...formData, requireAll: checked})}
            />
            <Label htmlFor="requireAll" className="text-sm">
              Requer TODOS os papéis selecionados (ao invés de apenas um)
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Descrição opcional do nível de aprovação..."
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Ativo</Label>
              <p className="text-sm text-muted-foreground">
                Nível pode ser usado nas aprovações
              </p>
            </div>
            <Switch
              checked={formData.active}
              onCheckedChange={(checked) => setFormData({...formData, active: checked})}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="bg-primary">
            Criar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}