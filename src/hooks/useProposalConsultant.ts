import { useState, useCallback } from 'react';
import { 
  proposalConsultantService, 
  ProposalQualitativeAnalysis, 
  ComparativeConsultantAnalysis,
  ProposalForAnalysis
} from '@/services/ProposalConsultantService';
import { useToast } from '@/hooks/use-toast';

export function useProposalConsultant() {
  const [individualAnalyses, setIndividualAnalyses] = useState<Map<string, ProposalQualitativeAnalysis>>(new Map());
  const [comparativeAnalysis, setComparativeAnalysis] = useState<ComparativeConsultantAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0 });
  const { toast } = useToast();

  const analyzeProposal = useCallback(async (proposal: ProposalForAnalysis) => {
    try {
      setIsAnalyzing(true);
      const analysis = await proposalConsultantService.analyzeProposal(proposal);
      
      setIndividualAnalyses(prev => {
        const newMap = new Map(prev);
        newMap.set(proposal.id, analysis);
        return newMap;
      });

      return analysis;
    } catch (error) {
      console.error('Erro ao analisar proposta:', error);
      toast({
        title: 'Erro na Análise',
        description: 'Não foi possível analisar a proposta. Tente novamente.',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  }, [toast]);

  const analyzeAllProposals = useCallback(async (proposals: ProposalForAnalysis[]) => {
    if (proposals.length === 0) {
      toast({
        title: 'Sem Propostas',
        description: 'Não há propostas para analisar.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsAnalyzing(true);
      setAnalysisProgress({ current: 0, total: proposals.length + 1 });

      // Análise individual de cada proposta
      const analyses = new Map<string, ProposalQualitativeAnalysis>();
      
      for (let i = 0; i < proposals.length; i++) {
        const proposal = proposals[i];
        setAnalysisProgress({ current: i + 1, total: proposals.length + 1 });
        
        const analysis = await proposalConsultantService.analyzeProposal(proposal);
        analyses.set(proposal.id, analysis);
      }

      setIndividualAnalyses(analyses);

      // Análise comparativa
      setAnalysisProgress({ current: proposals.length + 1, total: proposals.length + 1 });
      const comparative = await proposalConsultantService.compareProposals(proposals);
      setComparativeAnalysis(comparative);

      toast({
        title: 'Análise Concluída! 🎉',
        description: `${proposals.length} propostas analisadas com sucesso pelo consultor IA.`,
      });

    } catch (error) {
      console.error('Erro ao analisar propostas:', error);
      toast({
        title: 'Erro na Análise',
        description: 'Não foi possível completar a análise. Tente novamente.',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress({ current: 0, total: 0 });
    }
  }, [toast]);

  const getAnalysis = useCallback((proposalId: string) => {
    return individualAnalyses.get(proposalId);
  }, [individualAnalyses]);

  const clearAnalyses = useCallback(() => {
    setIndividualAnalyses(new Map());
    setComparativeAnalysis(null);
  }, []);

  return {
    individualAnalyses,
    comparativeAnalysis,
    isAnalyzing,
    analysisProgress,
    analyzeProposal,
    analyzeAllProposals,
    getAnalysis,
    clearAnalyses,
    hasAnalyses: individualAnalyses.size > 0
  };
}
