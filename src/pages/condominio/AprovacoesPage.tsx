import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  Building2,
  Calendar,
  DollarSign,
  MessageSquare,
  Layers
} from 'lucide-react';
import { useCondominioApprovals } from '@/hooks/useCondominioApprovals';
import { useCondominioApprovalLevels } from '@/hooks/useCondominioApprovalLevels';
import { useAuth } from '@/contexts/AuthContext';
import { ApprovalLevelBadge } from '@/components/approvals/ApprovalLevelBadge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AprovacoesPage() {
  const { user } = useAuth();
  const { approvals, isLoading, approveQuote, rejectQuote } = useCondominioApprovals();
  const { approvalLevels, getApprovalLevelForAmount, getUserNameById } = useCondominioApprovalLevels({ 
    condominioId: user?.clientId || null 
  });
  const [selectedApproval, setSelectedApproval] = useState<string | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [approvalComments, setApprovalComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const handleApprove = async () => {
    if (!selectedApproval) return;

    setActionLoading(true);
    try {
      await approveQuote(selectedApproval, approvalComments);
      setShowApproveDialog(false);
      setApprovalComments('');
      setSelectedApproval(null);
    } catch (error) {
      console.error('Erro ao aprovar:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApproval || !rejectionReason.trim()) return;

    setActionLoading(true);
    try {
      await rejectQuote(selectedApproval, rejectionReason);
      setShowRejectDialog(false);
      setRejectionReason('');
      setSelectedApproval(null);
    } catch (error) {
      console.error('Erro ao rejeitar:', error);
    } finally {
      setActionLoading(false);
    }
  };

  // Get approval level info for a quote
  const getApprovalLevelInfo = (total: number) => {
    const level = getApprovalLevelForAmount(total);
    if (!level) return null;
    
    const approverNames = level.approvers?.map(id => getUserNameById(id)) || [];
    return {
      ...level,
      approverNames
    };
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-muted-foreground">Carregando aprovações...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Aprovações de Cotações</h1>
        <p className="text-muted-foreground mt-1">
          Revise e aprove cotações criadas pela administradora
        </p>
      </div>

      {approvals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Tudo em dia!</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Não há cotações pendentes de aprovação no momento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {approvals.map((approval) => {
            const levelInfo = getApprovalLevelInfo(approval.quote.total);
            
            return (
              <Card key={approval.id} className="border-l-4 border-l-warning">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <CardTitle className="text-xl">{approval.quote.title}</CardTitle>
                      </div>
                      <CardDescription className="flex items-center gap-2 mt-2">
                        <Building2 className="h-4 w-4" />
                        Criado por: {approval.quote.client_name}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {levelInfo && (
                        <ApprovalLevelBadge
                          levelName={levelInfo.name}
                          levelOrder={levelInfo.order_level}
                          minAmount={levelInfo.amount_threshold}
                          maxAmount={levelInfo.max_amount_threshold}
                          approverNames={levelInfo.approverNames}
                          variant="secondary"
                        />
                      )}
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning">
                        <Clock className="h-3 w-3 mr-1" />
                        Pendente
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {approval.quote.description && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {approval.quote.description}
                      </p>
                    </div>
                  )}

                  {levelInfo && (
                    <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-2">
                      <Layers className="h-4 w-4 text-primary" />
                      <span className="text-sm">
                        Esta cotação requer aprovação do <strong>{levelInfo.name}</strong>
                        {levelInfo.approverNames.length > 0 && (
                          <> por: {levelInfo.approverNames.join(', ')}</>
                        )}
                      </span>
                    </div>
                  )}

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Valor Total</p>
                        <p className="font-semibold text-lg">
                          {formatCurrency(approval.quote.total)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Data de Solicitação</p>
                        <p className="font-medium">
                          {format(new Date(approval.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        setSelectedApproval(approval.id);
                        setShowRejectDialog(true);
                      }}
                    >
                      <XCircle className="h-4 w-4" />
                      Rejeitar
                    </Button>
                    <Button
                      className="gap-2 bg-success hover:bg-success/90"
                      onClick={() => {
                        setSelectedApproval(approval.id);
                        setShowApproveDialog(true);
                      }}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Aprovar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog de Aprovação */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Aprovar Cotação
            </DialogTitle>
            <DialogDescription>
              Confirme a aprovação desta cotação. Você pode adicionar comentários opcionais.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="approval-comments">
                <MessageSquare className="h-4 w-4 inline mr-1" />
                Comentários (opcional)
              </Label>
              <Textarea
                id="approval-comments"
                placeholder="Adicione observações sobre a aprovação..."
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
              disabled={actionLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleApprove}
              disabled={actionLoading}
              className="bg-success hover:bg-success/90"
            >
              {actionLoading ? 'Aprovando...' : 'Confirmar Aprovação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Rejeição */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Rejeitar Cotação
            </DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição. Esta informação será enviada ao solicitante.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">
                Motivo da Rejeição *
              </Label>
              <Textarea
                id="rejection-reason"
                placeholder="Explique o motivo da rejeição..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                required
              />
              <p className="text-xs text-muted-foreground">
                Este motivo será enviado à administradora
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={actionLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={actionLoading || !rejectionReason.trim()}
            >
              {actionLoading ? 'Rejeitando...' : 'Confirmar Rejeição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
