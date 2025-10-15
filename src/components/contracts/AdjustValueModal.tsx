import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';

interface AdjustValueModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: AdjustmentData) => void;
  contractNumber: string;
  currentValue: number;
}

export interface AdjustmentData {
  adjustment_date: string;
  index_type: string;
  percentage: number;
  previous_value: number;
  new_value: number;
  justification: string;
}

export const AdjustValueModal = ({
  open,
  onClose,
  onConfirm,
  contractNumber,
  currentValue,
}: AdjustValueModalProps) => {
  const [formData, setFormData] = useState<AdjustmentData>({
    adjustment_date: new Date().toISOString().split('T')[0],
    index_type: '',
    percentage: 0,
    previous_value: currentValue,
    new_value: currentValue,
    justification: '',
  });

  useEffect(() => {
    setFormData((prev) => ({ ...prev, previous_value: currentValue }));
  }, [currentValue]);

  const handlePercentageChange = (percentage: number) => {
    const newValue = currentValue * (1 + percentage / 100);
    setFormData({
      ...formData,
      percentage,
      new_value: newValue,
    });
  };

  const handleNewValueChange = (newValue: number) => {
    const percentage = ((newValue - currentValue) / currentValue) * 100;
    setFormData({
      ...formData,
      new_value: newValue,
      percentage,
    });
  };

  const handleSubmit = () => {
    onConfirm(formData);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Reajustar Valor - Contrato #{contractNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Data do Reajuste *</Label>
            <Input
              type="date"
              value={formData.adjustment_date}
              onChange={(e) => setFormData({ ...formData, adjustment_date: e.target.value })}
            />
          </div>

          <div>
            <Label>Índice de Reajuste *</Label>
            <Select
              value={formData.index_type}
              onValueChange={(v) => setFormData({ ...formData, index_type: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o índice" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IPCA">IPCA (Índice de Preços ao Consumidor Amplo)</SelectItem>
                <SelectItem value="IGP-M">IGP-M (Índice Geral de Preços do Mercado)</SelectItem>
                <SelectItem value="INPC">INPC (Índice Nacional de Preços ao Consumidor)</SelectItem>
                <SelectItem value="fixo">Percentual Fixo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Percentual de Reajuste (%) *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.percentage}
                onChange={(e) => handlePercentageChange(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label>Novo Valor Total *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.new_value}
                onChange={(e) => handleNewValueChange(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <Card className="p-4 bg-muted">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor Anterior:</span>
                <span className="font-semibold">
                  R$ {currentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Novo Valor:</span>
                <span className="font-semibold text-primary">
                  R$ {formData.new_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-muted-foreground">Diferença:</span>
                <span className={`font-semibold ${formData.new_value > currentValue ? 'text-green-600' : 'text-red-600'}`}>
                  {formData.percentage > 0 ? '+' : ''}
                  {formData.percentage.toFixed(2)}% 
                  ({formData.percentage > 0 ? '+' : ''}R$ {(formData.new_value - currentValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                </span>
              </div>
            </div>
          </Card>

          <div>
            <Label>Justificativa do Reajuste *</Label>
            <Textarea
              value={formData.justification}
              onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
              placeholder="Descreva a justificativa técnica e legal para este reajuste..."
              rows={4}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.index_type || !formData.justification}
            >
              Aplicar Reajuste
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
