import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  FileText, 
  Calendar, 
  DollarSign, 
  User, 
  Building2,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Paperclip,
  ExternalLink,
  X
} from 'lucide-react';
import { useContractHistory } from '@/hooks/useContractHistory';
import { ContractHistoryTimeline } from '@/components/contracts/ContractHistoryTimeline';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ModuleGuard } from '@/components/common/ModuleGuard';
import { ContractStatusBadge } from '@/components/contracts/ContractStatusBadge';
import { ContractActionsMenu } from '@/components/contracts/ContractActionsMenu';
import { RenewContractModal, type RenewalData } from '@/components/contracts/RenewContractModal';
import { TerminateContractModal, type TerminationData } from '@/components/contracts/TerminateContractModal';
import { AddendumModal, type AddendumData } from '@/components/contracts/AddendumModal';
import { AdjustValueModal, type AdjustmentData } from '@/components/contracts/AdjustValueModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CONTRACT_TYPES } from '@/constants/contracts';
import type { Database } from '@/integrations/supabase/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type Contract = Database['public']['Tables']['contracts']['Row'];

const ContractDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [contract, setContract] = useState<Contract | null>(null);
  const [supplierName, setSupplierName] = useState<string>('');
  const [costCenterName, setCostCenterName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [viewingAttachment, setViewingAttachment] = useState<string | null>(null);
  const [attachmentBlobUrl, setAttachmentBlobUrl] = useState<string | null>(null);
  const [isAttachmentLoading, setIsAttachmentLoading] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { history, isLoading: isHistoryLoading, addHistoryEvent } = useContractHistory(id || '');
  
  // Modals state
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [terminateModalOpen, setTerminateModalOpen] = useState(false);
  const [addendumModalOpen, setAddendumModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);

  const fetchContract = async () => {
    if (!id) {
      navigate('/contracts');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          title: 'Contrato não encontrado',
          description: 'O contrato solicitado não existe',
          variant: 'destructive'
        });
        navigate('/contracts');
        return;
      }

      setContract(data);

      // Buscar nome do fornecedor
      if (data.supplier_id) {
        const { data: supplier } = await supabase
          .from('suppliers')
          .select('name')
          .eq('id', data.supplier_id)
          .single();
        
        if (supplier) setSupplierName(supplier.name);
      }

      // Buscar nome do centro de custo
      if (data.cost_center_id) {
        const { data: costCenter } = await supabase
          .from('cost_centers')
          .select('name, code')
          .eq('id', data.cost_center_id)
          .single();
        
        if (costCenter) setCostCenterName(`${costCenter.code} - ${costCenter.name}`);
      }
    } catch (error: any) {
      console.error('Error fetching contract:', error);
      toast({
        title: 'Erro ao carregar contrato',
        description: error.message,
        variant: 'destructive'
      });
      navigate('/contracts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadContract = async () => {
      await fetchContract();
    };

    loadContract();
  }, [id, navigate, toast]);

  // Carregar blob quando abrir um anexo (evita bloqueio de iframe por extensões)
  useEffect(() => {
    let toRevoke: string | null = null;

    const load = async () => {
      if (!viewingAttachment) return;
      setAttachmentError(null);
      setIsAttachmentLoading(true);
      setAttachmentBlobUrl(null);
      try {
        const res = await fetch(viewingAttachment, { mode: 'cors' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setAttachmentBlobUrl(url);
        toRevoke = url;
      } catch (e) {
        console.warn('📎 Falha ao carregar anexo para visualização inline (possível bloqueio por extensão):', e);
        setAttachmentError('blocked');
      } finally {
        setIsAttachmentLoading(false);
      }
    };

    load();

    return () => {
      if (toRevoke) URL.revokeObjectURL(toRevoke);
      setAttachmentBlobUrl(null);
    };
  }, [viewingAttachment]);


  // Action Handlers
  const handleRenew = async (data: RenewalData) => {
    try {
      const { error: updateError } = await supabase
        .from('contracts')
        .update({
          start_date: data.new_start_date,
          end_date: data.new_end_date,
          total_value: data.new_value,
          status: 'ativo',
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Add history event
      await addHistoryEvent({
        event_type: 'renovacao',
        event_date: new Date().toISOString().split('T')[0],
        description: `Contrato renovado. ${data.observations}`,
        old_value: contract?.total_value,
        new_value: data.new_value,
      });

      toast({
        title: 'Contrato renovado',
        description: 'O contrato foi renovado com sucesso',
      });

      fetchContract();
    } catch (error: any) {
      toast({
        title: 'Erro ao renovar contrato',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleTerminate = async (data: TerminationData) => {
    try {
      const { error: updateError } = await supabase
        .from('contracts')
        .update({
          status: data.final_status,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      await addHistoryEvent({
        event_type: data.final_status === 'cancelado' ? 'cancelamento' : 'expiracao',
        event_date: data.termination_date,
        description: `Contrato encerrado. Motivo: ${data.termination_reason}. ${data.observations}`,
      });

      toast({
        title: 'Contrato encerrado',
        description: 'O contrato foi encerrado com sucesso',
      });

      navigate('/contracts');
    } catch (error: any) {
      toast({
        title: 'Erro ao encerrar contrato',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleAddendum = async (data: AddendumData) => {
    try {
      const updateData: any = {};
      if (data.addendum_type === 'valor' && data.new_value) {
        updateData.total_value = data.new_value;
      }

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('contracts')
          .update(updateData)
          .eq('id', id);

        if (updateError) throw updateError;
      }

      await addHistoryEvent({
        event_type: 'aditivo',
        event_date: data.effective_date,
        description: `Aditivo criado (${data.addendum_type}): ${data.description}`,
        old_value: contract?.total_value,
        new_value: data.new_value,
      });

      toast({
        title: 'Aditivo criado',
        description: 'O aditivo contratual foi registrado com sucesso',
      });

      fetchContract();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar aditivo',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleAdjust = async (data: AdjustmentData) => {
    try {
      // Update contract value
      const { error: updateError } = await supabase
        .from('contracts')
        .update({
          total_value: data.new_value,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Create adjustment record
      const { error: adjustError } = await supabase
        .from('contract_adjustments')
        .insert({
          contract_id: id,
          adjustment_date: data.adjustment_date,
          index_type: data.index_type,
          percentage: data.percentage,
          previous_value: data.previous_value,
          new_value: data.new_value,
          justification: data.justification,
          status: 'aplicado',
        });

      if (adjustError) throw adjustError;

      await addHistoryEvent({
        event_type: 'reajuste',
        event_date: data.adjustment_date,
        description: `Reajuste aplicado (${data.index_type}): ${data.justification}`,
        old_value: data.previous_value,
        new_value: data.new_value,
      });

      toast({
        title: 'Reajuste aplicado',
        description: 'O reajuste de valor foi aplicado com sucesso',
      });

      fetchContract();
    } catch (error: any) {
      toast({
        title: 'Erro ao aplicar reajuste',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSuspend = async () => {
    try {
      const { error } = await supabase
        .from('contracts')
        .update({ status: 'suspenso' })
        .eq('id', id);

      if (error) throw error;

      await addHistoryEvent({
        event_type: 'suspensao',
        event_date: new Date().toISOString().split('T')[0],
        description: 'Contrato suspenso',
      });

      toast({
        title: 'Contrato suspenso',
        description: 'O contrato foi suspenso com sucesso',
      });

      fetchContract();
    } catch (error: any) {
      toast({
        title: 'Erro ao suspender contrato',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleReactivate = async () => {
    try {
      const { error } = await supabase
        .from('contracts')
        .update({ status: 'ativo' })
        .eq('id', id);

      if (error) throw error;

      await addHistoryEvent({
        event_type: 'reativacao',
        event_date: new Date().toISOString().split('T')[0],
        description: 'Contrato reativado',
      });

      toast({
        title: 'Contrato reativado',
        description: 'O contrato foi reativado com sucesso',
      });

      fetchContract();
    } catch (error: any) {
      toast({
        title: 'Erro ao reativar contrato',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDuplicate = async () => {
    toast({
      title: 'Funcionalidade em desenvolvimento',
      description: 'A duplicação de contratos estará disponível em breve',
    });
  };

  const handleExportPDF = () => {
    if (!contract) return;

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Relatório de Contrato', 14, 20);
    
    doc.setFontSize(12);
    doc.text(`Número: ${contract.contract_number}`, 14, 35);
    doc.text(`Título: ${contract.title}`, 14, 42);
    doc.text(`Status: ${contract.status}`, 14, 49);
    doc.text(`Tipo: ${contract.contract_type}`, 14, 56);
    
    doc.text(`Início: ${format(new Date(contract.start_date), 'dd/MM/yyyy')}`, 14, 70);
    doc.text(`Término: ${format(new Date(contract.end_date), 'dd/MM/yyyy')}`, 14, 77);
    doc.text(`Valor: R$ ${contract.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, 84);
    
    if (supplierName) {
      doc.text(`Fornecedor: ${supplierName}`, 14, 98);
    }

    if (history.length > 0) {
      autoTable(doc, {
        startY: 110,
        head: [['Data', 'Evento', 'Descrição']],
        body: history.map(h => [
          format(new Date(h.event_date), 'dd/MM/yyyy'),
          h.event_type,
          h.description || '-'
        ]),
      });
    }

    doc.save(`contrato-${contract.contract_number}.pdf`);

    toast({
      title: 'PDF exportado',
      description: 'O relatório do contrato foi gerado com sucesso',
    });
  };

  const handleDelete = async () => {
    if (!contract) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contract.id);

      if (error) throw error;

      toast({
        title: 'Contrato excluído',
        description: 'Contrato excluído com sucesso'
      });

      navigate('/contracts');
    } catch (error: any) {
      console.error('Error deleting contract:', error);
      toast({
        title: 'Erro ao excluir contrato',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Carregando contrato...</p>
      </div>
    );
  }

  if (!contract) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (!contract) {
    return null;
  }

  const daysUntilEnd = Math.ceil(
    (new Date(contract.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <ModuleGuard requiredModule="contracts" showUpgradePrompt>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/contracts')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{contract.title}</h1>
              <p className="text-muted-foreground">
                Contrato #{contract.contract_number}
              </p>
            </div>
          </div>
          <ContractActionsMenu
            contractStatus={contract.status}
            onRenew={() => setRenewModalOpen(true)}
            onAddendum={() => setAddendumModalOpen(true)}
            onAdjust={() => setAdjustModalOpen(true)}
            onSuspend={handleSuspend}
            onReactivate={handleReactivate}
            onTerminate={() => setTerminateModalOpen(true)}
            onDuplicate={handleDuplicate}
            onExportPDF={handleExportPDF}
            onEdit={() => navigate(`/contracts/edit/${id}`)}
            onDelete={() => setShowDeleteDialog(true)}
          />
        </div>

        {/* Status e Vigência */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Status e Vigência
              </CardTitle>
              <ContractStatusBadge status={contract.status as any} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Tipo de Contrato</p>
                <p className="font-medium">{CONTRACT_TYPES[contract.contract_type as keyof typeof CONTRACT_TYPES]}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Data de Início</p>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(contract.start_date), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Data de Término</p>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(contract.end_date), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              </div>
            </div>

            {daysUntilEnd > 0 && daysUntilEnd <= 60 && (
              <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  Faltam <strong>{daysUntilEnd} dias</strong> para o vencimento do contrato
                </p>
              </div>
            )}

            {daysUntilEnd < 0 && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-sm text-red-800 dark:text-red-200">
                  Contrato vencido há <strong>{Math.abs(daysUntilEnd)} dias</strong>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informações Financeiras */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Informações Financeiras
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Valor do Contrato</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(contract.total_value)}
                </p>
              </div>
              {costCenterName && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Centro de Custo</p>
                  <p className="font-medium">{costCenterName}</p>
                </div>
              )}
            </div>

            {contract.payment_terms && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Termos de Pagamento</p>
                <p className="text-sm bg-muted p-3 rounded-lg">{contract.payment_terms}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Partes Envolvidas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Partes Envolvidas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Fornecedor</p>
              <p className="font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                {supplierName || 'Não informado'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Descrição */}
        {contract.description && (
          <Card>
            <CardHeader>
              <CardTitle>Descrição do Contrato</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{contract.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Configurações de Renovação */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Configurações de Renovação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Aviso de Renovação</p>
                <p className="font-medium">{contract.alert_days_before || 30} dias antes do vencimento</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Renovação Automática</p>
                <div className="flex items-center gap-2">
                  {contract.auto_renewal ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-600">Ativada</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-gray-600" />
                      <span className="font-medium text-gray-600">Desativada</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Anexos */}
        {contract.attachments && Array.isArray(contract.attachments) && contract.attachments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                Anexos ({contract.attachments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {contract.attachments.map((url, index) => {
                  const fileName = (url as string).split('/').pop() || `Anexo ${index + 1}.pdf`;
                  return (
                    <button
                      key={index}
                      onClick={() => setViewingAttachment(url as string)}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors group w-full text-left"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {fileName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">Visualizar</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Histórico */}
        <ContractHistoryTimeline 
          history={history} 
          isLoading={isHistoryLoading}
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o contrato "{contract.title}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Attachment Viewer Dialog */}
      <Dialog open={!!viewingAttachment} onOpenChange={() => setViewingAttachment(null)}>
        <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center justify-between">
              <span>Visualizar Anexo</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewingAttachment(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 h-[calc(95vh-4rem)] p-4">
            {isAttachmentLoading && (
              <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Carregando anexo...
              </div>
            )}

            {!isAttachmentLoading && viewingAttachment && attachmentBlobUrl && (
              <iframe
                src={attachmentBlobUrl}
                className="w-full h-full rounded border"
                title="Visualizador de Anexo"
              />
            )}

            {!isAttachmentLoading && viewingAttachment && !attachmentBlobUrl && (
              <div className="h-full w-full flex flex-col items-center justify-center text-center space-y-3">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <p className="text-sm text-muted-foreground">
                  Não foi possível exibir o anexo nesta tela (possível bloqueio do navegador/extensão).
                </p>
                <div className="flex gap-2">
                  <a href={viewingAttachment} target="_blank" rel="noopener noreferrer">
                    <Button>
                      Abrir em nova aba
                    </Button>
                  </a>
                  <Button variant="outline" onClick={() => setViewingAttachment(null)}>Fechar</Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Action Modals */}
      {contract && (
        <>
          <RenewContractModal
            open={renewModalOpen}
            onClose={() => setRenewModalOpen(false)}
            onConfirm={handleRenew}
            currentContract={{
              id: contract.id,
              contract_number: contract.contract_number,
              total_value: contract.total_value,
              start_date: contract.start_date,
              end_date: contract.end_date,
            }}
          />
          <TerminateContractModal
            open={terminateModalOpen}
            onClose={() => setTerminateModalOpen(false)}
            onConfirm={handleTerminate}
            contractNumber={contract.contract_number}
          />
          <AddendumModal
            open={addendumModalOpen}
            onClose={() => setAddendumModalOpen(false)}
            onConfirm={handleAddendum}
            contractNumber={contract.contract_number}
          />
          <AdjustValueModal
            open={adjustModalOpen}
            onClose={() => setAdjustModalOpen(false)}
            onConfirm={handleAdjust}
            contractNumber={contract.contract_number}
            currentValue={contract.total_value}
          />
        </>
      )}
    </ModuleGuard>
  );
};

export default ContractDetails;
