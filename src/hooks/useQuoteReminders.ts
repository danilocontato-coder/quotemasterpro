import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export function useQuoteReminders() {
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const sendReminder = async (quoteId: string, hoursSinceSent = 48) => {
    try {
      setSending(true);

      const { data, error } = await supabase.functions.invoke('send-quote-reminders', {
        body: {
          quote_id: quoteId,
          hours_since_sent: hoursSinceSent
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Lembretes enviados",
          description: `${data.reminders_sent} lembrete(s) enviado(s) com sucesso`,
        });
        return data;
      } else {
        throw new Error(data.error || 'Erro ao enviar lembretes');
      }
    } catch (error) {
      console.error('Error sending reminders:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : 'Não foi possível enviar os lembretes',
        variant: "destructive"
      });
      return null;
    } finally {
      setSending(false);
    }
  };

  const sendBulkReminders = async (hoursSinceSent = 48) => {
    try {
      setSending(true);

      const { data, error } = await supabase.functions.invoke('send-quote-reminders', {
        body: {
          hours_since_sent: hoursSinceSent
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Lembretes em massa enviados",
          description: `${data.reminders_sent} lembrete(s) enviado(s) com sucesso`,
        });
        return data;
      } else {
        throw new Error(data.error || 'Erro ao enviar lembretes');
      }
    } catch (error) {
      console.error('Error sending bulk reminders:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : 'Não foi possível enviar os lembretes',
        variant: "destructive"
      });
      return null;
    } finally {
      setSending(false);
    }
  };

  const getSupplierStatus = async (quoteId: string) => {
    try {
      const { data, error } = await supabase
        .from('quote_supplier_status')
        .select(`
          *,
          suppliers (
            name,
            email,
            phone,
            whatsapp
          )
        `)
        .eq('quote_id', quoteId)
        .order('status', { ascending: false });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching supplier status:', error);
      toast({
        title: "Erro",
        description: 'Não foi possível buscar o status dos fornecedores',
        variant: "destructive"
      });
      return null;
    }
  };

  return {
    sendReminder,
    sendBulkReminders,
    getSupplierStatus,
    sending
  };
}
