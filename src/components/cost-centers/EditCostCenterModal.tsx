import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCostCenters, CostCenter } from '@/hooks/useCostCenters';

interface EditCostCenterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  costCenter: CostCenter;
  parentOptions: CostCenter[];
}

export function EditCostCenterModal({ open, onOpenChange, costCenter, parentOptions }: EditCostCenterModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    parent_id: undefined as string | undefined,
    budget_monthly: '',
    budget_annual: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { updateCostCenter } = useCostCenters();

  useEffect(() => {
    if (costCenter) {
      setFormData({
        name: costCenter.name,
        code: costCenter.code,
        description: costCenter.description || '',
        parent_id: costCenter.parent_id || undefined,
        budget_monthly: costCenter.budget_monthly.toString(),
        budget_annual: costCenter.budget_annual.toString(),
      });
    }
  }, [costCenter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    try {
      await updateCostCenter(costCenter.id, {
        name: formData.name,
        code: formData.code,
        description: formData.description || undefined,
        parent_id: formData.parent_id || undefined,
        budget_monthly: parseFloat(formData.budget_monthly) || 0,
        budget_annual: parseFloat(formData.budget_annual) || 0,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error updating cost center:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Centro de Custo</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Administração"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Código *</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
              placeholder="Ex: ADM"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descrição do centro de custo"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent_id">Centro Pai</Label>
            <Select value={formData.parent_id} onValueChange={(value) => setFormData(prev => ({ ...prev, parent_id: value === 'none' ? undefined : value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um centro pai (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum (Centro raiz)</SelectItem>
                {parentOptions.map((parent) => (
                  <SelectItem key={parent.id} value={parent.id}>
                    {parent.name} ({parent.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget_monthly">Orçamento Mensal</Label>
              <Input
                id="budget_monthly"
                type="number"
                step="0.01"
                value={formData.budget_monthly}
                onChange={(e) => setFormData(prev => ({ ...prev, budget_monthly: e.target.value }))}
                placeholder="0,00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget_annual">Orçamento Anual</Label>
              <Input
                id="budget_annual"
                type="number"
                step="0.01"
                value={formData.budget_annual}
                onChange={(e) => setFormData(prev => ({ ...prev, budget_annual: e.target.value }))}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}