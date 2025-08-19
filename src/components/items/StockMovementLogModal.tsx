import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Calendar, User, MapPin, FileText, Search, Filter } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

interface StockMovementLogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movements: any[];
  auditLogs: any[];
}

export function StockMovementLogModal({ open, onOpenChange, movements, auditLogs }: StockMovementLogModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("all");

  // Combine and sort movements and related audit logs
  const allEntries = [
    ...movements.map(movement => ({
      id: movement.id,
      type: 'movement',
      timestamp: movement.createdAt,
      data: movement,
    })),
    ...auditLogs
      .filter(log => log.action === 'STOCK_MOVEMENT')
      .map(log => ({
        id: log.id,
        type: 'audit',
        timestamp: log.timestamp,
        data: log,
      }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filteredEntries = allEntries.filter(entry => {
    const searchMatch = entry.type === 'movement' 
      ? (entry.data.itemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         entry.data.itemCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         entry.data.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         entry.data.requester?.toLowerCase().includes(searchTerm.toLowerCase()))
      : (entry.data.details?.itemCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         entry.data.details?.reason?.toLowerCase().includes(searchTerm.toLowerCase()));

    const typeMatch = filterType === "all" || 
      (filterType === "in" && entry.type === 'movement' && entry.data.type === 'in') ||
      (filterType === "out" && entry.type === 'movement' && entry.data.type === 'out');

    return searchMatch && typeMatch;
  });

  const getMovementIcon = (type: string) => {
    return type === 'in' ? (
      <TrendingUp className="h-4 w-4 text-success" />
    ) : (
      <TrendingDown className="h-4 w-4 text-destructive" />
    );
  };

  const getMovementBadge = (type: string) => {
    return type === 'in' ? (
      <Badge className="badge-success">Entrada</Badge>
    ) : (
      <Badge className="badge-error">Saída</Badge>
    );
  };

  const getReasonLabel = (reason: string) => {
    const reasonMap: { [key: string]: string } = {
      'purchase': 'Compra',
      'return': 'Devolução',
      'adjustment': 'Ajuste de Inventário',
      'initial': 'Estoque Inicial',
      'use': 'Uso/Consumo',
      'sale': 'Venda',
      'loss': 'Perda/Avaria',
      'transfer': 'Transferência',
    };
    return reasonMap[reason] || reason;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Log de Movimentações de Estoque
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Filters */}
          <Card className="card-corporate">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Filtros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="search"
                      placeholder="Item, código, motivo, solicitante..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de Movimento</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="in">Entradas</SelectItem>
                      <SelectItem value="out">Saídas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="period">Período</Label>
                  <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="today">Hoje</SelectItem>
                      <SelectItem value="week">Esta semana</SelectItem>
                      <SelectItem value="month">Este mês</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="card-corporate">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-success">
                  {movements.filter(m => m.type === 'in').length}
                </div>
                <div className="text-sm text-muted-foreground">Entradas</div>
              </CardContent>
            </Card>
            <Card className="card-corporate">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-destructive">
                  {movements.filter(m => m.type === 'out').length}
                </div>
                <div className="text-sm text-muted-foreground">Saídas</div>
              </CardContent>
            </Card>
            <Card className="card-corporate">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">
                  {movements.reduce((acc, m) => acc + (m.type === 'in' ? m.quantity : 0), 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Entradas</div>
              </CardContent>
            </Card>
            <Card className="card-corporate">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-warning">
                  {movements.reduce((acc, m) => acc + (m.type === 'out' ? m.quantity : 0), 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Saídas</div>
              </CardContent>
            </Card>
          </div>

          {/* Movements List */}
          <div className="space-y-3">
            {filteredEntries.length === 0 ? (
              <Card className="card-corporate">
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm || filterType !== "all" 
                      ? "Nenhuma movimentação encontrada com os filtros aplicados"
                      : "Ainda não há movimentações registradas"
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredEntries.map((entry) => (
                <Card key={entry.id} className="card-corporate">
                  <CardContent className="p-4">
                    {entry.type === 'movement' ? (
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            {getMovementIcon(entry.data.type)}
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{entry.data.itemName}</h4>
                                <Badge variant="outline" className="text-xs font-mono">
                                  {entry.data.itemCode}
                                </Badge>
                                {getMovementBadge(entry.data.type)}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {getReasonLabel(entry.data.reason)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-bold ${
                              entry.data.type === 'in' ? 'text-success' : 'text-destructive'
                            }`}>
                              {entry.data.type === 'in' ? '+' : '-'}{entry.data.quantity}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {entry.data.previousStock} → {entry.data.newStock}
                            </div>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">
                                {format(new Date(entry.data.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                              </div>
                              <div className="text-muted-foreground">
                                {format(new Date(entry.data.createdAt), 'HH:mm', { locale: ptBR })}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">Usuário</div>
                              <div className="text-muted-foreground">{entry.data.createdBy}</div>
                            </div>
                          </div>
                          {entry.data.destination && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">Destino</div>
                                <div className="text-muted-foreground">{entry.data.destination}</div>
                              </div>
                            </div>
                          )}
                          {entry.data.requester && (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">Solicitante</div>
                                <div className="text-muted-foreground">{entry.data.requester}</div>
                              </div>
                            </div>
                          )}
                        </div>

                        {entry.data.observations && (
                          <div className="p-3 bg-muted/30 rounded-lg">
                            <div className="text-sm font-medium mb-1">Observações:</div>
                            <div className="text-sm text-muted-foreground">
                              {entry.data.observations}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      // Audit log entry
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Registro de Auditoria</span>
                          <Badge variant="outline" className="text-xs">
                            {entry.data.action}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(entry.data.timestamp), 'dd/MM/yyyy HH:mm', { locale: ptBR })} - 
                          Usuário: {entry.data.userId}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}