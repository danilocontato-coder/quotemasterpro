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
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';

export const AsaasPaymentsTable = () => {
  const { payments, isLoading, listPayments, deletePayment, createPayment, getStatusText, getStatusColor } = useAsaasPayments();
  const [selectedPayment, setSelectedPayment] = useState<AsaasPayment | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    listPayments();
  }, []);

  const handleDelete = async (paymentId: string) => {
    await deletePayment(paymentId);
    setShowDeleteDialog(false);
    listPayments();
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
    listPayments();
  };

  const filteredPayments = payments.filter(payment => {
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    const matchesSearch = 
      payment.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
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
            placeholder="Buscar por cliente, ID ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        <Button variant="outline" onClick={() => listPayments()} disabled={isLoading}>
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
              <TableHead>Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Carregando cobranças...
                </TableCell>
              </TableRow>
            ) : filteredPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                  <TableCell className="max-w-[200px] truncate">
                    {payment.customer}
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
