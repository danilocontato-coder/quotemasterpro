import { useState } from "react";
import { CheckCircle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface VisitConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visit: any;
  onConfirmed: () => void;
}

export function VisitConfirmationModal({
  open,
  onOpenChange,
  visit,
  onConfirmed,
}: VisitConfirmationModalProps) {
  const [confirmedDate, setConfirmedDate] = useState("");
  const [confirmedTime, setConfirmedTime] = useState("");
  const [confirmationNotes, setConfirmationNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (!confirmedDate || !confirmedTime) {
      toast.error("Por favor, preencha data e horário da visita realizada");
      return;
    }

    setIsLoading(true);
    try {
      const confirmedDateTime = `${confirmedDate}T${confirmedTime}:00`;

      const { data, error } = await supabase.functions.invoke('confirm-visit', {
        body: {
          visitId: visit.id,
          confirmedDate: confirmedDateTime,
          confirmationNotes: confirmationNotes || undefined,
          attachments: [], // TODO: Implementar upload de anexos
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao confirmar visita');

      toast.success("Visita confirmada com sucesso! Você já pode enviar sua proposta.");
      onConfirmed();
      onOpenChange(false);
      
      // Reset form
      setConfirmedDate("");
      setConfirmedTime("");
      setConfirmationNotes("");
    } catch (error: any) {
      console.error('Error confirming visit:', error);
      toast.error(error.message || "Erro ao confirmar visita");
    } finally {
      setIsLoading(false);
    }
  };

  const scheduledDate = visit?.scheduled_date 
    ? new Date(visit.scheduled_date).toISOString().split('T')[0]
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Confirmar Realização da Visita
          </DialogTitle>
          <DialogDescription>
            Confirme que a visita técnica foi realizada
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
            <p className="font-medium">Visita agendada para:</p>
            <p>
              {visit?.scheduled_date && 
                new Date(visit.scheduled_date).toLocaleString('pt-BR')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmed-date">Data da Visita Realizada *</Label>
            <Input
              id="confirmed-date"
              type="date"
              value={confirmedDate}
              onChange={(e) => setConfirmedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmed-time">Horário *</Label>
            <Input
              id="confirmed-time"
              type="time"
              value={confirmedTime}
              onChange={(e) => setConfirmedTime(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmation-notes">Observações da Visita</Label>
            <Textarea
              id="confirmation-notes"
              placeholder="Descreva o que foi observado, medições realizadas, etc..."
              value={confirmationNotes}
              onChange={(e) => setConfirmationNotes(e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Anexar Fotos (opcional)</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Funcionalidade em desenvolvimento
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? "Confirmando..." : "Confirmar Visita"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
