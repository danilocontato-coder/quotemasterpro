import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Quote } from '@/hooks/useSupabaseQuotes';

interface DeleteConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: Quote | null;
  onConfirm: (reason?: string) => void;
}

export function DeleteConfirmationModal({ 
  open, 
  onOpenChange, 
  quote, 
  onConfirm 
}: DeleteConfirmationModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!quote) return;
    
    setIsSubmitting(true);
    try {
      // For sent quotes, reason is required
      if (quote.status !== 'draft' && !reason.trim()) {
        return;
      }
      
      onConfirm(reason.trim() || undefined);
      setReason('');
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setReason('');
    onOpenChange(false);
  };

  if (!quote) return null;

  const isDraft = quote.status === 'draft';
  const title = isDraft ? 'Excluir Cotação' : 'Cancelar Cotação';
  const description = isDraft 
    ? 'Esta ação não pode ser desfeita. A cotação será excluída permanentemente.'
    : 'Esta cotação já foi enviada. Ao cancelá-la, os fornecedores serão notificados e ela será movida para a lixeira.';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <AlertDialogTitle>{title}</AlertDialogTitle>
              <AlertDialogDescription className="text-left mt-1">
                <strong>{quote.local_code}</strong> - {quote.title}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
          
          {!isDraft && (
            <div className="space-y-2">
              <Label htmlFor="reason">
                Motivo do cancelamento <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reason"
                placeholder="Informe o motivo do cancelamento que será enviado aos fornecedores..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
              {!reason.trim() && (
                <p className="text-xs text-destructive">
                  O motivo é obrigatório para cotações enviadas
                </p>
              )}
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={isSubmitting || (!isDraft && !reason.trim())}
          >
            {isSubmitting ? 'Processando...' : (isDraft ? 'Excluir' : 'Cancelar Cotação')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}