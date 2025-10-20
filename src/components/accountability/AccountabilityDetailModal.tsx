import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAccountability } from '@/hooks/useAccountability';
import { useAccountabilityAttachments } from '@/hooks/useAccountabilityAttachments';
import { DocumentUploadZone } from './DocumentUploadZone';
import { ApprovalModal } from './ApprovalModal';
import { CheckCircle, XCircle, Download, Trash2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AccountabilityDetailModalProps {
  recordId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusLabels = {
  draft: 'Rascunho',
  submitted: 'Enviado',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
};

const recordTypeLabels = {
  purchase: 'Compra',
  service: 'Serviço',
  maintenance: 'Manutenção',
  other: 'Outro',
};

export function AccountabilityDetailModal({
  recordId,
  open,
  onOpenChange,
}: AccountabilityDetailModalProps) {
  const { records } = useAccountability();
  const { attachments, deleteAttachment, downloadAttachment } = useAccountabilityAttachments(recordId);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');

  const record = records.find(r => r.id === recordId);

  if (!record) {
    return null;
  }

  const canApprove = record.status === 'submitted';

  const handleApprove = () => {
    setApprovalAction('approve');
    setShowApprovalModal(true);
  };

  const handleReject = () => {
    setApprovalAction('reject');
    setShowApprovalModal(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Prestação de Contas</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="documents">
                Documentos ({attachments.length})
              </TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Dados da Prestação</CardTitle>
                    <Badge variant={
                      record.status === 'approved' ? 'approved' :
                      record.status === 'rejected' ? 'destructive' :
                      'default'
                    }>
                      {statusLabels[record.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Data
                      </label>
                      <p className="text-base">
                        {format(new Date(record.accountability_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Tipo
                      </label>
                      <p className="text-base">
                        {recordTypeLabels[record.record_type]}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Condomínio
                      </label>
                      <p className="text-base">
                        {record.clients?.name || '-'}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Valor Gasto
                      </label>
                      <p className="text-base font-semibold">
                        R$ {Number(record.amount_spent).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    {record.cost_centers && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Centro de Custo
                        </label>
                        <p className="text-base">
                          {record.cost_centers.code} - {record.cost_centers.name}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Destino/Finalidade
                    </label>
                    <p className="text-base mt-1">
                      {record.destination}
                    </p>
                  </div>

                  {record.approval_notes && (
                    <div className="border-t pt-4">
                      <label className="text-sm font-medium text-muted-foreground">
                        Observações da Aprovação/Rejeição
                      </label>
                      <p className="text-base mt-1">
                        {record.approval_notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {canApprove && (
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Rejeitar
                  </Button>
                  <Button
                    variant="default"
                    onClick={handleApprove}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aprovar
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              <DocumentUploadZone recordId={recordId} />

              <Card>
                <CardHeader>
                  <CardTitle>Documentos Anexados</CardTitle>
                </CardHeader>
                <CardContent>
                  {attachments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="mx-auto h-12 w-12 mb-2" />
                      <p>Nenhum documento anexado ainda.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{attachment.file_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {attachment.document_type.toUpperCase()} • 
                                {attachment.file_size ? ` ${(attachment.file_size / 1024).toFixed(1)} KB` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => downloadAttachment(attachment)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteAttachment(attachment.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Alterações</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-2" />
                      <div>
                        <p className="font-medium">Prestação criada</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(record.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>

                    {record.approved_at && (
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-2" />
                        <div>
                          <p className="font-medium">
                            {record.status === 'approved' ? 'Aprovada' : 'Rejeitada'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(record.approved_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {showApprovalModal && (
        <ApprovalModal
          open={showApprovalModal}
          onOpenChange={setShowApprovalModal}
          recordId={recordId}
          action={approvalAction}
        />
      )}
    </>
  );
}
