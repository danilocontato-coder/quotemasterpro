import { useState, useCallback, useEffect } from 'react';
import { 
  proposalConsultantService, 
  ProposalQualitativeAnalysis, 
  ComparativeConsultantAnalysis,
  ProposalForAnalysis
} from '@/services/ProposalConsultantService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function useProposalConsultant() {
  const [individualAnalyses, setIndividualAnalyses] = useState<Map<string, ProposalQualitativeAnalysis>>(new Map());
  const [comparativeAnalysis, setComparativeAnalysis] = useState<ComparativeConsultantAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0 });
  const { toast } = useToast();

  const saveAnalysisToDatabase = useCallback(async (
    quoteId: string,
    analysisType: 'individual' | 'comparative',
    analysisData: any,
    proposalId?: string,
    supplierId?: string,
    supplierName?: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', user.id)
        .single();

      if (!profile?.client_id) return;

      const { error } = await supabase
        .from('ai_proposal_analyses')
        .insert({
          quote_id: quoteId,
          client_id: profile.client_id,
          analysis_type: analysisType,
          proposal_id: proposalId,
          supplier_id: supplierId,
          supplier_name: supplierName,
          analysis_data: analysisData,
          created_by: user.id
        });

      if (error) {
        console.error('Erro ao salvar análise:', error);
        throw error;
      }
    } catch (error) {
      console.error('Erro ao salvar análise no banco:', error);
    }
  }, []);

  const analyzeProposal = useCallback(async (proposal: ProposalForAnalysis) => {
    try {
      setIsAnalyzing(true);
      const analysis = await proposalConsultantService.analyzeProposal(proposal);
      
      setIndividualAnalyses(prev => {
        const newMap = new Map(prev);
        newMap.set(proposal.id, analysis);
        return newMap;
      });

      // Salvar no banco de dados
      await saveAnalysisToDatabase(
        proposal.quoteId,
        'individual',
        analysis,
        proposal.id,
        proposal.supplierId,
        proposal.supplierName
      );

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
  }, [toast, saveAnalysisToDatabase]);

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
        
        try {
          console.log(`🔍 Analisando proposta ${i + 1}/${proposals.length}: ${proposal.supplierName}`);
          
          const analysis = await proposalConsultantService.analyzeProposal(proposal);
          analyses.set(proposal.id, analysis);

          // Salvar análise individual no banco
          await saveAnalysisToDatabase(
            proposal.quoteId,
            'individual',
            analysis,
            proposal.id,
            proposal.supplierId,
            proposal.supplierName
          );

          toast({
            title: 'Análise Individual Concluída',
            description: `${proposal.supplierName} analisado com sucesso.`,
          });
        } catch (error) {
          console.error(`Erro ao analisar ${proposal.supplierName}:`, error);
          toast({
            title: 'Erro na Análise Individual',
            description: `Falha ao analisar ${proposal.supplierName}. Continuando...`,
            variant: 'destructive'
          });
          // Continua para próxima proposta mesmo com erro
        }
      }

      setIndividualAnalyses(analyses);

      // Análise comparativa
      setAnalysisProgress({ current: proposals.length + 1, total: proposals.length + 1 });
      const comparative = await proposalConsultantService.compareProposals(proposals);
      setComparativeAnalysis(comparative);

      // Salvar análise comparativa no banco
      if (proposals.length > 0) {
        await saveAnalysisToDatabase(
          proposals[0].quoteId,
          'comparative',
          comparative
        );
      }

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
  }, [toast, saveAnalysisToDatabase]);

  const getAnalysis = useCallback((proposalId: string) => {
    return individualAnalyses.get(proposalId);
  }, [individualAnalyses]);

  const clearAnalyses = useCallback(() => {
    setIndividualAnalyses(new Map());
    setComparativeAnalysis(null);
  }, []);

  const loadSavedAnalyses = useCallback(async (quoteId: string) => {
    try {
      const { data, error } = await supabase
        .from('ai_proposal_analyses')
        .select('*')
        .eq('quote_id', quoteId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const individualMap = new Map<string, ProposalQualitativeAnalysis>();
        let comparativeData: ComparativeConsultantAnalysis | null = null;

        data.forEach(record => {
          if (record.analysis_type === 'individual' && record.proposal_id) {
            individualMap.set(record.proposal_id, record.analysis_data as unknown as ProposalQualitativeAnalysis);
          } else if (record.analysis_type === 'comparative') {
            comparativeData = record.analysis_data as unknown as ComparativeConsultantAnalysis;
          }
        });

        if (individualMap.size > 0 || comparativeData) {
          setIndividualAnalyses(individualMap);
          setComparativeAnalysis(comparativeData);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar análises salvas:', error);
    }
  }, [toast]);

  return {
    individualAnalyses,
    comparativeAnalysis,
    isAnalyzing,
    analysisProgress,
    analyzeProposal,
    analyzeAllProposals,
    getAnalysis,
    clearAnalyses,
    loadSavedAnalyses,
    hasAnalyses: individualAnalyses.size > 0
  };
}
