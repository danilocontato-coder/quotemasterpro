import React, { useState } from 'react';
import { Eye, Package, FileText, Calendar, Plus, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSupplierReceiving } from '@/hooks/useSupplierReceiving';
import { useToast } from '@/hooks/use-toast';

const SupplierReceiving = () => {
  const { deliveries, registerDelivery, isLoading } = useSupplierReceiving();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [deliveryData, setDeliveryData] = useState({
    deliveredQuantity: '',
    serialNumber: '',
    comments: '',
    attachments: []
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendente', variant: 'outline' as const },
      partial: { label: 'Parcial', variant: 'default' as const },
      completed: { label: 'Concluída', variant: 'secondary' as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  const filteredDeliveries = deliveries.filter(delivery => {
    const matchesSearch = delivery.quoteId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         delivery.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || delivery.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleRegisterDelivery = () => {
    if (!selectedDelivery || !deliveryData.deliveredQuantity) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    registerDelivery(selectedDelivery.id, {
      deliveredQuantity: parseInt(deliveryData.deliveredQuantity),
      serialNumber: deliveryData.serialNumber,
      comments: deliveryData.comments,
      attachments: deliveryData.attachments
    });

    toast({
      title: "Sucesso",
      description: "Entrega registrada com sucesso",
    });

    setIsRegisterModalOpen(false);
    setDeliveryData({
      deliveredQuantity: '',
      serialNumber: '',
      comments: '',
      attachments: []
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando entregas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recebimento e Entregas</h1>
          <p className="text-muted-foreground">
            Gerencie suas entregas e registre recebimentos
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Entregas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
            <div className="flex flex-1 gap-4">
              <Input
                placeholder="Buscar por cotação ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="partial">Parcial</SelectItem>
                  <SelectItem value="completed">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cotação</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Prevista</TableHead>
                  <TableHead>Última Atualização</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeliveries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Truck className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">Nenhuma entrega encontrada</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDeliveries.map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell className="font-medium">{delivery.quoteId}</TableCell>
                      <TableCell>{delivery.clientName}</TableCell>
                      <TableCell>{getStatusBadge(delivery.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {delivery.expectedDate}
                        </div>
                      </TableCell>
                      <TableCell>{delivery.lastUpdate}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedDelivery(delivery);
                              setIsRegisterModalOpen(true);
                            }}
                          >
                            <Package className="h-4 w-4 mr-1" />
                            Registrar
                          </Button>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Registro de Entrega */}
      <Dialog open={isRegisterModalOpen} onOpenChange={setIsRegisterModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Entrega</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDelivery && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Cotação: {selectedDelivery.quoteId}</p>
                <p className="text-sm text-muted-foreground">Cliente: {selectedDelivery.clientName}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="deliveredQuantity">Quantidade Entregue *</Label>
              <Input
                id="deliveredQuantity"
                type="number"
                value={deliveryData.deliveredQuantity}
                onChange={(e) => setDeliveryData(prev => ({ ...prev, deliveredQuantity: e.target.value }))}
                placeholder="Ex: 10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="serialNumber">Lote/Serial (Opcional)</Label>
              <Input
                id="serialNumber"
                value={deliveryData.serialNumber}
                onChange={(e) => setDeliveryData(prev => ({ ...prev, serialNumber: e.target.value }))}
                placeholder="Ex: LOTE123"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comments">Comentários</Label>
              <Textarea
                id="comments"
                value={deliveryData.comments}
                onChange={(e) => setDeliveryData(prev => ({ ...prev, comments: e.target.value }))}
                placeholder="Observações sobre a entrega..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsRegisterModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleRegisterDelivery}>
                <Package className="h-4 w-4 mr-2" />
                Registrar Entrega
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierReceiving;