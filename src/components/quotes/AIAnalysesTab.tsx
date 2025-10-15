import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  BarChart3, 
  FileText, 
  Clock, 
  Eye, 
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';

const formatLocalDateTime = (dateStr: string) => {
  return format(new Date(dateStr), 'dd/MM/yyyy HH:mm');
};
import { ConsultantAnalysisModal } from './ConsultantAnalysisModal';
import type { ComparativeConsultantAnalysis, ProposalQualitativeAnalysis } from '@/services/ProposalConsultantService';

interface AIAnalysesTabProps {
  quoteId: string;
  onReanalyze?: () => void;
}

interface AnalysisRecord {
  id: string;
  quote_id: string;
  client_id: string;
  analysis_type: 'individual' | 'comparative';
  proposal_id: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  analysis_data: any;
  created_by: string | null;
  created_at: string;
}

export function AIAnalysesTab({ quoteId, onReanalyze }: AIAnalysesTabProps) {
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAnalysis, setSelectedAnalysis] = useState<{
    type: 'individual' | 'comparative';
    data: any;
    proposals?: any[];
  } | null>(null);

  useEffect(() => {
    loadAnalyses();
    
    // Realtime para atualizar automaticamente
    const channel = supabase
      .channel(`ai_analyses_${quoteId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ai_proposal_analyses',
        filter: `quote_id=eq.${quoteId}`
      }, () => {
        loadAnalyses();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [quoteId]);

  const loadAnalyses = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('ai_proposal_analyses')
        .select('*')
        .eq('quote_id', quoteId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setAnalyses((data || []) as AnalysisRecord[]);
    } catch (error) {
      console.error('Erro ao carregar análises:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const comparativeAnalyses = analyses.filter(a => a.analysis_type === 'comparative');
  const individualAnalyses = analyses.filter(a => a.analysis_type === 'individual');

  const isRecent = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    return diff < 24 * 60 * 60 * 1000; // menos de 24h
  };

  const handleViewComparative = (analysis: AnalysisRecord) => {
    // Buscar todas as análises individuais relacionadas
    const relatedIndividuals = individualAnalyses
      .filter(ind => {
        const indTime = new Date(ind.created_at).getTime();
        const compTime = new Date(analysis.created_at).getTime();
        return Math.abs(indTime - compTime) < 5 * 60 * 1000; // 5 minutos de diferença
      });

    const individualMap = new Map<string, ProposalQualitativeAnalysis>();
    relatedIndividuals.forEach(ind => {
      if (ind.proposal_id) {
        individualMap.set(ind.proposal_id, ind.analysis_data);
      }
    });

    setSelectedAnalysis({
      type: 'comparative',
      data: analysis.analysis_data,
      proposals: relatedIndividuals.map(ind => ({
        id: ind.proposal_id,
        supplierName: ind.supplier_name
      }))
    });
  };

  const handleViewIndividual = (analysis: AnalysisRecord) => {
    const individualMap = new Map<string, ProposalQualitativeAnalysis>();
    if (analysis.proposal_id) {
      individualMap.set(analysis.proposal_id, analysis.analysis_data);
    }

    setSelectedAnalysis({
      type: 'individual',
      data: individualMap
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-12 pb-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma Análise Encontrada</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Execute o Consultor IA para começar a analisar propostas.
          </p>
          {onReanalyze && (
            <Button onClick={onReanalyze}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Executar Análise
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Análises Comparativas */}
      {comparativeAnalyses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Análises Comparativas
              <Badge variant="secondary">{comparativeAnalyses.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {comparativeAnalyses.map((analysis) => {
              const data = analysis.analysis_data as ComparativeConsultantAnalysis;
              return (
                <div
                  key={analysis.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Comparação de Propostas</span>
                      {isRecent(analysis.created_at) && (
                        <Badge variant="default" className="text-xs">Nova</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {data.executiveSummary.substring(0, 150)}...
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatLocalDateTime(analysis.created_at)}
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Melhor: {data.bestOverall?.supplierId || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewComparative(analysis)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Análise
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Análises Individuais */}
      {individualAnalyses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Análises Individuais por Fornecedor
              <Badge variant="secondary">{individualAnalyses.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {individualAnalyses.map((analysis) => {
                const data = analysis.analysis_data as ProposalQualitativeAnalysis;
                return (
                  <div
                    key={analysis.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                        {data.overallScore}
                      </div>
                      <div>
                        <div className="font-medium">{analysis.supplier_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatLocalDateTime(analysis.created_at)}
                        </div>
                      </div>
                      {isRecent(analysis.created_at) && (
                        <Badge variant="default" className="text-xs ml-auto">Nova</Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleViewIndividual(analysis)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ações */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={loadAnalyses}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
        {onReanalyze && (
          <Button onClick={onReanalyze}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Nova Análise
          </Button>
        )}
      </div>

      {/* Modal de Visualização */}
      {selectedAnalysis && selectedAnalysis.type === 'comparative' && (
        <ConsultantAnalysisModal
          open={!!selectedAnalysis}
          onClose={() => setSelectedAnalysis(null)}
          comparativeAnalysis={selectedAnalysis.data}
          individualAnalyses={new Map()} // Poderia ser populado se necessário
          proposals={selectedAnalysis.proposals || []}
        />
      )}
    </div>
  );
}
