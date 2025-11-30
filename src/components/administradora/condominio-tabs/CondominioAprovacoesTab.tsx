import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatQuoteCode } from '@/utils/formatQuoteCode';

interface Approval {
  id: string;
  quote_id: string;
  status: string;
  comments: string | null;
  created_at: string;
  approved_at: string | null;
  quote: {
    id: string;
    local_code: string | null;
    title: string;
    total: number;
    status: string;
    items_count: number;
  };
}

interface CondominioAprovacoesTabProps {
  condominioId: string;
  onRefresh: () => void;
}

export function CondominioAprovacoesTab({ condominioId, onRefresh }: CondominioAprovacoesTabProps) {
  const { toast } = useToast();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [decisionType, setDecisionType] = useState<'approve' | 'reject' | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchApprovals();
  }, [condominioId]);

  const fetchApprovals = async () => {
    try {
      setIsLoading(true);

      // Get quotes that need approval for this condominio
      const { data: quotes, error } = await supabase
        .from('quotes')
        .select(`
          id,
          local_code,
          title,
          total,
          status,
          items_count,
          approvals (
            id,
            status,
            comments,
            created_at,
            approved_at
          )
        `)
        .or(`client_id.eq.${condominioId},on_behalf_of_client_id.eq.${condominioId}`)
        .in('status', ['under_review', 'approved', 'rejected'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform to approvals list
      const approvalsList: Approval[] = [];
      quotes?.forEach(quote => {
        const quoteApprovals = quote.approvals as any[];
        if (quoteApprovals && quoteApprovals.length > 0) {
          quoteApprovals.forEach(approval => {
            approvalsList.push({
              ...approval,
              quote_id: quote.id,
              quote: {
                id: quote.id,
                local_code: quote.local_code,
                title: quote.title,
                total: quote.total,
                status: quote.status,
                items_count: quote.items_count,
              },
            });
          });
        } else if (quote.status === 'under_review') {
          // Create a virtual approval for quotes awaiting approval
          approvalsList.push({
            id: `pending-${quote.id}`,
            quote_id: quote.id,
            status: 'pending',
            comments: null,
            created_at: new Date().toISOString(),
            approved_at: null,
            quote: {
              id: quote.id,
              local_code: quote.local_code,
              title: quote.title,
              total: quote.total,
              status: quote.status,
              items_count: quote.items_count,
            },
          });
        }
      });

      setApprovals(approvalsList);
    } catch (error) {
      console.error('Error fetching approvals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecision = async () => {
    if (!selectedApproval || !decisionType) return;

    try {
      setIsSubmitting(true);

      const newStatus = decisionType === 'approve' ? 'approved' : 'rejected';

      // Update or create approval record
      if (selectedApproval.id.startsWith('pending-')) {
        // Create new approval
        const { error: approvalError } = await supabase
          .from('approvals')
          .insert({
            quote_id: selectedApproval.quote_id,
            status: newStatus,
            comments: comment || null,
            approved_at: new Date().toISOString(),
          });

        if (approvalError) throw approvalError;
      } else {
        // Update existing approval
        const { error: approvalError } = await supabase
          .from('approvals')
          .update({
            status: newStatus,
            comments: comment || null,
            approved_at: new Date().toISOString(),
          })
          .eq('id', selectedApproval.id);

        if (approvalError) throw approvalError;
      }

      // Update quote status
      const { error: quoteError } = await supabase
        .from('quotes')
        .update({ status: newStatus })
        .eq('id', selectedApproval.quote_id);

      if (quoteError) throw quoteError;

      toast({
        title: decisionType === 'approve' ? 'Cotação Aprovada' : 'Cotação Rejeitada',
        description: `A cotação foi ${decisionType === 'approve' ? 'aprovada' : 'rejeitada'} com sucesso.`,
      });

      setSelectedApproval(null);
      setDecisionType(null);
      setComment('');
      fetchApprovals();
      onRefresh();
    } catch (error: any) {
      console.error('Error processing decision:', error);
      toast({
        title: 'Erro ao processar decisão',
        description: error.message || 'Não foi possível processar a decisão.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingApprovals = approvals.filter(a => a.status === 'pending');
  const decidedApprovals = approvals.filter(a => a.status !== 'pending');

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Approvals Alert */}
      {pendingApprovals.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-amber-800 dark:text-amber-200">
                Aprovações Pendentes
              </CardTitle>
            </div>
            <CardDescription className="text-amber-700 dark:text-amber-300">
              {pendingApprovals.length} cotação(ões) aguardando sua decisão
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Pending Approvals */}
      {pendingApprovals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Aguardando Aprovação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingApprovals.map((approval) => (
              <div
                key={approval.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{approval.quote.title}</span>
                    <Badge variant="outline" className="text-amber-600">
                      Pendente
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatQuoteCode(approval.quote)} • {approval.quote.items_count} itens
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right mr-4">
                    <p className="font-bold text-lg">
                      R$ {Number(approval.quote.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      setSelectedApproval(approval);
                      setDecisionType('reject');
                    }}
                  >
                    <ThumbsDown className="h-4 w-4 mr-1" />
                    Rejeitar
                  </Button>
                  
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      setSelectedApproval(approval);
                      setDecisionType('approve');
                    }}
                  >
                    <ThumbsUp className="h-4 w-4 mr-1" />
                    Aprovar
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Approval History */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Aprovações</CardTitle>
          <CardDescription>Decisões anteriores sobre cotações</CardDescription>
        </CardHeader>
        <CardContent>
          {decidedApprovals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">Nenhuma aprovação registrada</h3>
              <p className="text-muted-foreground text-sm">
                O histórico de aprovações aparecerá aqui
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {decidedApprovals.map((approval) => (
                <div
                  key={approval.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {approval.status === 'approved' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="font-medium">{approval.quote.title}</span>
                      <Badge 
                        variant={approval.status === 'approved' ? 'default' : 'destructive'}
                        className={approval.status === 'approved' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {approval.status === 'approved' ? 'Aprovada' : 'Rejeitada'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatQuoteCode(approval.quote)} • 
                      {approval.approved_at && format(new Date(approval.approved_at), " dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                    {approval.comments && (
                      <p className="text-sm italic text-muted-foreground flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        "{approval.comments}"
                      </p>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <p className="font-bold">
                      R$ {Number(approval.quote.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Decision Dialog */}
      <Dialog 
        open={!!selectedApproval && !!decisionType} 
        onOpenChange={(open) => {
          if (!open) {
            setSelectedApproval(null);
            setDecisionType(null);
            setComment('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {decisionType === 'approve' ? (
                <>
                  <ThumbsUp className="h-5 w-5 text-green-600" />
                  Aprovar Cotação
                </>
              ) : (
                <>
                  <ThumbsDown className="h-5 w-5 text-red-600" />
                  Rejeitar Cotação
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedApproval && (
                <>
                  {selectedApproval.quote.title} - {formatQuoteCode(selectedApproval.quote)}
                  <br />
                  <span className="font-semibold">
                    Valor: R$ {Number(selectedApproval.quote.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Comentário {decisionType === 'reject' && '(obrigatório)'}
              </label>
              <Textarea
                placeholder={
                  decisionType === 'approve'
                    ? 'Adicione um comentário opcional...'
                    : 'Informe o motivo da rejeição...'
                }
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedApproval(null);
                setDecisionType(null);
                setComment('');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDecision}
              disabled={isSubmitting || (decisionType === 'reject' && !comment.trim())}
              className={
                decisionType === 'approve'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }
            >
              {isSubmitting ? 'Processando...' : decisionType === 'approve' ? 'Confirmar Aprovação' : 'Confirmar Rejeição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
