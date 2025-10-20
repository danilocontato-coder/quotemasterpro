import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAccountability } from '@/hooks/useAccountability';

interface ApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordId: string;
  action: 'approve' | 'reject';
}

export function ApprovalModal({ open, onOpenChange, recordId, action }: ApprovalModalProps) {
  const { approveRecord, rejectRecord } = useAccountability();
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (action === 'approve') {
        await approveRecord(recordId, notes);
      } else {
        await rejectRecord(recordId, notes);
      }
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {action === 'approve' ? 'Aprovar Prestação' : 'Rejeitar Prestação'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{action === 'approve' ? 'Observações (opcional)' : 'Motivo da rejeição *'}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={action === 'approve' ? 'Adicione observações...' : 'Descreva o motivo...'}
              rows={4}
              required={action === 'reject'}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || (action === 'reject' && !notes)}
              variant={action === 'approve' ? 'default' : 'destructive'}
            >
              {isSubmitting ? 'Processando...' : action === 'approve' ? 'Aprovar' : 'Rejeitar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
