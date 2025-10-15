import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TerminateContractModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: TerminationData) => void;
  contractNumber: string;
}

export interface TerminationData {
  termination_reason: string;
  termination_date: string;
  observations: string;
  final_status: 'cancelado' | 'expirado';
}

export const TerminateContractModal = ({
  open,
  onClose,
  onConfirm,
  contractNumber,
}: TerminateContractModalProps) => {
  const [formData, setFormData] = useState<TerminationData>({
    termination_reason: '',
    termination_date: new Date().toISOString().split('T')[0],
    observations: '',
    final_status: 'cancelado',
  });

  const handleSubmit = () => {
    onConfirm(formData);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Encerrar Contrato #{contractNumber}</DialogTitle>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Esta ação encerrará formalmente o contrato. Esta operação não pode ser desfeita.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Label>Motivo do Encerramento *</Label>
            <Select
              value={formData.termination_reason}
              onValueChange={(v) => setFormData({ ...formData, termination_reason: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="termino_normal">Término Normal do Prazo</SelectItem>
                <SelectItem value="rescisao_mutuo_acordo">Rescisão por Mútuo Acordo</SelectItem>
                <SelectItem value="rescisao_unilateral">Rescisão Unilateral</SelectItem>
                <SelectItem value="inadimplencia">Inadimplência</SelectItem>
                <SelectItem value="descumprimento">Descumprimento de Cláusulas</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Data de Encerramento Efetivo *</Label>
            <Input
              type="date"
              value={formData.termination_date}
              onChange={(e) => setFormData({ ...formData, termination_date: e.target.value })}
            />
          </div>

          <div>
            <Label>Status Final</Label>
            <Select
              value={formData.final_status}
              onValueChange={(v: any) => setFormData({ ...formData, final_status: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cancelado">Cancelado</SelectItem>
                <SelectItem value="expirado">Expirado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Observações Finais *</Label>
            <Textarea
              value={formData.observations}
              onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              placeholder="Descreva os motivos e circunstâncias do encerramento..."
              rows={5}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={!formData.termination_reason || !formData.observations}
            >
              Confirmar Encerramento
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
