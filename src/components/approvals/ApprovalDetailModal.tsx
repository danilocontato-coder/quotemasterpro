import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ExternalLink, FileText, User, Calendar } from "lucide-react";
import { useSupabaseApprovals, type Approval } from "@/hooks/useSupabaseApprovals";
import { useSupabaseQuotes } from "@/hooks/useSupabaseQuotes";
import { useToast } from "@/hooks/use-toast";
import { QuoteItemsPreview } from "./QuoteItemsPreview";
import { useCurrency } from "@/hooks/useCurrency";
import { supabase } from "@/integrations/supabase/client";

interface ApprovalDetailModalProps {
  open: boolean;
  onClose: () => void;
  approval: Approval;
}

export function ApprovalDetailModal({ open, onClose, approval }: ApprovalDetailModalProps) {
  const { approveRequest, rejectRequest } = useSupabaseApprovals();
  const { formatCurrency } = useCurrency();
  const { toast } = useToast();
  const { quotes } = useSupabaseQuotes();
  const [quoteData, setQuoteData] = useState<any>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [approverName, setApproverName] = useState<string>("");

  // Fetch approver name
  useEffect(() => {
    const fetchApproverName = async () => {
      if (approval?.approver_id) {
        try {
          const { data: user } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', approval.approver_id)
            .maybeSingle();
          
          if (user) {
            setApproverName(user.name);
          }
        } catch (error) {
          console.error('Error fetching approver name:', error);
        }
      }
    };

    if (approval?.approver_id) {
      fetchApproverName();
    }
  }, [approval?.approver_id]);

// Buscar dados da cotação quando o modal abrir
useEffect(() => {
  if (open && approval?.quote_id) {
    setIsLoadingQuote(true);
    const quote = quotes.find(q => q.id === approval.quote_id);
    setQuoteData(quote);
    setIsLoadingQuote(false);
  }
}, [open, approval?.quote_id, quotes]);

  const handleApprove = async () => {
    const success = await approveRequest(approval.id, "Aprovado via interface");
    if (success) {
      onClose();
    }
  };

  const handleReject = async () => {
    if (!rejectComment.trim()) {
      toast({
        title: "Comentário obrigatório",
        description: "Por favor, informe o motivo da rejeição.",
        variant: "destructive"
      });
      return;
    }

    const success = await rejectRequest(approval.id, rejectComment);
    if (success) {
      setRejectComment("");
      setShowRejectForm(false);
      onClose();
    }
  };

  const handleViewFullQuote = () => {
    // Navegar para a página da cotação completa
    window.open(`/quotes?id=${approval.quote_id}`, '_blank');
  };

const getStatusBadgeColor = (status: string) => {
  const colors = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800"
  };
  return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
};

  if (!approval) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detalhes da Aprovação
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações da Aprovação */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Informações da Aprovação</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Status:</span>
                  <Badge className={getStatusBadgeColor(approval.status)}>
                    {approval.status === 'pending' ? 'Pendente' : 
                     approval.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Criado em: {new Date(approval.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
                {approval.approved_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Aprovado em: {new Date(approval.approved_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
                {approverName && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Aprovador: {approverName}</span>
                  </div>
                )}
                {approval.comments && (
                  <div>
                    <span className="text-sm font-medium">Comentários:</span>
                    <p className="text-sm text-muted-foreground mt-1">{approval.comments}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Informações da Cotação</h3>
              {isLoadingQuote ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : quoteData ? (
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium">Título:</span>
                    <p className="text-sm">{quoteData.title}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Descrição:</span>
                    <p className="text-sm text-muted-foreground">{quoteData.description || 'Sem descrição'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Cliente:</span>
                    <p className="text-sm">{quoteData.client_name}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Fornecedor:</span>
                    <p className="text-sm">{quoteData.supplier_name || 'Não informado'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Valor Total:</span>
                    <p className="text-lg font-semibold text-primary">{formatCurrency(quoteData.total)}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Status da Cotação:</span>
                    <Badge variant="outline" className="ml-2">{quoteData.status}</Badge>
                  </div>
                  {quoteData.deadline && (
                    <div>
                      <span className="text-sm font-medium">Prazo:</span>
                      <p className="text-sm">{new Date(quoteData.deadline).toLocaleDateString('pt-BR')}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Cotação #{approval.quotes?.local_code || approval.quote_id} não encontrada ou ainda não carregada
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Itens da Cotação */}
          {quoteData && (
            <QuoteItemsPreview quoteId={approval.quote_id} />
          )}

          <Separator />

          {/* Ações */}
          <div className="flex justify-between items-center">
            <Button 
              variant="outline" 
              onClick={handleViewFullQuote}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Ver Cotação Completa
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Fechar</Button>
              {approval.status === "pending" && (
                <>
                  {!showRejectForm ? (
                    <>
                      <Button 
                        variant="destructive" 
                        onClick={() => setShowRejectForm(true)}
                      >
                        Rejeitar
                      </Button>
                      <Button onClick={handleApprove}>
                        Aprovar
                      </Button>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2 w-full max-w-md">
                      <Label htmlFor="reject-comment">Motivo da rejeição:</Label>
                      <Textarea
                        id="reject-comment"
                        placeholder="Informe o motivo da rejeição..."
                        value={rejectComment}
                        onChange={(e) => setRejectComment(e.target.value)}
                        className="min-h-20"
                      />
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setShowRejectForm(false);
                            setRejectComment("");
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button variant="destructive" onClick={handleReject}>
                          Confirmar Rejeição
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}