import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Package, User, MapPin, Lock } from "lucide-react";
import { toast } from "sonner";

interface StockMovementModalProps {
  item: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMovementCreate: (movement: any) => void;
}

export function StockMovementModal({ item, open, onOpenChange, onMovementCreate }: StockMovementModalProps) {
  const [movementType, setMovementType] = useState<'in' | 'out'>('in');
  const [formData, setFormData] = useState({
    quantity: '',
    reason: '',
    destination: '',
    requester: '',
    confirmationPassword: '',
    observations: '',
  });

  if (!item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.quantity || !formData.reason) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    const quantity = parseInt(formData.quantity);
    if (quantity <= 0) {
      toast.error("Quantidade deve ser maior que zero");
      return;
    }

    if (movementType === 'out' && quantity > (item.stock_quantity || 0)) {
      toast.error("Quantidade de saída não pode ser maior que o estoque atual");
      return;
    }

    // Simulate password validation
    if (formData.confirmationPassword !== '123456') {
      toast.error("Senha de confirmação incorreta");
      return;
    }

    const movement = {
      id: `mov-${Date.now()}`,
      itemId: item.id,
      itemCode: item.code,
      itemName: item.name,
      type: movementType,
      quantity,
      reason: formData.reason,
      destination: formData.destination,
      requester: formData.requester,
      observations: formData.observations,
      previousStock: item.stock_quantity || 0,
      newStock: movementType === 'in' 
        ? (item.stock_quantity || 0) + quantity 
        : (item.stock_quantity || 0) - quantity,
      createdAt: new Date().toISOString(),
      createdBy: 'current-user', // Would come from auth context
    };

    onMovementCreate(movement);
    toast.success(`${movementType === 'in' ? 'Entrada' : 'Saída'} registrada com sucesso!`);
    
    // Reset form
    setFormData({
      quantity: '',
      reason: '',
      destination: '',
      requester: '',
      confirmationPassword: '',
      observations: '',
    });
    setMovementType('in');
    onOpenChange(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isService = item.category === 'Serviços' || item.type === 'service';

  if (isService) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Movimentação não aplicável</DialogTitle>
          </DialogHeader>
          <div className="text-center p-4">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Serviços não possuem controle de estoque físico.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Movimentação de Estoque
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Item Information */}
          <Card className="card-corporate">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Item Selecionado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Código:</span>
                <span className="font-mono text-sm">{item.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Nome:</span>
                <span className="text-sm font-medium">{item.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Estoque Atual:</span>
                <span className="text-sm font-bold text-primary">{item.stock_quantity || 0} unidades</span>
              </div>
            </CardContent>
          </Card>

          {/* Movement Type */}
          <Card className="card-corporate">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Tipo de Movimentação</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup 
                value={movementType} 
                onValueChange={(value) => setMovementType(value as 'in' | 'out')}
                className="grid grid-cols-2 gap-4"
              >
                <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-accent/50">
                  <RadioGroupItem value="in" id="entry" />
                  <Label htmlFor="entry" className="flex items-center gap-2 cursor-pointer flex-1">
                    <TrendingUp className="h-4 w-4 text-success" />
                    <div>
                      <div className="font-medium text-success">Entrada</div>
                      <div className="text-xs text-muted-foreground">Adicionar ao estoque</div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-accent/50">
                  <RadioGroupItem value="out" id="exit" />
                  <Label htmlFor="exit" className="flex items-center gap-2 cursor-pointer flex-1">
                    <TrendingDown className="h-4 w-4 text-destructive" />
                    <div>
                      <div className="font-medium text-destructive">Saída</div>
                      <div className="text-xs text-muted-foreground">Remover do estoque</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Movement Details */}
          <Card className="card-corporate">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Detalhes da Movimentação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantidade *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="0"
                    value={formData.quantity}
                    onChange={(e) => handleInputChange('quantity', e.target.value)}
                    min="1"
                    max={movementType === 'out' ? (item.stock_quantity || 0) : undefined}
                    required
                  />
                  {movementType === 'out' && (
                    <p className="text-xs text-muted-foreground">
                      Máximo disponível: {item.stock_quantity || 0} unidades
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Motivo *</Label>
                  <Select value={formData.reason} onValueChange={(value) => handleInputChange('reason', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o motivo" />
                    </SelectTrigger>
                    <SelectContent>
                      {movementType === 'in' ? (
                        <>
                          <SelectItem value="purchase">Compra</SelectItem>
                          <SelectItem value="return">Devolução</SelectItem>
                          <SelectItem value="adjustment">Ajuste de Inventário</SelectItem>
                          <SelectItem value="initial">Estoque Inicial</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="use">Uso/Consumo</SelectItem>
                          <SelectItem value="sale">Venda</SelectItem>
                          <SelectItem value="loss">Perda/Avaria</SelectItem>
                          <SelectItem value="transfer">Transferência</SelectItem>
                          <SelectItem value="adjustment">Ajuste de Inventário</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {movementType === 'out' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="destination" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Destino
                    </Label>
                    <Input
                      id="destination"
                      placeholder="Para onde será destinado"
                      value={formData.destination}
                      onChange={(e) => handleInputChange('destination', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="requester" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Solicitante
                    </Label>
                    <Input
                      id="requester"
                      placeholder="Nome do solicitante"
                      value={formData.requester}
                      onChange={(e) => handleInputChange('requester', e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  placeholder="Informações adicionais sobre a movimentação..."
                  value={formData.observations}
                  onChange={(e) => handleInputChange('observations', e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="card-corporate border-warning/20">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Confirmação de Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="confirmationPassword">Senha de Confirmação *</Label>
                <Input
                  id="confirmationPassword"
                  type="password"
                  placeholder="Digite a senha para confirmar"
                  value={formData.confirmationPassword}
                  onChange={(e) => handleInputChange('confirmationPassword', e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Para fins de demonstração, use: <code className="text-primary">123456</code>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          {formData.quantity && (
            <Card className="card-corporate border-primary/20 bg-primary/5">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Resumo da Movimentação</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Estoque Atual</p>
                    <p className="text-xl font-bold">{item.stock_quantity || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {movementType === 'in' ? 'Entrada' : 'Saída'}
                    </p>
                    <p className={`text-xl font-bold ${movementType === 'in' ? 'text-success' : 'text-destructive'}`}>
                      {movementType === 'in' ? '+' : '-'}{formData.quantity}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Novo Estoque</p>
                    <p className="text-xl font-bold text-primary">
                      {movementType === 'in' 
                        ? (item.stock_quantity || 0) + parseInt(formData.quantity || '0')
                        : (item.stock_quantity || 0) - parseInt(formData.quantity || '0')
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="btn-corporate">
              Registrar {movementType === 'in' ? 'Entrada' : 'Saída'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}