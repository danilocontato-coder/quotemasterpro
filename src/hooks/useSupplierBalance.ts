import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SupplierBalance {
  balance: number;
  availableForTransfer: number;
  inEscrow: number;
  totalProjected: number;
  totalBalance: number;
}

export const useSupplierBalance = () => {
  const [balance, setBalance] = useState<SupplierBalance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: functionError } = await supabase.functions.invoke('get-supplier-balance');

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao buscar saldo');
      }

      setBalance({
        balance: data.balance || 0,
        availableForTransfer: data.availableForTransfer || 0,
        inEscrow: data.inEscrow || 0,
        totalProjected: data.totalProjected || 0,
        totalBalance: data.totalBalance || 0
      });

      console.log('[useSupplierBalance] Balance fetched:', data);
    } catch (err: any) {
      console.error('[useSupplierBalance] Error:', err);
      setError(err.message || 'Erro ao buscar saldo');
      toast.error(err.message || 'Erro ao buscar saldo da wallet Asaas');
    } finally {
      setIsLoading(false);
    }
  };

  const requestTransfer = async (
    amount: number,
    transferMethod: 'PIX' | 'TED',
    bankAccount: any,
    notes?: string
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: functionError } = await supabase.functions.invoke('request-supplier-transfer', {
        body: {
          amount,
          transferMethod,
          bankAccount,
          notes
        }
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao solicitar transferência');
      }

      console.log('[useSupplierBalance] Transfer requested:', data);
      toast.success(data.message || 'Transferência solicitada com sucesso');

      // Atualizar saldo após transferência
      await fetchBalance();

      return data.transfer;
    } catch (err: any) {
      console.error('[useSupplierBalance] Transfer error:', err);
      setError(err.message || 'Erro ao solicitar transferência');
      toast.error(err.message || 'Erro ao solicitar transferência');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    balance,
    isLoading,
    error,
    fetchBalance,
    requestTransfer
  };
};
