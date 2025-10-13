import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { useQuoteVisits } from '@/hooks/useQuoteVisits';
import { VisitTimeline } from '@/components/quotes/VisitTimeline';
import { toast } from '@/hooks/use-toast';

interface VisitManagementModalProps {
  quote: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVisitUpdated?: () => void;
}

export function VisitManagementModal({ quote, open, onOpenChange, onVisitUpdated }: VisitManagementModalProps) {
  const { visits, scheduleVisit, confirmVisit, isLoading } = useQuoteVisits(quote?.id);
  
  // Schedule tab state
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [scheduleNotes, setScheduleNotes] = useState('');
  
  // Confirm tab state
  const [confirmedDate, setConfirmedDate] = useState('');
  const [confirmedTime, setConfirmedTime] = useState('');
  const [confirmationNotes, setConfirmationNotes] = useState('');

  const latestVisit = visits[0];
  const canSchedule = quote?.status === 'awaiting_visit';
  const canConfirm = quote?.status === 'visit_scheduled' && latestVisit?.status === 'scheduled';

  const handleSchedule = async () => {
    if (!scheduledDate || !scheduledTime) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha data e hora da visita.",
        variant: "destructive",
      });
      return;
    }

    const scheduledDateTime = `${scheduledDate}T${scheduledTime}:00`;
    await scheduleVisit(scheduledDateTime, scheduleNotes);
    
    setScheduledDate('');
    setScheduledTime('');
    setScheduleNotes('');
    
    onVisitUpdated?.();
  };

  const handleConfirm = async () => {
    if (!latestVisit || !confirmedDate || !confirmedTime) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha data e hora da visita realizada.",
        variant: "destructive",
      });
      return;
    }

    const confirmedDateTime = `${confirmedDate}T${confirmedTime}:00`;
    await confirmVisit(latestVisit.id, confirmedDateTime, confirmationNotes);
    
    setConfirmedDate('');
    setConfirmedTime('');
    setConfirmationNotes('');
    
    onVisitUpdated?.();
    onOpenChange(false);
  };

  if (!quote) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Gestão de Visita Técnica - {quote.id}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={canSchedule ? 'schedule' : canConfirm ? 'confirm' : 'history'} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="schedule" disabled={!canSchedule}>
              <Calendar className="h-4 w-4 mr-2" />
              Agendar
            </TabsTrigger>
            <TabsTrigger value="confirm" disabled={!canConfirm}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmar
            </TabsTrigger>
            <TabsTrigger value="history">
              <Clock className="h-4 w-4 mr-2" />
              Histórico
            </TabsTrigger>
          </TabsList>

          {/* ABA AGENDAR */}
          <TabsContent value="schedule" className="space-y-4">
            {canSchedule ? (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">📅 Agendar Visita Técnica</h4>
                    <p className="text-sm text-blue-700">
                      Defina data e hora para realizar a visita técnica no local do cliente.
                      Após o agendamento, você deverá confirmar a realização da visita.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="scheduled-date">Data da Visita *</Label>
                      <Input
                        id="scheduled-date"
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div>
                      <Label htmlFor="scheduled-time">Horário *</Label>
                      <Input
                        id="scheduled-time"
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="schedule-notes">Observações</Label>
                    <Textarea
                      id="schedule-notes"
                      value={scheduleNotes}
                      onChange={(e) => setScheduleNotes(e.target.value)}
                      placeholder="Ex: Levar equipamentos de medição, confirmar acesso ao local..."
                      rows={3}
                    />
                  </div>

                  <Button 
                    onClick={handleSchedule} 
                    disabled={isLoading || !scheduledDate || !scheduledTime}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Agendando...
                      </>
                    ) : (
                      <>
                        <Calendar className="h-4 w-4 mr-2" />
                        Confirmar Agendamento
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-gray-300">
                <CardContent className="pt-6 text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-muted-foreground">
                    {quote.status === 'visit_scheduled' ? 'Visita já agendada. Vá para aba "Confirmar".' : 
                     quote.status === 'visit_confirmed' ? 'Visita já confirmada.' :
                     'Aguardando liberação para agendamento.'}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ABA CONFIRMAR */}
          <TabsContent value="confirm" className="space-y-4">
            {canConfirm ? (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 mb-2">✅ Confirmar Realização da Visita</h4>
                    <p className="text-sm text-green-700 mb-2">
                      Informe a data e hora em que a visita foi efetivamente realizada.
                    </p>
                    {latestVisit && (
                      <p className="text-sm text-green-600">
                        <strong>Agendamento:</strong> {new Date(latestVisit.scheduled_date).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="confirmed-date">Data Realizada *</Label>
                      <Input
                        id="confirmed-date"
                        type="date"
                        value={confirmedDate}
                        onChange={(e) => setConfirmedDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirmed-time">Horário Realizado *</Label>
                      <Input
                        id="confirmed-time"
                        type="time"
                        value={confirmedTime}
                        onChange={(e) => setConfirmedTime(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="confirmation-notes">Relatório da Visita</Label>
                    <Textarea
                      id="confirmation-notes"
                      value={confirmationNotes}
                      onChange={(e) => setConfirmationNotes(e.target.value)}
                      placeholder="Descreva o que foi observado durante a visita, medidas realizadas, condições encontradas..."
                      rows={4}
                    />
                  </div>

                  <Button 
                    onClick={handleConfirm} 
                    disabled={isLoading || !confirmedDate || !confirmedTime}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Confirmando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Confirmar Visita Realizada
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-gray-300">
                <CardContent className="pt-6 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-muted-foreground">
                    {quote.status === 'awaiting_visit' ? 'Agende a visita primeiro.' :
                     quote.status === 'visit_confirmed' ? 'Visita já confirmada.' :
                     'Aguardando agendamento da visita.'}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ABA HISTÓRICO */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                {visits.length > 0 ? (
                  <VisitTimeline visits={visits} />
                ) : (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-muted-foreground">Nenhuma visita registrada ainda.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
