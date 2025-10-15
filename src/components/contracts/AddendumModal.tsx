import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AddendumModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: AddendumData) => void;
  contractNumber: string;
}

export interface AddendumData {
  addendum_type: string;
  description: string;
  new_value?: number;
  effective_date: string;
}

export const AddendumModal = ({
  open,
  onClose,
  onConfirm,
  contractNumber,
}: AddendumModalProps) => {
  const [formData, setFormData] = useState<AddendumData>({
    addendum_type: '',
    description: '',
    effective_date: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = () => {
    onConfirm(formData);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar Aditivo - Contrato #{contractNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Tipo de Aditivo *</Label>
            <Select
              value={formData.addendum_type}
              onValueChange={(v) => setFormData({ ...formData, addendum_type: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prazo">Alteração de Prazo</SelectItem>
                <SelectItem value="valor">Alteração de Valor</SelectItem>
                <SelectItem value="escopo">Alteração de Escopo</SelectItem>
                <SelectItem value="clausulas">Alteração de Cláusulas</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Data de Vigência do Aditivo *</Label>
            <Input
              type="date"
              value={formData.effective_date}
              onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
            />
          </div>

          {formData.addendum_type === 'valor' && (
            <div>
              <Label>Novo Valor Total</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.new_value || ''}
                onChange={(e) =>
                  setFormData({ ...formData, new_value: parseFloat(e.target.value) })
                }
                placeholder="0,00"
              />
            </div>
          )}

          <div>
            <Label>Descrição do Aditivo *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva detalhadamente as alterações contempladas neste aditivo..."
              rows={6}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.addendum_type || !formData.description}
            >
              Criar Aditivo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
