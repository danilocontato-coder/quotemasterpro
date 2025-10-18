import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAdministradoraAICredits } from './useAdministradoraAICredits';
import { CREDIT_COSTS } from '@/services/administradoraAICreditsService';

interface AnalysisResult {
  score?: number;
  strengths?: string[];
  weaknesses?: string[];
  risks?: string[];
  recommendation?: string;
}

export const useAdministradoraProposalConsultant = (clientId: string) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { checkCredits, debitCredits } = useAdministradoraAICredits(clientId);

  const analyzeIndividual = async (proposalId: string): Promise<AnalysisResult | null> => {
    try {
      // Check credits
      const hasCredits = await checkCredits(CREDIT_COSTS.INDIVIDUAL_ANALYSIS);
      if (!hasCredits) {
        toast.error('Créditos insuficientes para análise individual (15 créditos necessários)');
        return null;
      }

      setIsAnalyzing(true);

      // Call edge function
      const { data, error } = await supabase.functions.invoke('ai-proposal-consultant', {
        body: {
          type: 'individual',
          proposalId,
          clientId,
        },
      });

      if (error) throw error;

      // Save analysis
      const { data: proposalData } = await supabase
        .from('quote_responses')
        .select('quote_id')
        .eq('id', proposalId)
        .single();

      if (proposalData) {
        await supabase.from('ai_proposal_analyses').insert({
          proposal_id: proposalId,
          quote_id: proposalData.quote_id,
          client_id: clientId,
          analysis_type: 'individual',
          analysis_data: data.analysis,
        });
      }

      // Debit credits
      await debitCredits(
        CREDIT_COSTS.INDIVIDUAL_ANALYSIS,
        'proposal_individual_analysis',
        proposalId
      );

      toast.success('Análise individual concluída');
      return data.analysis;
    } catch (error: any) {
      console.error('Error analyzing proposal:', error);
      toast.error(error.message || 'Erro ao analisar proposta');
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeComparative = async (proposalIds: string[]): Promise<any> => {
    try {
      // Check credits
      const hasCredits = await checkCredits(CREDIT_COSTS.COMPARATIVE_ANALYSIS);
      if (!hasCredits) {
        toast.error('Créditos insuficientes para análise comparativa (25 créditos necessários)');
        return null;
      }

      setIsAnalyzing(true);

      // Call edge function
      const { data, error } = await supabase.functions.invoke('ai-proposal-consultant', {
        body: {
          type: 'comparative',
          proposalIds,
          clientId,
        },
      });

      if (error) throw error;

      // Debit credits (only once for all proposals)
      await debitCredits(
        CREDIT_COSTS.COMPARATIVE_ANALYSIS,
        'proposal_comparative_analysis',
        proposalIds.join(',')
      );

      toast.success('Análise comparativa concluída');
      return data.comparison;
    } catch (error: any) {
      console.error('Error comparing proposals:', error);
      toast.error(error.message || 'Erro ao comparar propostas');
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    analyzeIndividual,
    analyzeComparative,
    isAnalyzing,
  };
};
