import { useState } from "react";
import { Calendar, Clock } from "lucide-react";
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

interface VisitSchedulingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: any;
  onScheduled: () => void;
}

export function VisitSchedulingModal({
  open,
  onOpenChange,
  quote,
  onScheduled,
}: VisitSchedulingModalProps) {
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSchedule = async () => {
    if (!scheduledDate || !scheduledTime) {
      toast.error("Por favor, preencha data e horário");
      return;
    }

    setIsLoading(true);
    try {
      const scheduledDateTime = `${scheduledDate}T${scheduledTime}:00`;

      const { data, error } = await supabase.functions.invoke('schedule-visit', {
        body: {
          quoteId: quote.id,
          scheduledDate: scheduledDateTime,
          notes: notes || undefined,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao agendar visita');

      toast.success("Visita agendada com sucesso!");
      onScheduled();
      onOpenChange(false);
      
      // Reset form
      setScheduledDate("");
      setScheduledTime("");
      setNotes("");
    } catch (error: any) {
      console.error('Error scheduling visit:', error);
      toast.error(error.message || "Erro ao agendar visita");
    } finally {
      setIsLoading(false);
    }
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Agendar Visita Técnica
          </DialogTitle>
          <DialogDescription>
            Agende uma visita técnica para análise antes de enviar sua proposta
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="date">Data da Visita *</Label>
            <Input
              id="date"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={today}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="time">Horário *</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Informações adicionais sobre a visita..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {quote.visit_deadline && (
            <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
              <p className="font-medium">Prazo sugerido pelo cliente:</p>
              <p>{new Date(quote.visit_deadline).toLocaleDateString('pt-BR')}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSchedule} disabled={isLoading}>
            {isLoading ? "Agendando..." : "Agendar Visita"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
