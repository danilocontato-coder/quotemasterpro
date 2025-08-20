import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { 
  Search, 
  Download, 
  Filter,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  User,
  FileText,
  Calendar,
  Shield,
  Activity,
  Database
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'error' | 'warning';
  module: string;
}

const mockAuditLogs: AuditLog[] = [
  {
    id: 'log-1',
    timestamp: '2024-08-20T14:30:00Z',
    userId: 'user-1',
    userName: 'João Silva',
    userRole: 'manager',
    action: 'CREATE_QUOTE',
    resource: 'quotes',
    resourceId: 'quote-123',
    details: 'Criou cotação "Material de limpeza" no valor de R$ 1.500,00',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0...',
    status: 'success',
    module: 'quotes'
  },
  {
    id: 'log-2',
    timestamp: '2024-08-20T14:25:00Z',
    userId: 'user-2',
    userName: 'Maria Santos',
    userRole: 'admin',
    action: 'UPDATE_USER',
    resource: 'users',
    resourceId: 'user-5',
    details: 'Atualizou permissões do usuário Pedro Lima',
    ipAddress: '192.168.1.105',
    userAgent: 'Mozilla/5.0...',
    status: 'success',
    module: 'users'
  },
  {
    id: 'log-3',
    timestamp: '2024-08-20T14:20:00Z',
    userId: 'user-3',
    userName: 'Carlos Oliveira',
    userRole: 'supplier',
    action: 'FAILED_LOGIN',
    resource: 'auth',
    details: 'Tentativa de login falhada - senha incorreta',
    ipAddress: '203.0.113.45',
    userAgent: 'Mozilla/5.0...',
    status: 'error',
    module: 'auth'
  },
  {
    id: 'log-4',
    timestamp: '2024-08-20T14:15:00Z',
    userId: 'user-1',
    userName: 'João Silva',
    userRole: 'manager',
    action: 'APPROVE_QUOTE',
    resource: 'approvals',
    resourceId: 'approval-456',
    details: 'Aprovou cotação no valor de R$ 2.300,00',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0...',
    status: 'success',
    module: 'approvals'
  },
  {
    id: 'log-5',
    timestamp: '2024-08-20T14:10:00Z',
    userId: 'user-4',
    userName: 'Ana Costa',
    userRole: 'admin',
    action: 'DELETE_SUPPLIER',
    resource: 'suppliers',
    resourceId: 'supplier-789',
    details: 'Removeu fornecedor "Empresa XYZ" do sistema',
    ipAddress: '192.168.1.102',
    userAgent: 'Mozilla/5.0...',
    status: 'warning',
    module: 'suppliers'
  }
];

export function AuditLogs() {
  const [logs] = useState<AuditLog[]>(mockAuditLogs);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [dateRange, setDateRange] = useState<string>('');

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesModule = filterModule === 'all' || log.module === filterModule;
    const matchesStatus = filterStatus === 'all' || log.status === filterStatus;
    const matchesUser = filterUser === 'all' || log.userId === filterUser;
    
    return matchesSearch && matchesModule && matchesStatus && matchesUser;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
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

  const handleExport = () => {
    // Implementar exportação
    toast.success('Exportando logs de auditoria...');
  };

  const stats = {
    total: logs.length,
    success: logs.filter(l => l.status === 'success').length,
    errors: logs.filter(l => l.status === 'error').length,
    warnings: logs.filter(l => l.status === 'warning').length,
    uniqueUsers: new Set(logs.map(l => l.userId)).size
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Logs de Auditoria</h1>
            <p className="text-muted-foreground">Monitore todas as atividades do sistema</p>
          </div>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Logs
          </Button>
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
              <p className="text-2xl font-bold">{stats.success}</p>
              <p className="text-xs text-muted-foreground">Sucessos</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <XCircle className="h-6 w-6 mx-auto mb-2 text-red-600" />
              <p className="text-2xl font-bold">{stats.errors}</p>
              <p className="text-xs text-muted-foreground">Erros</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
              <p className="text-2xl font-bold">{stats.warnings}</p>
              <p className="text-xs text-muted-foreground">Avisos</p>
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
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="success">Sucesso</SelectItem>
                  <SelectItem value="error">Erro</SelectItem>
                  <SelectItem value="warning">Aviso</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Usuário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  <SelectItem value="user-1">João Silva</SelectItem>
                  <SelectItem value="user-2">Maria Santos</SelectItem>
                  <SelectItem value="user-3">Carlos Oliveira</SelectItem>
                  <SelectItem value="user-4">Ana Costa</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Período</label>
                <Input
                  type="date"
                  placeholder="Data inicial"
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Recurso</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Detalhes</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {new Date(log.timestamp).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{log.userName}</p>
                        <Badge variant="outline" className={getRoleColor(log.userRole)}>
                          {log.userRole}
                        </Badge>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {log.action}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{log.resource}</p>
                        {log.resourceId && (
                          <p className="text-xs text-muted-foreground">#{log.resourceId}</p>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.status)}
                        <Badge className={getStatusColor(log.status)}>
                          {log.status === 'success' ? 'Sucesso' : 
                           log.status === 'error' ? 'Erro' : 'Aviso'}
                        </Badge>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <p className="text-sm max-w-xs truncate" title={log.details}>
                        {log.details}
                      </p>
                    </TableCell>
                    
                    <TableCell>
                      <span className="text-xs font-mono text-muted-foreground">
                        {log.ipAddress}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}