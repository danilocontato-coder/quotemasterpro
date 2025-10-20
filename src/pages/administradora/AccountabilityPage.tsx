import { useState } from 'react';
import { Plus, FileCheck, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAccountability } from '@/hooks/useAccountability';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { AccountabilityFormModal } from '@/components/accountability/AccountabilityFormModal';
import { AccountabilityDetailModal } from '@/components/accountability/AccountabilityDetailModal';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { usePagination } from '@/hooks/usePagination';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusLabels = {
  draft: 'Rascunho',
  submitted: 'Enviado',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
};

const statusVariants = {
  draft: 'secondary' as const,
  submitted: 'default' as const,
  approved: 'approved' as const,
  rejected: 'destructive' as const,
};

export default function AccountabilityPage() {
  const { hasAccess, isLoading: moduleLoading } = useModuleAccess('accountability');
  const { records, isLoading } = useAccountability();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<string | null>(null);

  const pagination = usePagination(records, { pageSize: 10 });

  if (moduleLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <FileCheck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Módulo não disponível
              </h3>
              <p className="text-sm text-muted-foreground">
                O módulo de Prestação de Contas não está incluído no seu plano atual.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalSpent = records.reduce((sum, r) => sum + Number(r.amount_spent), 0);
  const pendingCount = records.filter(r => r.status === 'draft' || r.status === 'submitted').length;
  const approvedCount = records.filter(r => r.status === 'approved').length;

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Prestação de Contas</h1>
          <p className="text-muted-foreground mt-1">
            Registre e acompanhe gastos com documentação completa
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Prestação
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gasto</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {records.length} registro{records.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Aguardando aprovação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprovadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Prestações aprovadas
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registros de Prestação</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando registros...
            </div>
          ) : pagination.paginatedData.length === 0 ? (
            <div className="text-center py-8">
              <FileCheck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhuma prestação de contas registrada ainda.
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setIsFormOpen(true)}
              >
                Registrar primeira prestação
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Data</th>
                    <th className="text-left p-3 font-medium">Destino</th>
                    <th className="text-left p-3 font-medium">Condomínio</th>
                    <th className="text-right p-3 font-medium">Valor</th>
                    <th className="text-center p-3 font-medium">Status</th>
                    <th className="text-center p-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pagination.paginatedData.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        {format(new Date(record.accountability_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </td>
                      <td className="p-3">{record.destination}</td>
                      <td className="p-3">{record.clients?.name || '-'}</td>
                      <td className="p-3 text-right">
                        R$ {Number(record.amount_spent).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={statusVariants[record.status]}>
                          {statusLabels[record.status]}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedRecord(record.id)}
                        >
                          Ver Detalhes
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {pagination.totalPages > 1 && (
        <DataTablePagination {...pagination} />
      )}

      <AccountabilityFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />

      {selectedRecord && (
        <AccountabilityDetailModal
          recordId={selectedRecord}
          open={!!selectedRecord}
          onOpenChange={(open) => !open && setSelectedRecord(null)}
        />
      )}
    </div>
  );
}
