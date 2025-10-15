import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useSupabaseApprovalLevels, type ApprovalLevel } from "@/hooks/useSupabaseApprovalLevels";
import { useSupabaseUsers } from "@/hooks/useSupabaseUsers";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/useCurrency";
import { AlertCircle, Info } from "lucide-react";

interface EditApprovalLevelModalProps {
  open: boolean;
  onClose: () => void;
  level: ApprovalLevel;
}

export function EditApprovalLevelModal({ open, onClose, level }: EditApprovalLevelModalProps) {
  const { updateApprovalLevel } = useSupabaseApprovalLevels();
  const { users } = useSupabaseUsers();
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
const [formData, setFormData] = useState({
  name: "",
  active: true,
  amount_threshold: 0,
  max_amount_threshold: 0,
  order_level: 1,
  approvers: [] as string[]
});

  useEffect(() => {
    if (level) {
setFormData({
  name: level.name,
  active: level.active,
  amount_threshold: level.amount_threshold,
  max_amount_threshold: (level as any).max_amount_threshold ?? 0,
  order_level: level.order_level,
  approvers: level.approvers
});
    }
  }, [level]);

  const handleUserChange = (userId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      approvers: checked
        ? [...prev.approvers, userId]
        : prev.approvers.filter(id => id !== userId)
    }));
  };

  const approverUsers = users.filter(u => 
    u.status === 'active' && (u.role === 'manager' || u.role === 'admin')
  );

  const isFormValid = 
    formData.name.trim() !== "" &&
    formData.approvers.length > 0 &&
    formData.max_amount_threshold > 0 &&
    formData.max_amount_threshold >= formData.amount_threshold;

const handleSubmit = async () => {
  if (!isFormValid) {
    toast({
      title: "Campos obrigatórios",
      description: "Preencha todos os campos corretamente.",
      variant: "destructive",
    });
    return;
  }
  if (
    formData.max_amount_threshold <= 0 ||
    formData.amount_threshold < 0 ||
    formData.max_amount_threshold < formData.amount_threshold
  ) {
    toast({
      title: "Valores inválidos",
      description: "O valor máximo deve ser maior ou igual ao mínimo.",
      variant: "destructive",
    });
    return;
  }

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Nível de Aprovação</DialogTitle>
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
            <CurrencyInput
              label="Valor Mínimo"
              value={formData.amount_threshold}
              onChange={(value) => setFormData({...formData, amount_threshold: value})}
              placeholder="0,00"
              required
              id="amount_threshold"
            />
            <CurrencyInput
              label="Valor Máximo"
              value={formData.max_amount_threshold}
              onChange={(value) => setFormData({...formData, max_amount_threshold: value})}
              placeholder="0,00"
              required
              id="max_amount_threshold"
            />
          </div>

          {formData.max_amount_threshold > 0 && 
           formData.max_amount_threshold < formData.amount_threshold && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Valores inconsistentes</p>
                <p className="text-xs text-destructive/80">
                  O valor máximo deve ser maior ou igual ao valor mínimo
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="order_level">Ordem do Nível *</Label>
            <Input
              id="order_level"
              type="number"
              value={formData.order_level}
              onChange={(e) => setFormData({...formData, order_level: Number(e.target.value)})}
              min="1"
            />
            <p className="text-xs text-muted-foreground">
              Determina a prioridade de aplicação deste nível
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Usuários Aprovadores *</Label>
              <Badge variant="secondary">
                {formData.approvers.length} selecionado(s)
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-2 border rounded">
              {approverUsers.map((user) => (
                <div key={user.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={`edit-${user.id}`}
                    checked={formData.approvers.includes(user.id)}
                    onCheckedChange={(checked) => handleUserChange(user.id, checked as boolean)}
                  />
                  <Label htmlFor={`edit-${user.id}`} className="text-sm cursor-pointer">
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {user.role} • {user.email}
                      </div>
                    </div>
                  </Label>
                </div>
              ))}
            </div>
            {approverUsers.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum usuário com permissão de aprovação encontrado.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between p-4 border rounded">
            <div>
              <Label>Nível Ativo</Label>
              <p className="text-sm text-muted-foreground">
                Apenas níveis ativos são aplicados nas aprovações
              </p>
            </div>
            <Switch
              checked={formData.active}
              onCheckedChange={(checked) => setFormData({...formData, active: checked})}
            />
          </div>

          {formData.max_amount_threshold > 0 && isFormValid && (
            <div className="p-4 bg-muted rounded-lg">
              <Label className="text-sm font-medium">Preview da Faixa</Label>
              <p className="text-lg font-bold mt-1">
                {formatCurrency(formData.amount_threshold)} até {formatCurrency(formData.max_amount_threshold)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Cotações nesta faixa precisarão de {formData.approvers.length} aprovador(es)
              </p>
            </div>
          )}

          <div className="p-3 bg-info/10 border border-info/20 rounded">
            <div className="flex gap-2">
              <Info className="h-4 w-4 text-primary mt-0.5" />
              <div className="text-xs">
                <p className="font-medium mb-1">Como funcionam os níveis:</p>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                  <li>Cotações dentro da faixa de valores entram automaticamente neste nível</li>
                  <li>A ordem determina qual nível tem prioridade em caso de sobreposição</li>
                  <li>Todos os aprovadores selecionados serão notificados</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-6 border-t">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!isFormValid}>
            Salvar Alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}