import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { Package, TrendingUp, TrendingDown, RotateCcw, Calendar } from 'lucide-react';
import { useSupplierProducts, SupplierProduct } from '@/hooks/useSupplierProducts';

interface StockManagementModalProps {
  product: SupplierProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StockManagementModal({ product, open, onOpenChange }: StockManagementModalProps) {
  const { addStockMovement, getStockMovements, isLoading } = useSupplierProducts();
  const [movementType, setMovementType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  if (!product) return null;

  const stockMovements = getStockMovements(product.id);

  const getMovementTypeIcon = (type: string) => {
    switch (type) {
      case 'in':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'out':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'adjustment':
        return <RotateCcw className="h-4 w-4 text-blue-600" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getMovementTypeBadge = (type: string) => {
    switch (type) {
      case 'in':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Entrada</Badge>;
      case 'out':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Saída</Badge>;
      case 'adjustment':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Ajuste</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getStockStatus = (quantity: number, minLevel: number) => {
    if (quantity === 0) {
      return <Badge variant="destructive">Sem Estoque</Badge>;
    } else if (quantity <= minLevel) {
      return <Badge variant="secondary" className="text-orange-600 border-orange-600">Estoque Baixo</Badge>;
    } else {
      return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Em Estoque</Badge>;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (quantity <= 0) {
      toast({
        title: "Quantidade inválida",
        description: "A quantidade deve ser maior que zero.",
        variant: "destructive",
      });
      return;
    }

    if (!reason.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "Informe o motivo da movimentação.",
        variant: "destructive",
      });
      return;
    }

    if (movementType === 'out' && quantity > product.stockQuantity) {
      toast({
        title: "Estoque insuficiente",
        description: `Você só tem ${product.stockQuantity} unidades em estoque.`,
        variant: "destructive",
      });
      return;
    }

    try {
      await addStockMovement(product.id, {
        type: movementType,
        quantity: movementType === 'adjustment' ? quantity : quantity,
        reason,
        notes: notes.trim() || undefined,
      });

      const movementTypeText = movementType === 'in' ? 'Entrada' : movementType === 'out' ? 'Saída' : 'Ajuste';
      
      toast({
        title: "Movimentação registrada",
        description: `${movementTypeText} de ${quantity} unidades registrada com sucesso.`,
      });

      // Reset form
      setQuantity(0);
      setReason('');
      setNotes('');
      
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível registrar a movimentação.",
        variant: "destructive",
      });
    }
  };

  const presetReasons = {
    in: [
      'Compra de estoque',
      'Recebimento de fornecedor',
      'Devolução de cliente',
      'Transferência entre depósitos',
      'Produção interna',
    ],
    out: [
      'Venda',
      'Perda/Avaria',
      'Transferência entre depósitos',
      'Amostra grátis',
      'Uso interno',
    ],
    adjustment: [
      'Inventário',
      'Correção de erro',
      'Perda não identificada',
      'Ajuste de sistema',
    ],
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Gerenciar Estoque - {product.name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Estoque Atual</p>
                  <p className="text-2xl font-bold">{product.stockQuantity}</p>
                </div>
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Estoque Mínimo</p>
                  <p className="text-2xl font-bold">{product.minStockLevel}</p>
                </div>
                <div className="h-8 w-8 flex items-center justify-center">
                  {getStockStatus(product.stockQuantity, product.minStockLevel)}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Código</p>
                  <p className="text-2xl font-bold font-mono">{product.code}</p>
                </div>
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Nova Movimentação</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo de Movimentação</Label>
                  <Select value={movementType} onValueChange={(value: any) => setMovementType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          Entrada
                        </div>
                      </SelectItem>
                      <SelectItem value="out">
                        <div className="flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-red-600" />
                          Saída
                        </div>
                      </SelectItem>
                      <SelectItem value="adjustment">
                        <div className="flex items-center gap-2">
                          <RotateCcw className="h-4 w-4 text-blue-600" />
                          Ajuste
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">
                    {movementType === 'adjustment' ? 'Novo Estoque' : 'Quantidade'}
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    min="0"
                    max={movementType === 'out' ? product.stockQuantity : undefined}
                    required
                  />
                  {movementType === 'out' && (
                    <p className="text-sm text-muted-foreground">
                      Máximo disponível: {product.stockQuantity}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Motivo</Label>
                  <Select value={reason} onValueChange={setReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um motivo" />
                    </SelectTrigger>
                    <SelectContent>
                      {presetReasons[movementType].map((presetReason) => (
                        <SelectItem key={presetReason} value={presetReason}>
                          {presetReason}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Outro motivo...</SelectItem>
                    </SelectContent>
                  </Select>
                  {reason === 'custom' && (
                    <Input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Digite o motivo"
                      className="mt-2"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações (Opcional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Informações adicionais..."
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Registrando...' : 'Registrar Movimentação'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Histórico de Movimentações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {stockMovements.length > 0 ? (
                  <div className="space-y-2">
                    {stockMovements.map((movement) => (
                      <div key={movement.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          {getMovementTypeIcon(movement.type)}
                          <div>
                            <div className="flex items-center gap-2">
                              {getMovementTypeBadge(movement.type)}
                              <span className="font-medium">
                                {movement.type === 'adjustment' ? movement.quantity : 
                                 movement.type === 'in' ? `+${movement.quantity}` : `-${movement.quantity}`}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{movement.reason}</p>
                            {movement.notes && (
                              <p className="text-xs text-muted-foreground">{movement.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            {new Date(movement.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(movement.createdAt).toLocaleTimeString('pt-BR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground mt-2">
                      Nenhuma movimentação registrada
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-6 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}