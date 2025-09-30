import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Download, 
  Filter,
  AlertTriangle,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  Activity,
  Database,
  Loader2
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuditLogs } from '@/hooks/useAuditLogs';

export function AuditLogs() {
  const { logs, isLoading, fetchLogs, exportLogs } = useAuditLogs();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchLogs({
      searchTerm,
      module: filterModule,
      action: filterAction,
      startDate,
      endDate,
    });
  }, [filterModule, filterAction, startDate, endDate, fetchLogs]);

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    
    const search = searchTerm.toLowerCase();
    return (
      (log.user_name?.toLowerCase() || '').includes(search) ||
      log.action.toLowerCase().includes(search) ||
      log.entity_type.toLowerCase().includes(search) ||
      log.entity_id.toLowerCase().includes(search) ||
      JSON.stringify(log.details || {}).toLowerCase().includes(search)
    );
  });

  const uniqueActions = Array.from(new Set(logs.map(l => l.action)));
  const uniqueUsers = Array.from(new Set(logs.map(l => l.user_id).filter(Boolean)));

  const getActionIcon = (action: string) => {
    if (action.includes('CREATE')) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (action.includes('DELETE') || action.includes('REMOVE')) return <XCircle className="h-4 w-4 text-red-600" />;
    if (action.includes('UPDATE') || action.includes('EDIT')) return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    return <Activity className="h-4 w-4 text-blue-600" />;
  };

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'bg-green-100 text-green-800 border-green-200';
    if (action.includes('DELETE') || action.includes('REMOVE')) return 'bg-red-100 text-red-800 border-red-200';
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'collaborator': return 'bg-green-100 text-green-800';
      case 'supplier': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const stats = {
    total: logs.length,
    creates: logs.filter(l => l.action.includes('CREATE')).length,
    updates: logs.filter(l => l.action.includes('UPDATE') || l.action.includes('EDIT')).length,
    deletes: logs.filter(l => l.action.includes('DELETE') || l.action.includes('REMOVE')).length,
    uniqueUsers: uniqueUsers.length
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Logs de Auditoria</h1>
            <p className="text-muted-foreground">Monitore todas as atividades do sistema</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => exportLogs('csv')} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button onClick={() => exportLogs('json')} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              JSON
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Database className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total de Logs</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold">{stats.creates}</p>
              <p className="text-xs text-muted-foreground">Criações</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
              <p className="text-2xl font-bold">{stats.updates}</p>
              <p className="text-xs text-muted-foreground">Atualizações</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <XCircle className="h-6 w-6 mx-auto mb-2 text-red-600" />
              <p className="text-2xl font-bold">{stats.deletes}</p>
              <p className="text-xs text-muted-foreground">Exclusões</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <User className="h-6 w-6 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold">{stats.uniqueUsers}</p>
              <p className="text-xs text-muted-foreground">Usuários Ativos</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros e Pesquisa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={filterModule} onValueChange={setFilterModule}>
                <SelectTrigger>
                  <SelectValue placeholder="Módulo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os módulos</SelectItem>
                  <SelectItem value="quotes">Cotações</SelectItem>
                  <SelectItem value="users">Usuários</SelectItem>
                  <SelectItem value="suppliers">Fornecedores</SelectItem>
                  <SelectItem value="auth">Autenticação</SelectItem>
                  <SelectItem value="approvals">Aprovações</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  {uniqueActions.map((action, idx) => (
                    <SelectItem key={`${action}-${idx}`} value={action}>{action}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div>
                <label className="text-sm font-medium block mb-2">Data Inicial</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Data Final</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Registro de Auditoria ({filteredLogs.length})</CardTitle>
            <CardDescription>Histórico completo de atividades do sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Carregando logs...</span>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Database className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum log encontrado</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Módulo</TableHead>
                    <TableHead>ID Entidade</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {new Date(log.created_at).toLocaleDateString('pt-BR')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(log.created_at).toLocaleTimeString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-sm">{log.user_name || 'Sistema'}</p>
                          {log.user_email && (
                            <p className="text-xs text-muted-foreground">{log.user_email}</p>
                          )}
                          {log.user_role && (
                            <Badge variant="outline" className={getRoleColor(log.user_role)}>
                              {log.user_role}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          <Badge variant="outline" className={`font-mono text-xs ${getActionColor(log.action)}`}>
                            {log.action}
                          </Badge>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant="secondary">
                          {log.entity_type}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <span className="text-xs font-mono text-muted-foreground">
                          {log.entity_id}
                        </span>
                      </TableCell>
                      
                      <TableCell>
                        <div className="max-w-md">
                          {log.details && typeof log.details === 'object' ? (
                            <pre className="text-xs bg-muted p-2 rounded max-h-20 overflow-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          ) : (
                            <span className="text-sm">{log.details || '-'}</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AuditLogs;