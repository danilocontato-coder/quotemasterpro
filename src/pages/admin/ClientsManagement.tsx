import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Plus, 
  Building2, 
  Users, 
  TrendingUp,
  DollarSign,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Phone,
  Mail,
  MapPin,
  Tag,
  FileText,
  Shield,
  CreditCard
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
import { useAdminClients } from '@/hooks/useAdminClients';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';
import { CreateClientModal } from '@/components/admin/CreateClientModal';
import { ClientGroupsManager } from '@/components/admin/ClientGroupsManager';

export const ClientsManagement = () => {
  const {
    clients,
    clientGroups,
    searchTerm,
    setSearchTerm,
    filterGroup,
    setFilterGroup,
    filterStatus,
    setFilterStatus,
    createClient,
    updateClient,
    deleteClient,
    createGroup,
    updateGroup,
    deleteGroup,
    generateTemporaryPassword,
    generateUsername,
    stats
  } = useAdminClients();
  
  const { plans, getPlanById } = useSubscriptionPlans();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGroupsManager, setShowGroupsManager] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getGroupColor = (groupId?: string) => {
    const group = clientGroups.find(g => g.id === groupId);
    return group?.color || 'gray';
  };
  
  const getPlanInfo = (planId: string) => {
    const plan = getPlanById(planId);
    return plan ? {
      displayName: plan.displayName,
      price: plan.pricing.monthly,
      isPopular: plan.isPopular
    } : {
      displayName: planId,
      price: 0,
      isPopular: false
    };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gerenciamento de Clientes</h1>
            <p className="text-muted-foreground">Gerencie todos os clientes da plataforma</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline"
              onClick={() => setShowGroupsManager(true)}
            >
              <Tag className="h-4 w-4 mr-2" />
              Grupos
            </Button>
            <Button 
              className="bg-primary hover:bg-primary/90"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Building2 className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Clientes</p>
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
              <DollarSign className="h-6 w-6 mx-auto mb-2 text-emerald-600" />
              <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
              <p className="text-xs text-muted-foreground">Receita Total</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-6 w-6 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold">{stats.avgQuotes}</p>
              <p className="text-xs text-muted-foreground">Cotações/Cliente</p>
            </CardContent>
          </Card>
        </div>

        {/* Distribuição por Grupos */}
        {stats.byGroup.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Distribuição por Grupos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {stats.byGroup.map((group) => (
                  <div key={group.name} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full bg-${group.color}-500`}></div>
                    <span className="text-sm font-medium">{group.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {group.count}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
                    placeholder="Pesquisar por nome, CNPJ ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={filterGroup} onValueChange={setFilterGroup}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os grupos</SelectItem>
                  {clientGroups.map(group => (
                    <SelectItem key={group.id} value={group.id}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full bg-${group.color}-500`}></div>
                        {group.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
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

        {/* Tabela de Clientes */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Clientes ({clients.length})</CardTitle>
            <CardDescription>Todos os clientes cadastrados na plataforma</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Métricas</TableHead>
                  <TableHead>Último Acesso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-muted">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{client.companyName}</p>
                          <p className="text-sm text-muted-foreground">{client.cnpj}</p>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span>{client.email}</span>
                        </div>
                        {client.phone && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{client.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {client.groupName ? (
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full bg-${getGroupColor(client.groupId)}-500`}></div>
                          <span className="text-sm">{client.groupName}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Sem grupo</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <Badge className={getStatusColor(client.status)}>
                        {client.status === 'active' ? 'Ativo' :
                         client.status === 'inactive' ? 'Inativo' : 'Pendente'}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {getPlanInfo(client.plan).displayName}
                          </span>
                          {getPlanInfo(client.plan).isPopular && (
                            <Badge variant="secondary" className="text-xs">
                              Popular
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(getPlanInfo(client.plan).price)}/mês
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-green-600">
                          {formatCurrency(client.revenue)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {client.quotesCount} cotações
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {client.lastAccess || 'Nunca'}
                      </span>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-background border z-50">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <FileText className="h-4 w-4 mr-2" />
                            Documentos
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Shield className="h-4 w-4 mr-2" />
                            Credenciais
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            {client.status === 'active' ? (
                              <>
                                <UserX className="h-4 w-4 mr-2" />
                                Desativar
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Ativar
                              </>
                            )}
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

      {/* Modals */}
      <CreateClientModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onCreateClient={createClient}
        clientGroups={clientGroups}
        generateUsername={generateUsername}
        generateTemporaryPassword={generateTemporaryPassword}
      />

      <ClientGroupsManager
        open={showGroupsManager}
        onOpenChange={setShowGroupsManager}
        groups={clientGroups}
        onCreateGroup={createGroup}
        onUpdateGroup={updateGroup}
        onDeleteGroup={deleteGroup}
      />
    </div>
  );
};