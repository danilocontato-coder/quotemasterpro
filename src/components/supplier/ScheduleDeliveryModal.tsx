import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock, Package, Truck, Phone, Mail, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ScheduleDeliveryModalProps {
  quote?: any;
  delivery?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeliveryScheduled?: () => void;
}

export function ScheduleDeliveryModal({ 
  quote, 
  delivery,
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

  // Detectar modo: criar nova entrega ou atualizar existente
  const isUpdateMode = !!delivery && !quote;
  const sourceData = quote || delivery?.payments?.quotes;

  const handleScheduleDelivery = async () => {
    if (isSubmitting) return; // Prevenir duplo clique
    
    if (!scheduledDate) {
      toast.error("Data de entrega é obrigatória");
      return;
    }

    setIsLoading(true);
    setIsSubmitting(true);
    
    try {
      if (isUpdateMode && delivery) {
        // Modo atualização: atualizar entrega existente
        const { error } = await supabase
          .from('deliveries')
          .update({
            status: 'scheduled',
            scheduled_date: new Date(scheduledDate).toISOString(),
            notes: notes,
            delivery_method: transportType || 'own',
            updated_at: new Date().toISOString()
          })
          .eq('id', delivery.id);

        if (error) throw error;

        toast.success("Entrega agendada com sucesso!");
      } else if (quote) {
        // Modo criação: criar nova entrega via edge function
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

        toast.success("Entrega agendada com sucesso! Código enviado ao cliente.");
      }

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

  if (!quote && !delivery) return null;

  // Endereço completo já vem formatado do banco
  const fullAddress = quote?.clients?.address || delivery?.payments?.quotes?.client_address || '';
  const clientPhone = quote?.clients?.phone || delivery?.payments?.quotes?.client_phone || '';
  const clientEmail = quote?.clients?.email || delivery?.payments?.quotes?.client_email || '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {isUpdateMode ? 'Agendar Entrega' : `Agendar Entrega - Cotação ${quote?.local_code || `#${quote?.id}`}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quote Summary */}
          {sourceData && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-medium mb-3">Resumo da Cotação</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Cotação</p>
                  <p className="font-medium">{sourceData.local_code || `#${quote?.id || delivery?.quote_id.substring(0, 8)}`}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cliente</p>
                  <p className="font-medium">{quote?.clients?.name || sourceData.client_name}</p>
                </div>
                
                {clientPhone && (
                  <div>
                    <p className="text-muted-foreground">Telefone</p>
                    <p className="font-medium flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      {clientPhone}
                    </p>
                  </div>
                )}
                
                {clientEmail && (
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium text-xs flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" />
                      {clientEmail}
                    </p>
                  </div>
                )}
                
                <div className="col-span-2">
                  <p className="text-muted-foreground">Frete</p>
                  {(sourceData.shipping_cost === 0 || quote?.shipping_cost === 0) ? (
                    <Badge variant="approved">Grátis</Badge>
                  ) : (
                    <p className="font-medium">{formatCurrency(sourceData.shipping_cost || quote?.shipping_cost || 0)}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Endereço de Entrega */}
          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-900">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-600" />
              Endereço de Entrega
            </h3>
            
            {fullAddress ? (
              <div className="space-y-3">
                <div className="bg-white dark:bg-gray-900 p-3 rounded border">
                  <p className="font-medium text-sm">{fullAddress}</p>
                </div>
                
                <div className="flex flex-col gap-2 text-sm">
                  {clientPhone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{clientPhone}</span>
                    </div>
                  )}
                  {clientEmail && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="text-xs">{clientEmail}</span>
                    </div>
                  )}
                </div>
                
                <p className="text-muted-foreground text-xs flex items-center gap-1.5">
                  💡 Se a entrega for para outro local, preencha o campo "Endereço Alternativo" abaixo.
                </p>
              </div>
            ) : (
              <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded border border-yellow-200 dark:border-yellow-900">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Cliente não possui endereço cadastrado. Por favor, informe o endereço de entrega abaixo.
                </p>
              </div>
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
