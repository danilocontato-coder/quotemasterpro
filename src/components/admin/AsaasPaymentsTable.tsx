import React, { useEffect, useState } from 'react';
import { useAsaasPayments, AsaasPayment } from '@/hooks/useAsaasPayments';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Trash2, FileText, RefreshCw, ExternalLink, Plus } from 'lucide-react';
import { EditPaymentModal } from './EditPaymentModal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PaymentsStats } from './PaymentsStats';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { usePagination } from '@/hooks/usePagination';
import { format, addDays, subDays, startOfMonth, endOfDay } from 'date-fns';
import { toast } from 'sonner';

export const AsaasPaymentsTable = () => {
  const { payments, totalCount, isLoading, listPayments, deletePayment, createPayment, getStatusText, getStatusColor, calculateStats } = useAsaasPayments();
  const [selectedPayment, setSelectedPayment] = useState<AsaasPayment | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [periodFilter, setPeriodFilter] = useState<string>('30d');
  
  const pagination = usePagination(payments, {
    initialPageSize: 10,
    pageSizeOptions: [10, 25, 50, 100],
  });

  const loadPayments = () => {
    let dateFrom: string | undefined;
    let dateTo: string | undefined;

    // Calcular filtro de período
    if (periodFilter === '7d') {
      dateFrom = format(subDays(new Date(), 7), 'yyyy-MM-dd');
      dateTo = format(endOfDay(new Date()), 'yyyy-MM-dd');
    } else if (periodFilter === '30d') {
      dateFrom = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      dateTo = format(endOfDay(new Date()), 'yyyy-MM-dd');
    } else if (periodFilter === 'month') {
      dateFrom = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      dateTo = format(endOfDay(new Date()), 'yyyy-MM-dd');
    }

    listPayments({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      dateFrom,
      dateTo,
      limit: 100, // Buscar mais para filtrar localmente
    });
  };

  useEffect(() => {
    loadPayments();
  }, [periodFilter, statusFilter]);

  const handleDelete = async (paymentId: string) => {
    await deletePayment(paymentId);
    setShowDeleteDialog(false);
    loadPayments();
  };

  const handleGenerateNewBoleto = async (payment: AsaasPayment) => {
    const newDueDate = addDays(new Date(), 7);

    await createPayment({
      customerId: payment.customer,
      value: payment.value,
      dueDate: format(newDueDate, 'yyyy-MM-dd'),
      description: `Reemissão - ${payment.description}`,
      billingType: 'BOLETO',
    });

    toast.success('Novo boleto gerado com sucesso!');
    loadPayments();
  };

  const filteredPayments = pagination.paginatedData.filter(payment => {
    const matchesSearch = 
      payment.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const stats = calculateStats();

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <PaymentsStats stats={stats} />

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1 w-full sm:w-auto">
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="month">Este mês</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="PENDING">Pendente</SelectItem>
              <SelectItem value="RECEIVED">Recebido</SelectItem>
              <SelectItem value="CONFIRMED">Confirmado</SelectItem>
              <SelectItem value="OVERDUE">Vencido</SelectItem>
              <SelectItem value="REFUNDED">Reembolsado</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:max-w-md"
          />
        </div>

        <Button variant="outline" onClick={loadPayments} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Tabela */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cobrança</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Carregando cobranças...
                </TableCell>
              </TableRow>
            ) : filteredPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Nenhuma cobrança encontrada com os filtros aplicados' 
                    : 'Nenhuma cobrança encontrada'}
                </TableCell>
              </TableRow>
            ) : (
              filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-mono text-xs">
                    {payment.id.slice(0, 12)}...
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <div className="flex flex-col">
                      <span className="font-medium truncate">
                        {payment.customerName || payment.customer}
                      </span>
                      {payment.customerName && (
                        <span className="text-xs text-muted-foreground truncate">
                          {payment.customer.slice(0, 12)}...
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {payment.customerType === 'client' && (
                      <Badge className="bg-blue-500 text-white">Cliente</Badge>
                    )}
                    {payment.customerType === 'supplier' && (
                      <Badge className="bg-green-500 text-white">Fornecedor</Badge>
                    )}
                    {payment.customerType === 'unknown' && (
                      <Badge variant="outline" className="text-muted-foreground">
                        Não identificado
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold">
                    R$ {payment.value.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {new Date(payment.dueDate).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(payment.status)}>
                      {getStatusText(payment.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {payment.billingType}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {payment.bankSlipUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(payment.bankSlipUrl, '_blank')}
                          title="Ver boleto"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {payment.invoiceUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(payment.invoiceUrl, '_blank')}
                          title="Ver fatura"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}

                      {payment.status === 'OVERDUE' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleGenerateNewBoleto(payment)}
                          title="Gerar novo boleto"
                        >
                          <Plus className="h-4 w-4 text-blue-600" />
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedPayment(payment);
                          setShowEditModal(true);
                        }}
                        title="Editar cobrança"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedPayment(payment);
                          setShowDeleteDialog(true);
                        }}
                        title="Excluir cobrança"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      <DataTablePagination {...pagination} showCard={false} />

      {/* Modals */}
      {showEditModal && selectedPayment && (
        <EditPaymentModal
          payment={selectedPayment}
          open={showEditModal}
          onOpenChange={setShowEditModal}
          onSuccess={() => listPayments()}
        />
      )}

      {showDeleteDialog && selectedPayment && (
        <ConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title="Excluir Cobrança"
          description={`Tem certeza que deseja excluir a cobrança ${selectedPayment.id}? Esta ação não pode ser desfeita e a fatura correspondente será cancelada.`}
          onConfirm={() => handleDelete(selectedPayment.id)}
          confirmText="Excluir"
          cancelText="Cancelar"
        />
      )}
    </div>
  );
};
