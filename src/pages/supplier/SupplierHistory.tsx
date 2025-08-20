import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  History, 
  Search, 
  Download, 
  Filter,
  Package,
  CreditCard,
  Users,
  Settings,
  FileText,
  Calendar,
  Activity
} from "lucide-react";
import { useSupplierHistory } from "@/hooks/useSupplierHistory";

export default function SupplierHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateRange, setDateRange] = useState("30");

  const { historyLogs, isLoading, exportHistory } = useSupplierHistory();

  const filteredLogs = useMemo(() => {
    return historyLogs.filter(log => {
      const matchesSearch = 
        log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entityId.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAction = actionFilter === 'all' || log.actionType === actionFilter;
      
      // Filter by date range
      const logDate = new Date(log.createdAt);
      const now = new Date();
      const daysAgo = new Date(now.getTime() - parseInt(dateRange) * 24 * 60 * 60 * 1000);
      const matchesDate = logDate >= daysAgo;
      
      return matchesSearch && matchesAction && matchesDate;
    });
  }, [historyLogs, searchTerm, actionFilter, dateRange]);

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'product_created':
      case 'product_updated':
      case 'product_deleted':
        return <Package className="h-4 w-4" />;
      case 'quote_responded':
      case 'quote_viewed':
        return <FileText className="h-4 w-4" />;
      case 'payment_received':
        return <CreditCard className="h-4 w-4" />;
      case 'profile_updated':
      case 'settings_changed':
        return <Settings className="h-4 w-4" />;
      case 'client_interaction':
        return <Users className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActionBadge = (actionType: string) => {
    switch (actionType) {
      case 'product_created':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Produto Criado</Badge>;
      case 'product_updated':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Produto Atualizado</Badge>;
      case 'product_deleted':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Produto Excluído</Badge>;
      case 'quote_responded':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Proposta Enviada</Badge>;
      case 'quote_viewed':
        return <Badge variant="secondary">Cotação Visualizada</Badge>;
      case 'payment_received':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Pagamento Recebido</Badge>;
      case 'profile_updated':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Perfil Atualizado</Badge>;
      case 'settings_changed':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Configurações</Badge>;
      case 'client_interaction':
        return <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">Interação Cliente</Badge>;
      default:
        return <Badge variant="outline">{actionType}</Badge>;
    }
  };

  const getActionTypeLabel = (actionType: string) => {
    switch (actionType) {
      case 'product_created': return 'Produto Criado';
      case 'product_updated': return 'Produto Atualizado';
      case 'product_deleted': return 'Produto Excluído';
      case 'quote_responded': return 'Proposta Enviada';
      case 'quote_viewed': return 'Cotação Visualizada';
      case 'payment_received': return 'Pagamento Recebido';
      case 'profile_updated': return 'Perfil Atualizado';
      case 'settings_changed': return 'Configurações';
      case 'client_interaction': return 'Interação Cliente';
      default: return actionType;
    }
  };

  const handleExport = () => {
    exportHistory('csv');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Histórico de Atividades</h1>
          <p className="text-muted-foreground">
            Acompanhe todas as ações realizadas na sua conta
          </p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exportar Histórico
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Ações</p>
                <p className="text-2xl font-bold">{historyLogs.length}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Hoje</p>
                <p className="text-2xl font-bold">
                  {historyLogs.filter(log => {
                    const today = new Date().toDateString();
                    return new Date(log.createdAt).toDateString() === today;
                  }).length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Esta Semana</p>
                <p className="text-2xl font-bold">
                  {historyLogs.filter(log => {
                    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                    return new Date(log.createdAt) >= weekAgo;
                  }).length}
                </p>
              </div>
              <History className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Mais Frequente</p>
                <p className="text-sm font-bold">Visualização</p>
              </div>
              <FileText className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por descrição ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tipo de Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Ações</SelectItem>
                <SelectItem value="product_created">Produto Criado</SelectItem>
                <SelectItem value="product_updated">Produto Atualizado</SelectItem>
                <SelectItem value="product_deleted">Produto Excluído</SelectItem>
                <SelectItem value="quote_responded">Proposta Enviada</SelectItem>
                <SelectItem value="quote_viewed">Cotação Visualizada</SelectItem>
                <SelectItem value="payment_received">Pagamento Recebido</SelectItem>
                <SelectItem value="profile_updated">Perfil Atualizado</SelectItem>
                <SelectItem value="settings_changed">Configurações</SelectItem>
                <SelectItem value="client_interaction">Interação Cliente</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
                <SelectItem value="365">1 ano</SelectItem>
                <SelectItem value="all">Tudo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Atividades ({filteredLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {new Date(log.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(log.createdAt).toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.actionType)}
                        {getActionBadge(log.actionType)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="max-w-md">{log.description}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono text-sm">{log.entityId}</span>
                        <span className="text-sm text-muted-foreground">{log.entityType}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <Button variant="ghost" size="sm">
                          Ver Detalhes
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredLogs.length === 0 && (
              <div className="text-center py-8">
                <History className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground mt-2">
                  Nenhuma atividade encontrada
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}