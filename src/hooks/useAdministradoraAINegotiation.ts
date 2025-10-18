import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAdministradoraAICredits } from './useAdministradoraAICredits';
import { CREDIT_COSTS } from '@/services/administradoraAICreditsService';

interface NegotiationAnalysis {
  viable: boolean;
  improvementPotential: number;
  weakPoints: string[];
}

interface NegotiationResult {
  status: 'success' | 'failed';
  newTerms?: any;
  message?: string;
}

export const useAdministradoraAINegotiation = (clientId: string) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isNegotiating, setIsNegotiating] = useState(false);
  const { checkCredits, debitCredits } = useAdministradoraAICredits(clientId);

  const analyzeNegotiation = async (proposalId: string): Promise<NegotiationAnalysis | null> => {
    try {
      const hasCredits = await checkCredits(CREDIT_COSTS.NEGOTIATION_ANALYSIS);
      if (!hasCredits) {
        toast.error('Créditos insuficientes para análise de negociação (10 créditos)');
        return null;
      }

      setIsAnalyzing(true);

      const { data, error } = await supabase.functions.invoke('ai-negotiation-agent', {
        body: {
          action: 'analyze',
          proposalId,
          clientId,
        },
      });

      if (error) throw error;

      await debitCredits(
        CREDIT_COSTS.NEGOTIATION_ANALYSIS,
        'negotiation_analysis',
        proposalId
      );

      return data;
    } catch (error: any) {
      console.error('Error analyzing negotiation:', error);
      toast.error(error.message || 'Erro ao analisar viabilidade de negociação');
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startNegotiation = async (negotiationId: string): Promise<NegotiationResult | null> => {
    try {
      const hasCredits = await checkCredits(CREDIT_COSTS.ACTIVE_NEGOTIATION);
      if (!hasCredits) {
        toast.error('Créditos insuficientes para negociação (30 créditos)');
        return null;
      }

      setIsNegotiating(true);

      const { data, error } = await supabase.functions.invoke('ai-negotiation-agent', {
        body: {
          action: 'negotiate',
          negotiationId,
          clientId,
        },
      });

      if (error) throw error;

      await debitCredits(
        CREDIT_COSTS.ACTIVE_NEGOTIATION,
        'active_negotiation',
        negotiationId
      );

      if (data.status === 'success') {
        toast.success('Negociação concluída com sucesso!');
      } else {
        toast.warning('Negociação não obteve melhorias');
      }

      return data;
    } catch (error: any) {
      console.error('Error negotiating:', error);
      toast.error(error.message || 'Erro ao negociar com fornecedor');
      return null;
    } finally {
      setIsNegotiating(false);
    }
  };

  const approveNegotiation = async (negotiationId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('ai_negotiations')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('id', negotiationId);

      if (error) throw error;

      toast.success('Termos negociados aprovados');
      return true;
    } catch (error: any) {
      console.error('Error approving negotiation:', error);
      toast.error('Erro ao aprovar negociação');
      return false;
    }
  };

  return {
    analyzeNegotiation,
    startNegotiation,
    approveNegotiation,
    isAnalyzing,
    isNegotiating,
  };
};
