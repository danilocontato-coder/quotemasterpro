import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { administradoraAICreditsService } from '@/services/administradoraAICreditsService';
import { AICredits } from '@/types/administradoraQuotes';

export const useAdministradoraAICredits = (targetClientId?: string) => {
  const { user } = useAuth();
  const [credits, setCredits] = useState<AICredits | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clientId = targetClientId || user?.clientId;

  const fetchCredits = async () => {
    if (!clientId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const data = await administradoraAICreditsService.getCredits(clientId);
    setCredits(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCredits();
  }, [clientId]);

  const checkCredits = async (required: number): Promise<boolean> => {
    if (!clientId) return false;
    return await administradoraAICreditsService.checkCredits(clientId, required);
  };

  const debitCredits = async (
    amount: number,
    reason: string,
    referenceId?: string
  ): Promise<boolean> => {
    if (!clientId) return false;
    const success = await administradoraAICreditsService.debitCredits(
      clientId,
      amount,
      reason,
      referenceId
    );
    if (success) {
      await fetchCredits(); // Refresh credits
    }
    return success;
  };

  return {
    credits,
    isLoading,
    refetch: fetchCredits,
    checkCredits,
    debitCredits,
  };
};
