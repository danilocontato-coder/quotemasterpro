import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RenewContractModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: RenewalData) => void;
  currentContract: {
    id: string;
    contract_number: string;
    total_value: number;
    start_date: string;
    end_date: string;
  };
}

export interface RenewalData {
  new_start_date: string;
  new_end_date: string;
  duration_months: number;
  adjustment_type: 'none' | 'index' | 'manual';
  index_type?: string;
  adjustment_percentage?: number;
  new_value: number;
  observations: string;
}

export const RenewContractModal = ({
  open,
  onClose,
  onConfirm,
  currentContract,
}: RenewContractModalProps) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<RenewalData>({
    new_start_date: currentContract.end_date,
    new_end_date: format(addMonths(new Date(currentContract.end_date), 12), 'yyyy-MM-dd'),
    duration_months: 12,
    adjustment_type: 'none',
    new_value: currentContract.total_value,
    observations: '',
  });

  const handleDurationChange = (months: number) => {
    const startDate = new Date(formData.new_start_date);
    const endDate = addMonths(startDate, months);
    setFormData({
      ...formData,
      duration_months: months,
      new_end_date: format(endDate, 'yyyy-MM-dd'),
    });
  };

  const handleAdjustmentChange = (type: 'none' | 'index' | 'manual') => {
    let newValue = currentContract.total_value;
    
    if (type === 'none') {
      newValue = currentContract.total_value;
    } else if (type === 'index' && formData.adjustment_percentage) {
      newValue = currentContract.total_value * (1 + formData.adjustment_percentage / 100);
    }

    setFormData({
      ...formData,
      adjustment_type: type,
      new_value: newValue,
    });
  };

  const handlePercentageChange = (percentage: number) => {
    const newValue = currentContract.total_value * (1 + percentage / 100);
    setFormData({
      ...formData,
      adjustment_percentage: percentage,
      new_value: newValue,
    });
  };

  const handleSubmit = () => {
    onConfirm(formData);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Renovar Contrato #{currentContract.contract_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex-1 h-2 rounded ${
                  s <= step ? 'bg-primary' : 'bg-muted'
                } ${s !== 3 ? 'mr-2' : ''}`}
              />
            ))}
          </div>

          {/* Step 1: Vigência */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Passo 1: Nova Vigência</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data de Início</Label>
                  <Input
                    type="date"
                    value={formData.new_start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, new_start_date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Prazo (meses)</Label>
                  <Select
                    value={formData.duration_months.toString()}
                    onValueChange={(v) => handleDurationChange(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6 meses</SelectItem>
                      <SelectItem value="12">12 meses</SelectItem>
                      <SelectItem value="24">24 meses</SelectItem>
                      <SelectItem value="36">36 meses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Data de Término</Label>
                <Input
                  type="date"
                  value={formData.new_end_date}
                  onChange={(e) =>
                    setFormData({ ...formData, new_end_date: e.target.value })
                  }
                />
              </div>
            </div>
          )}

          {/* Step 2: Reajuste */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Passo 2: Reajuste de Valor</h3>
              
              <div>
                <Label>Tipo de Reajuste</Label>
                <Select
                  value={formData.adjustment_type}
                  onValueChange={(v: any) => handleAdjustmentChange(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Manter Valor Atual</SelectItem>
                    <SelectItem value="index">Aplicar Índice</SelectItem>
                    <SelectItem value="manual">Definir Manualmente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.adjustment_type === 'index' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Índice</Label>
                      <Select
                        value={formData.index_type}
                        onValueChange={(v) => setFormData({ ...formData, index_type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IPCA">IPCA</SelectItem>
                          <SelectItem value="IGP-M">IGP-M</SelectItem>
                          <SelectItem value="INPC">INPC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Percentual (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.adjustment_percentage || ''}
                        onChange={(e) => handlePercentageChange(parseFloat(e.target.value))}
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <Label>Novo Valor Total</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.new_value}
                  onChange={(e) =>
                    setFormData({ ...formData, new_value: parseFloat(e.target.value) })
                  }
                  disabled={formData.adjustment_type !== 'manual'}
                />
              </div>

              <Card className="p-4 bg-muted">
                <div className="flex justify-between text-sm">
                  <span>Valor Atual:</span>
                  <span className="font-semibold">
                    R$ {currentContract.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span>Novo Valor:</span>
                  <span className="font-semibold text-primary">
                    R$ {formData.new_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {formData.adjustment_percentage && (
                  <div className="flex justify-between text-sm mt-2">
                    <span>Variação:</span>
                    <span className="font-semibold">+{formData.adjustment_percentage.toFixed(2)}%</span>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Step 3: Revisão */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Passo 3: Revisão e Confirmação</h3>
              
              <Card className="p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Período Atual</p>
                    <p className="font-medium">
                      {format(new Date(currentContract.start_date), 'dd/MM/yyyy', { locale: ptBR })} -{' '}
                      {format(new Date(currentContract.end_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Novo Período</p>
                    <p className="font-medium text-primary">
                      {format(new Date(formData.new_start_date), 'dd/MM/yyyy', { locale: ptBR })} -{' '}
                      {format(new Date(formData.new_end_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Valor Atual</p>
                    <p className="font-medium">
                      R$ {currentContract.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Novo Valor</p>
                    <p className="font-medium text-primary">
                      R$ {formData.new_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </Card>

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  placeholder="Adicione observações sobre esta renovação..."
                  rows={4}
                />
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                Voltar
              </Button>
            ) : (
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
            )}

            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)}>Próximo</Button>
            ) : (
              <Button onClick={handleSubmit}>Confirmar Renovação</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
