import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";
import { useSupabaseApprovalLevels } from "@/hooks/useSupabaseApprovalLevels";
import { useSupabaseUsers } from "@/hooks/useSupabaseUsers";
import { useToast } from "@/hooks/use-toast";

interface CreateApprovalLevelModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateApprovalLevelModal({ open, onClose }: CreateApprovalLevelModalProps) {
  const { createApprovalLevel } = useSupabaseApprovalLevels();
  const { users } = useSupabaseUsers();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    active: true,
    amount_threshold: 0,
    order_level: 1,
    approvers: [] as string[]
  });

  const handleProfileChange = (profileId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      approvers: checked
        ? [...prev.approvers, profileId]
        : prev.approvers.filter(id => id !== profileId)
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name || formData.approvers.length === 0) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const success = await createApprovalLevel(formData);
    if (success) {
      toast({
        title: "Nível criado",
        description: "Novo nível de aprovação criado com sucesso.",
      });
      onClose();
    }
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
              <Label htmlFor="amount_threshold">Valor Mínimo (R$) *</Label>
              <Input
                id="amount_threshold"
                type="number"
                step="0.01"
                value={formData.amount_threshold}
                onChange={(e) => setFormData({...formData, amount_threshold: Number(e.target.value)})}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="order_level">Ordem do Nível *</Label>
              <Input
                id="order_level"
                type="number"
                value={formData.order_level}
                onChange={(e) => setFormData({...formData, order_level: Number(e.target.value)})}
                placeholder="1"
                min="1"
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-base font-medium">Usuários Aprovadores *</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {users.filter(u => u.status === 'active' && (u.role === 'manager' || u.role === 'admin')).map((user) => (
                <div key={user.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={user.id}
                    checked={formData.approvers.includes(user.id)}
                    onCheckedChange={(checked) => 
                      handleProfileChange(user.id, checked as boolean)
                    }
                  />
                  <Label htmlFor={user.id} className="text-sm">
                    {user.name} ({user.role})
                  </Label>
                </div>
              ))}
            </div>
            {users.filter(u => u.status === 'active' && (u.role === 'manager' || u.role === 'admin')).length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum usuário com permissão de aprovação encontrado. Apenas usuários com papel "Manager" ou "Admin" podem aprovar.
              </p>
            )}
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