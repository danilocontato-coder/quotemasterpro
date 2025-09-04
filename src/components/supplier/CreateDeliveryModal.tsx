import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Quote {
  id: string;
  title: string;
  client_id: string;
  client_name: string;
}

interface CreateDeliveryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeliveryCreated: (delivery: any) => void;
}

export function CreateDeliveryModal({ open, onOpenChange, onDeliveryCreated }: CreateDeliveryModalProps) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Buscar cotações aprovadas do fornecedor
  useEffect(() => {
    if (open && user) {
      fetchQuotes();
    }
  }, [open, user]);

  const fetchQuotes = async () => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('supplier_id')
        .eq('id', user?.id)
        .single();

      if (profileData?.supplier_id) {
        const { data } = await supabase
          .from('quotes')
          .select('id, title, client_id, client_name')
          .eq('supplier_id', profileData.supplier_id)
          .eq('status', 'approved');

        setQuotes(data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar cotações:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedQuote || !deliveryAddress || !scheduledDate) {
      return;
    }

    setLoading(true);

    try {
      const selectedQuoteData = quotes.find(q => q.id === selectedQuote);
      
      const deliveryData = {
        quote_id: selectedQuote,
        client_id: selectedQuoteData?.client_id || '',
        delivery_address: deliveryAddress,
        scheduled_date: scheduledDate.toISOString(),
        notes: notes || undefined
      };

      await onDeliveryCreated(deliveryData);
      
      // Reset form
      setSelectedQuote('');
      setDeliveryAddress('');
      setScheduledDate(undefined);
      setNotes('');
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao criar entrega:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Entrega</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quote">Cotação</Label>
            <Select value={selectedQuote} onValueChange={setSelectedQuote}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma cotação aprovada" />
              </SelectTrigger>
              <SelectContent>
                {quotes.map((quote) => (
                  <SelectItem key={quote.id} value={quote.id}>
                    {quote.title} - {quote.client_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço de Entrega</Label>
            <Textarea
              id="address"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Informe o endereço completo para entrega"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Data de Entrega</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !scheduledDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {scheduledDate ? format(scheduledDate, "dd/MM/yyyy") : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={scheduledDate}
                  onSelect={setScheduledDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informações adicionais sobre a entrega"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Entrega'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}