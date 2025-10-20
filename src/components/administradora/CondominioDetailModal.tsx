import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { useCondominioDetail } from '@/hooks/useCondominioDetail';
import { CondominioEditForm } from './CondominioEditForm';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2,
  FileText,
  Users,
  History,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatQuoteCode } from '@/utils/formatQuoteCode';

interface CondominioDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  condominioId: string | null;
  onUpdate?: () => void;
}

export function CondominioDetailModal({
  open,
  onOpenChange,
  condominioId,
  onUpdate,
}: CondominioDetailModalProps) {
  const { data, isLoading, refetch } = useCondominioDetail(condominioId);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('info');
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteType, setDeleteType] = useState<'soft' | 'hard'>('soft');

  const handleEditSuccess = () => {
    setIsEditing(false);
    refetch();
    onUpdate?.();
  };

  const handleDelete = async () => {
    if (!condominioId || !data) return;

    try {
      if (deleteType === 'soft') {
        // Soft delete: marcar como inativo
        const { error } = await supabase
          .from('clients')
          .update({ status: 'inactive' })
          .eq('id', condominioId);

        if (error) throw error;

        // Desativar usuários
        await supabase
          .from('profiles')
          .update({ active: false })
          .eq('client_id', condominioId);

        toast({
          title: 'Condomínio desativado',
          description: 'O condomínio e seus usuários foram desativados.',
        });
      } else {
        // Hard delete: deletar permanentemente (apenas se não houver cotações)
        const { error } = await supabase
          .from('clients')
          .delete()
          .eq('id', condominioId);

        if (error) throw error;

        toast({
          title: 'Condomínio excluído',
          description: 'O condomínio foi removido permanentemente.',
        });
      }

      onOpenChange(false);
      onUpdate?.();
    } catch (error: any) {
      console.error('Error deleting condominio:', error);
      toast({
        title: 'Erro ao excluir',
        description: error.message || 'Não foi possível excluir o condomínio.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    return status === 'active' ? (
      <Badge variant="default" className="bg-green-100 text-green-800">Ativo</Badge>
    ) : (
      <Badge variant="secondary">Inativo</Badge>
    );
  };

  const getQuoteStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      draft: { variant: 'secondary', label: 'Rascunho' },
      sent: { variant: 'default', label: 'Enviada' },
      receiving: { variant: 'default', label: 'Recebendo' },
      under_review: { variant: 'default', label: 'Em Análise' },
      approved: { variant: 'default', label: 'Aprovada' },
      rejected: { variant: 'destructive', label: 'Rejeitada' },
      paid: { variant: 'default', label: 'Paga' },
      cancelled: { variant: 'secondary', label: 'Cancelada' },
    };

    const config = variants[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </DialogHeader>
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!data || !data.condominio) {
    return null;
  }

  const { condominio, quotes, users, auditLogs, metrics } = data;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-2xl flex items-center gap-2">
                  <Building2 className="h-6 w-6" />
                  {condominio.name}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  CNPJ: {condominio.cnpj}
                </DialogDescription>
              </div>
              {getStatusBadge(condominio.status)}
            </div>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="info">
                <Building2 className="h-4 w-4 mr-2" />
                Informações
              </TabsTrigger>
              <TabsTrigger value="quotes">
                <FileText className="h-4 w-4 mr-2" />
                Cotações ({metrics.totalQuotes})
              </TabsTrigger>
              <TabsTrigger value="users">
                <Users className="h-4 w-4 mr-2" />
                Usuários ({users.length})
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-2" />
                Histórico
              </TabsTrigger>
            </TabsList>

            {/* Aba Informações */}
            <TabsContent value="info" className="space-y-4">
              {isEditing ? (
                <CondominioEditForm
                  condominioId={condominio.id}
                  initialData={{
                    name: condominio.name,
                    cnpj: condominio.cnpj,
                    email: condominio.email || '',
                    phone: condominio.phone || '',
                    address: condominio.address || '',
                    status: condominio.status as 'active' | 'inactive',
                  }}
                  onSuccess={handleEditSuccess}
                  onCancel={() => setIsEditing(false)}
                />
              ) : (
                <>
                  {/* Métricas */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Total de Cotações
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{metrics.totalQuotes}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Cotações Ativas
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{metrics.activeQuotes}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Gasto Total
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          R$ {metrics.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Usuários Ativos
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{metrics.activeUsers}</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Informações de Contato */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Informações de Contato</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {condominio.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{condominio.email}</span>
                        </div>
                      )}
                      {condominio.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{condominio.phone}</span>
                        </div>
                      )}
                      {condominio.address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{condominio.address}</span>
                        </div>
                      )}
                      {condominio.created_at && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            Cadastrado em {format(new Date(condominio.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Ações */}
                  <div className="flex justify-between pt-4 border-t">
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setDeleteType(metrics.totalQuotes > 0 ? 'soft' : 'soft');
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {metrics.totalQuotes > 0 ? 'Desativar' : 'Excluir'} Condomínio
                    </Button>
                    <Button onClick={() => setIsEditing(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar Informações
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Aba Cotações */}
            <TabsContent value="quotes" className="space-y-4">
              {quotes.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhuma cotação encontrada</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {quotes.map((quote) => (
                    <Card key={quote.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{quote.title}</p>
                              {getQuoteStatusBadge(quote.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {formatQuoteCode(quote)} • {format(new Date(quote.created_at!), 'dd/MM/yyyy HH:mm')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">
                              R$ {Number(quote.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {quote.items_count || 0} itens
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Aba Usuários */}
            <TabsContent value="users" className="space-y-4">
              {users.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhum usuário vinculado</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {users.map((user) => (
                    <Card key={user.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{user.name || 'Sem nome'}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={user.active ? 'default' : 'secondary'}>
                              {user.active ? 'Ativo' : 'Inativo'}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">{user.role}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Aba Histórico */}
            <TabsContent value="history" className="space-y-4">
              {auditLogs.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <History className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhuma atividade registrada</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <Card key={log.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{log.action}</p>
                            <p className="text-xs text-muted-foreground">
                              {log.entity_type} • {format(new Date(log.created_at!), 'dd/MM/yyyy HH:mm')}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteType === 'soft' ? 'Desativar Condomínio?' : 'Excluir Permanentemente?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {metrics.totalQuotes > 0 ? (
                <>
                  Este condomínio possui <strong>{metrics.totalQuotes} cotações</strong>.
                  {deleteType === 'soft' ? (
                    <>
                      <br /><br />
                      Ao desativar:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>O condomínio ficará inativo</li>
                        <li>Usuários não poderão acessar o sistema</li>
                        <li>As cotações serão preservadas</li>
                        <li>Pode ser reativado posteriormente</li>
                      </ul>
                    </>
                  ) : (
                    <>
                      <br /><br />
                      <strong className="text-destructive">
                        Não é possível excluir permanentemente um condomínio com cotações.
                      </strong>
                      <br />
                      Você pode apenas desativá-lo.
                    </>
                  )}
                </>
              ) : (
                <>
                  Esta ação não pode ser desfeita. O condomínio e todos os dados associados serão removidos permanentemente.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {(metrics.totalQuotes === 0 || deleteType === 'soft') && (
              <AlertDialogAction
                onClick={handleDelete}
                className={deleteType === 'hard' ? 'bg-destructive hover:bg-destructive/90' : ''}
              >
                {deleteType === 'soft' ? 'Desativar' : 'Excluir Permanentemente'}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
