import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Wrench, Calendar, User, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ViewItemModalProps {
  item: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewItemModal({ item, open, onOpenChange }: ViewItemModalProps) {
  if (!item) return null;

  const getStockStatus = (quantity: number) => {
    if (quantity <= 5) return { label: "Crítico", color: "badge-error" };
    if (quantity <= 10) return { label: "Baixo", color: "badge-warning" };
    return { label: "Normal", color: "badge-success" };
  };

  const stockStatus = getStockStatus(item.stockQuantity);
  const isService = item.category === 'Serviços' || item.type === 'service';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isService ? (
              <Wrench className="h-5 w-5" />
            ) : (
              <Package className="h-5 w-5" />
            )}
            Detalhes do {isService ? 'Serviço' : 'Produto'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card className="card-corporate">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center justify-between">
                Informações Básicas
                <Badge variant="outline" className="text-xs">
                  {isService ? 'Serviço' : 'Produto'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Código</p>
                  <p className="font-mono text-sm">{item.code}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge className={item.status === 'active' ? 'badge-success' : 'badge-error'}>
                    {item.status === 'active' ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Nome</p>
                <p className="text-lg font-semibold">{item.name}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Categoria</p>
                <Badge variant="outline">{item.category}</Badge>
              </div>

              {item.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Descrição</p>
                  <p className="text-sm">{item.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stock Information - Only for products */}
          {!isService && (
            <Card className="card-corporate">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  Controle de Estoque
                  {item.stockQuantity <= 10 && (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold">{item.stockQuantity}</p>
                    <p className="text-sm text-muted-foreground">Atual</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold">{item.minStock || 0}</p>
                    <p className="text-sm text-muted-foreground">Mínimo</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Badge className={stockStatus.color}>
                      {stockStatus.label}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-1">Status</p>
                  </div>
                </div>

                {item.stockQuantity <= 10 && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <p className="text-sm font-medium text-destructive">
                        Estoque {item.stockQuantity <= 5 ? 'Crítico' : 'Baixo'}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Considere realizar uma nova compra para manter o estoque adequado
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Pricing Information */}
          <Card className="card-corporate">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">
                {isService ? 'Precificação de Referência' : 'Informações de Preço'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {isService ? 'Preço de Referência' : 'Preço Unitário Estimado'}
                </p>
                <p className="text-2xl font-bold text-primary">
                  {item.unitPrice ? `R$ ${Number(item.unitPrice).toFixed(2)}` : 'Não informado'}
                </p>
                {isService && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Valor pode variar conforme fornecedor e complexidade
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card className="card-corporate">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Informações Adicionais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Cadastrado</p>
                    <p className="text-xs text-muted-foreground">
                      {item.createdAt ? 
                        formatDistanceToNow(new Date(item.createdAt), { 
                          addSuffix: true, 
                          locale: ptBR 
                        }) : 
                        'Data não informada'
                      }
                    </p>
                  </div>
                </div>
                {item.supplierId && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Fornecedor</p>
                      <p className="text-xs text-muted-foreground">ID: {item.supplierId}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Activity Placeholder */}
              <div className="pt-2 border-t">
                <p className="text-sm font-medium text-muted-foreground mb-2">Atividade Recente</p>
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                    <p>• Item cadastrado no sistema</p>
                  </div>
                  {!isService && item.stockQuantity > 0 && (
                    <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                      <p>• Estoque inicial definido: {item.stockQuantity} unidades</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}