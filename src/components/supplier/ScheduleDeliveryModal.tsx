import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock, Package, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ScheduleDeliveryModalProps {
  quote: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeliveryScheduled?: () => void;
}

export function ScheduleDeliveryModal({ 
  quote, 
  open, 
  onOpenChange,
  onDeliveryScheduled 
}: ScheduleDeliveryModalProps) {
  const [scheduledDate, setScheduledDate] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [transportType, setTransportType] = useState("");
  const [transportDetails, setTransportDetails] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleScheduleDelivery = async () => {
    if (isSubmitting) return; // Prevenir duplo clique
    
    if (!scheduledDate) {
      toast.error("Data de entrega é obrigatória");
      return;
    }

    setIsLoading(true);
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('schedule-delivery', {
        body: {
          quote_id: quote.id,
          scheduled_date: scheduledDate,
          delivery_address: deliveryAddress,
          notes: notes,
          transport_type: transportType,
          transport_details: transportDetails
        }
      });

      if (error) throw error;

      toast.success("Entrega agendada com sucesso!");
      onDeliveryScheduled?.();
      onOpenChange(false);
      
      // Reset form
      setScheduledDate("");
      setDeliveryAddress("");
      setNotes("");
      setTransportType("");
      setTransportDetails("");
    } catch (error: any) {
      console.error('Error scheduling delivery:', error);
      
      // Parse error from edge function response
      let errorMessage = 'Erro ao agendar entrega';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error) {
        errorMessage = error.error;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Show detailed error with hint if available
      if (error?.hint) {
        toast.error(errorMessage, {
          description: error.hint,
          duration: 6000
        });
      } else {
        toast.error(errorMessage, {
          duration: 5000
        });
      }
    } finally {
      setIsLoading(false);
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  if (!quote) return null;

  // Extrair dados do endereço do cliente
  const clientAddress = quote.client_address || '';
  const clientCity = quote.client_city || '';
  const clientState = quote.client_state || '';
  const fullAddress = [clientAddress, clientCity, clientState]
    .filter(Boolean)
    .join(', ');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Agendar Entrega - Cotação {quote.local_code || `#${quote.id}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quote Summary */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Resumo da Cotação</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Título</p>
                <p className="font-medium">{quote.title}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Cliente</p>
                <p className="font-medium">{quote.clients?.name || quote.client_name}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">Frete</p>
                {quote.shipping_cost === 0 ? (
                  <Badge variant="approved">Grátis</Badge>
                ) : (
                  <p className="font-medium">{formatCurrency(quote.shipping_cost || 0)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Endereço do Cliente */}
          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-900">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-600" />
              Endereço do Cliente
            </h3>
            {fullAddress ? (
              <div className="space-y-1 text-sm">
                <p className="font-medium text-foreground">{fullAddress}</p>
                <p className="text-muted-foreground text-xs">
                  Este é o endereço cadastrado do cliente. 
                  Se a entrega for para outro local, preencha o campo abaixo.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                ⚠️ Cliente não possui endereço cadastrado. 
                Por favor, informe o endereço de entrega abaixo.
              </p>
            )}
          </div>

          {/* Delivery Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled-date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Data de Entrega *
              </Label>
              <Input
                id="scheduled-date"
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery-address" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Endereço Alternativo (opcional)
              </Label>
              <Textarea
                id="delivery-address"
                placeholder="Preencha apenas se a entrega for para um endereço diferente do padrão"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="transport-type" className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Tipo de Transporte (opcional)
              </Label>
              <Select value={transportType} onValueChange={setTransportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de transporte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="own">Transporte Próprio</SelectItem>
                  <SelectItem value="uber">Uber Solicitado Externamente</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {transportType && (
              <div className="space-y-2">
                <Label htmlFor="transport-details">
                  Detalhes do Transporte (opcional)
                </Label>
                <Textarea
                  id="transport-details"
                  placeholder="Ex: Placa do veículo, nome do motorista, código do Uber, etc."
                  value={transportDetails}
                  onChange={(e) => setTransportDetails(e.target.value)}
                  rows={2}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Observações (opcional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Instruções especiais, horário preferido, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleScheduleDelivery}
              disabled={isLoading || !scheduledDate}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                "Agendando..."
              ) : (
                <>
                  <Package className="h-4 w-4" />
                  Agendar Entrega
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}