import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAccountability, RecordType } from '@/hooks/useAccountability';
import { useSupabasePayments } from '@/hooks/useSupabasePayments';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface AccountabilityFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentId?: string;
}

export function AccountabilityFormModal({
  open,
  onOpenChange,
  paymentId: initialPaymentId,
}: AccountabilityFormModalProps) {
  const { createRecord } = useAccountability();
  const { payments } = useSupabasePayments();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientId, setClientId] = useState('');
  const [paymentId, setPaymentId] = useState(initialPaymentId || '');
  const [recordType, setRecordType] = useState<RecordType>('purchase');
  const [destination, setDestination] = useState('');
  const [amountSpent, setAmountSpent] = useState('');
  const [accountabilityDate, setAccountabilityDate] = useState<Date>(new Date());
  const [costCenterId, setCostCenterId] = useState('');
  const [costCenters, setCostCenters] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      fetchUserClient();
      fetchCostCenters();
    }
  }, [open]);

  useEffect(() => {
    if (initialPaymentId) {
      const payment = payments.find(p => p.id === initialPaymentId);
      if (payment) {
        setAmountSpent(payment.amount.toString());
      }
    }
  }, [initialPaymentId, payments]);

  const fetchUserClient = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', userData.user.id)
        .single();
      
      if (profile?.client_id) {
        setClientId(profile.client_id);
      }
    }
  };

  const fetchCostCenters = async () => {
    const { data } = await supabase
      .from('cost_centers')
      .select('id, name, code')
      .eq('active', true);
    
    setCostCenters(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientId) {
      toast({
        title: 'Erro',
        description: 'Cliente não identificado',
        variant: 'destructive',
      });
      return;
    }

    if (!destination || !amountSpent || !accountabilityDate) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createRecord({
        payment_id: paymentId || undefined,
        client_id: clientId,
        cost_center_id: costCenterId || undefined,
        record_type: recordType,
        destination,
        amount_spent: parseFloat(amountSpent),
        accountability_date: format(accountabilityDate, 'yyyy-MM-dd'),
        status: 'submitted',
      });

      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating accountability record:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setPaymentId('');
    setRecordType('purchase');
    setDestination('');
    setAmountSpent('');
    setAccountabilityDate(new Date());
    setCostCenterId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Prestação de Contas</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment">Pagamento (opcional)</Label>
              <Select value={paymentId} onValueChange={setPaymentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {payments.map((payment) => (
                    <SelectItem key={payment.id} value={payment.id}>
                      {payment.id} - R$ {payment.amount.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recordType">Tipo *</Label>
              <Select value={recordType} onValueChange={(v) => setRecordType(v as RecordType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="purchase">Compra</SelectItem>
                  <SelectItem value="service">Serviço</SelectItem>
                  <SelectItem value="maintenance">Manutenção</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="destination">Destino/Finalidade *</Label>
            <Textarea
              id="destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Descreva o destino ou finalidade do gasto"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor Gasto (R$) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amountSpent}
                onChange={(e) => setAmountSpent(e.target.value)}
                placeholder="0,00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Data da Prestação *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !accountabilityDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {accountabilityDate ? (
                      format(accountabilityDate, 'dd/MM/yyyy', { locale: ptBR })
                    ) : (
                      <span>Selecione a data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={accountabilityDate}
                    onSelect={(date) => date && setAccountabilityDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="costCenter">Centro de Custo (opcional)</Label>
            <Select value={costCenterId} onValueChange={setCostCenterId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um centro de custo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhum</SelectItem>
                {costCenters.map((cc) => (
                  <SelectItem key={cc.id} value={cc.id}>
                    {cc.code} - {cc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Registrar Prestação'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
