import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CONTRACT_TYPES } from '@/constants/contracts';
import type { Database } from '@/integrations/supabase/types';

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
  const { history, isLoading: isHistoryLoading } = useContractHistory(id || '');

  useEffect(() => {
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

    fetchContract();
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
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate(`/contracts/${contract.id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          </div>
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
    </ModuleGuard>
  );
};

export default ContractDetails;
