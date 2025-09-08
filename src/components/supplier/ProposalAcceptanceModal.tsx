import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ProposalAcceptanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: any;
  responseId: string;
}

export function ProposalAcceptanceModal({ 
  open, 
  onOpenChange, 
  quote, 
  responseId 
}: ProposalAcceptanceModalProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState<Date>();
  const [observations, setObservations] = useState('');
  const [additionalCosts, setAdditionalCosts] = useState('');
  const { toast } = useToast();

  const handleAcceptProposal = async () => {
    if (!deliveryDate) {
      toast({
        title: 'Erro',
        description: 'Por favor, confirme a data de entrega',
        variant: 'destructive'
      });
      return;
    }

    setIsAccepting(true);
    try {
      // 1. Atualizar resposta da cotação para "accepted"
      const { error: responseError } = await supabase
        .from('quote_responses')
        .update({
          status: 'accepted',
          notes: `${quote.notes || ''}\n\nAceite confirmado em ${new Date().toLocaleDateString('pt-BR')}\nData de entrega confirmada: ${format(deliveryDate, 'dd/MM/yyyy', { locale: ptBR })}\n${observations ? `Observações: ${observations}` : ''}`
        })
        .eq('id', responseId);

      if (responseError) throw responseError;

      // 2. Criar registro de entrega
      const { error: deliveryError } = await supabase
        .from('deliveries')
        .insert({
          quote_id: quote.id,
          supplier_id: quote.supplierId,
          client_id: quote.clientId,
          scheduled_date: deliveryDate.toISOString(),
          status: 'scheduled',
          delivery_address: quote.deliveryAddress || 'Endereço a confirmar',
          notes: observations
        });

      if (deliveryError) throw deliveryError;

      // 3. Criar notificação para o cliente
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: quote.clientId,
          title: '📦 Entrega Confirmada',
          message: `O fornecedor confirmou a entrega para ${format(deliveryDate, 'dd/MM/yyyy', { locale: ptBR })} - Cotação: ${quote.title}`,
          type: 'delivery_scheduled',
          priority: 'normal',
          metadata: {
            quote_id: quote.id,
            delivery_date: deliveryDate.toISOString(),
            response_id: responseId
          }
        });

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
      }

      // 4. Log de auditoria
      await supabase.from('audit_logs').insert({
        user_id: quote.supplierId,
        action: 'PROPOSAL_ACCEPTED',
        entity_type: 'quote_response',
        entity_id: responseId,
        panel_type: 'supplier',
        details: {
          quote_id: quote.id,
          delivery_date: deliveryDate.toISOString(),
          observations: observations,
          additional_costs: additionalCosts
        }
      });

      toast({
        title: '✅ Proposta Aceita!',
        description: 'A entrega foi agendada e o cliente foi notificado',
      });

      onOpenChange(false);
      
      // Não fazer reload - deixar realtime atualizar os dados
      console.log('✅ Proposta aceita - aguardando atualização em tempo real');

    } catch (error) {
      console.error('Error accepting proposal:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao aceitar proposta. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Aceitar Proposta Aprovada
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-green-900">Parabéns! Sua proposta foi aprovada</p>
                <p className="text-green-700 mt-1">
                  O cliente aprovou sua proposta. Agora você precisa confirmar os detalhes da entrega.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="delivery-date">Data de Entrega Confirmada *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deliveryDate ? format(deliveryDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={deliveryDate}
                  onSelect={setDeliveryDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="additional-costs">Custos Adicionais (opcional)</Label>
            <Input
              id="additional-costs"
              placeholder="Ex: R$ 50,00 para frete express"
              value={additionalCosts}
              onChange={(e) => setAdditionalCosts(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observations">Observações da Entrega</Label>
            <Textarea
              id="observations"
              placeholder="Informações importantes sobre a entrega, horário preferencial, etc."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={3}
            />
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">Próximos Passos</p>
                <ul className="text-blue-700 mt-1 text-xs space-y-1">
                  <li>• Cliente será notificado sobre a confirmação</li>
                  <li>• Entrega será agendada para a data confirmada</li>
                  <li>• Você poderá atualizar o status da produção</li>
                  <li>• Pagamento será processado após a entrega</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleAcceptProposal}
            disabled={isAccepting || !deliveryDate}
            className="bg-green-600 hover:bg-green-700"
          >
            {isAccepting ? 'Confirmando...' : 'Confirmar Aceite'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}