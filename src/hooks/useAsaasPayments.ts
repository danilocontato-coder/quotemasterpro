import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AsaasPayment {
  id: string;
  customer: string;
  billingType: string;
  value: number;
  netValue: number;
  dueDate: string;
  status: string;
  description: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  identificationField?: string;
  nossoNumero?: string;
  deleted: boolean;
}

export const useAsaasPayments = () => {
  const [payments, setPayments] = useState<AsaasPayment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const listPayments = async (filters?: { customerId?: string; status?: string; limit?: number; offset?: number }) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('asaas-list-payments', {
        body: {
          customerId: filters?.customerId,
          status: filters?.status,
          limit: filters?.limit || 100,
          offset: filters?.offset || 0,
        },
      });

      if (error) throw error;

      setPayments(data?.data || []);
      return data;
    } catch (error: any) {
      console.error('Erro ao listar cobranças:', error);
      toast({
        title: 'Erro ao listar cobranças',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updatePayment = async (paymentId: string, updates: { dueDate?: string; value?: number; description?: string }) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('asaas-update-payment', {
        body: {
          paymentId,
          ...updates,
        },
      });

      if (error) throw error;

      toast({
        title: 'Cobrança atualizada',
        description: 'A cobrança foi atualizada com sucesso',
      });

      // Atualizar lista local
      setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, ...data } : p));

      return data;
    } catch (error: any) {
      console.error('Erro ao atualizar cobrança:', error);
      toast({
        title: 'Erro ao atualizar cobrança',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const deletePayment = async (paymentId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('asaas-delete-payment', {
        body: { paymentId },
      });

      if (error) throw error;

      toast({
        title: 'Cobrança deletada',
        description: 'A cobrança foi deletada com sucesso',
      });

      // Remover da lista local
      setPayments(prev => prev.filter(p => p.id !== paymentId));

      return data;
    } catch (error: any) {
      console.error('Erro ao deletar cobrança:', error);
      toast({
        title: 'Erro ao deletar cobrança',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const createPayment = async (paymentData: {
    customerId: string;
    value: number;
    dueDate: string;
    description?: string;
    billingType?: string;
  }) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('asaas-create-payment', {
        body: paymentData,
      });

      if (error) throw error;

      toast({
        title: 'Cobrança criada',
        description: 'Nova cobrança criada com sucesso',
      });

      // Adicionar à lista local
      setPayments(prev => [data, ...prev]);

      return data;
    } catch (error: any) {
      console.error('Erro ao criar cobrança:', error);
      toast({
        title: 'Erro ao criar cobrança',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      PENDING: 'Pendente',
      RECEIVED: 'Recebido',
      CONFIRMED: 'Confirmado',
      OVERDUE: 'Vencido',
      REFUNDED: 'Reembolsado',
      RECEIVED_IN_CASH: 'Recebido em dinheiro',
      REFUND_REQUESTED: 'Reembolso solicitado',
      CHARGEBACK_REQUESTED: 'Chargeback solicitado',
      CHARGEBACK_DISPUTE: 'Disputa de chargeback',
      AWAITING_CHARGEBACK_REVERSAL: 'Aguardando reversão',
      DUNNING_REQUESTED: 'Cobrança solicitada',
      DUNNING_RECEIVED: 'Cobrança recebida',
      AWAITING_RISK_ANALYSIS: 'Aguardando análise',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      PENDING: 'bg-yellow-500',
      RECEIVED: 'bg-green-500',
      CONFIRMED: 'bg-green-600',
      OVERDUE: 'bg-red-500',
      REFUNDED: 'bg-gray-500',
    };
    return colorMap[status] || 'bg-gray-500';
  };

  return {
    payments,
    isLoading,
    listPayments,
    updatePayment,
    deletePayment,
    createPayment,
    getStatusText,
    getStatusColor,
  };
};
