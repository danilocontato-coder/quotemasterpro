import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  Plus, 
  Users, 
  Building2, 
  Truck, 
  HeadphonesIcon,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Crown,
  Star
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Account {
  id: string;
  name: string;
  email: string;
  type: 'client' | 'supplier' | 'support' | 'admin';
  status: 'active' | 'inactive' | 'pending';
  plan: string;
  createdAt: string;
  lastAccess: string;
  revenue?: number;
  quotesCount?: number;
  rating?: number;
}

export const AccountsManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const mockAccounts: Account[] = [
    {
      id: '1',
      name: 'Condomínio Vista Verde',
      email: 'admin@vistaverde.com.br',
      type: 'client',
      status: 'active',
      plan: 'Premium',
      createdAt: '2024-01-15',
      lastAccess: 'Hoje às 14:30',
      revenue: 15750.00,
      quotesCount: 45
    },
    {
      id: '2',
      name: 'TechFlow Solutions',
      email: 'contato@techflow.com',
      type: 'supplier',
      status: 'active',
      plan: 'Pro',
      createdAt: '2024-02-10',
      lastAccess: '2 horas atrás',
      quotesCount: 128,
      rating: 4.8
    },
    {
      id: '3',
      name: 'Maria Silva',
      email: 'maria@suporte.com',
      type: 'support',
      status: 'active',
      plan: 'Standard',
      createdAt: '2024-01-20',
      lastAccess: '1 hora atrás'
    },
    {
      id: '4',
      name: 'João Santos',
      email: 'joao@quotemaster.com',
      type: 'admin',
      status: 'active',
      plan: 'SuperAdmin',
      createdAt: '2024-01-01',
      lastAccess: '30 min atrás'
    }
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'client': return <Building2 className="h-4 w-4" />;
      case 'supplier': return <Truck className="h-4 w-4" />;
      case 'support': return <HeadphonesIcon className="h-4 w-4" />;
      case 'admin': return <Crown className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'client': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'supplier': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'support': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'admin': return 'bg-pink-100 text-pink-800 border-pink-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredAccounts = mockAccounts.filter(account => {
    const matchesSearch = account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || account.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || account.status === selectedStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const stats = {
    total: mockAccounts.length,
    clients: mockAccounts.filter(a => a.type === 'client').length,
    suppliers: mockAccounts.filter(a => a.type === 'supplier').length,
    support: mockAccounts.filter(a => a.type === 'support').length,
    admins: mockAccounts.filter(a => a.type === 'admin').length,
    active: mockAccounts.filter(a => a.status === 'active').length,
    pending: mockAccounts.filter(a => a.status === 'pending').length
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gerenciamento de Contas</h1>
            <p className="text-muted-foreground">Controle todas as contas da plataforma</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Nova Conta
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Building2 className="h-6 w-6 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold">{stats.clients}</p>
              <p className="text-xs text-muted-foreground">Clientes</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Truck className="h-6 w-6 mx-auto mb-2 text-orange-600" />
              <p className="text-2xl font-bold">{stats.suppliers}</p>
              <p className="text-xs text-muted-foreground">Fornecedores</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <HeadphonesIcon className="h-6 w-6 mx-auto mb-2 text-purple-600" />
              <p className="text-2xl font-bold">{stats.support}</p>
              <p className="text-xs text-muted-foreground">Suporte</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Crown className="h-6 w-6 mx-auto mb-2 text-pink-600" />
              <p className="text-2xl font-bold">{stats.admins}</p>
              <p className="text-xs text-muted-foreground">Admins</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <UserCheck className="h-6 w-6 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <UserX className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros e Pesquisa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar por nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Tipo de conta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="client">Cliente</SelectItem>
                  <SelectItem value="supplier">Fornecedor</SelectItem>
                  <SelectItem value="support">Suporte</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Contas */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Contas ({filteredAccounts.length})</CardTitle>
            <CardDescription>Gerenciar todas as contas da plataforma</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Conta</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Último Acesso</TableHead>
                  <TableHead>Métricas</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-muted">
                          {getTypeIcon(account.type)}
                        </div>
                        <div>
                          <p className="font-medium">{account.name}</p>
                          <p className="text-sm text-muted-foreground">{account.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getTypeColor(account.type)}>
                        {account.type === 'client' ? 'Cliente' :
                         account.type === 'supplier' ? 'Fornecedor' :
                         account.type === 'support' ? 'Suporte' : 'Admin'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(account.status)}>
                        {account.status === 'active' ? 'Ativo' :
                         account.status === 'inactive' ? 'Inativo' : 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{account.plan}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {account.lastAccess}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {account.revenue && (
                          <span className="text-sm text-green-600 font-medium">
                            R$ {account.revenue.toLocaleString('pt-BR')}
                          </span>
                        )}
                        {account.quotesCount && (
                          <span className="text-xs text-muted-foreground">
                            {account.quotesCount} cotações
                          </span>
                        )}
                        {account.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs">{account.rating}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <UserCheck className="h-4 w-4 mr-2" />
                            {account.status === 'active' ? 'Desativar' : 'Ativar'}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
};