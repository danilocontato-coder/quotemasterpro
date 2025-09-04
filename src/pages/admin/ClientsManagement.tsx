import React, { useState, useMemo, useCallback } from 'react';
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
import { useSupabaseAdminClients } from '@/hooks/useSupabaseAdminClients';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';
import { usePagination } from '@/hooks/usePagination';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { CreateClientModal } from '@/components/admin/CreateClientModal';
import { ClientGroupsManager } from '@/components/admin/ClientGroupsManager';
import { ViewClientModal } from '@/components/admin/ViewClientModal';
import { EditClientModal } from '@/components/admin/EditClientModal';
import { ClientCredentialsModal } from '@/components/admin/ClientCredentialsModal';
import { ClientDocumentsModal } from '@/components/admin/ClientDocumentsModal';
import { DeleteClientModal } from '@/components/admin/DeleteClientModal';

export const ClientsManagement = () => {
  console.log('ClientsManagement component rendering');
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
    resetClientPassword,
    generateTemporaryPassword,
    generateUsername,
    stats
  } = useSupabaseAdminClients();
  
  const { plans, getPlanById } = useSubscriptionPlans();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGroupsManager, setShowGroupsManager] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  // Filtered clients based on search and filters
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchesSearch = !searchTerm || 
        client.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.cnpj?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesGroup = filterGroup === 'all' || client.groupId === filterGroup;
      const matchesStatus = filterStatus === 'all' || client.status === filterStatus;
      
      return matchesSearch && matchesGroup && matchesStatus;
    });
  }, [clients, searchTerm, filterGroup, filterStatus]);

  // Pagination
  const pagination = usePagination(filteredClients, {
    initialPageSize: 10,
    pageSizeOptions: [5, 10, 20, 50]
  });

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

  // Ações do menu com prevenção de travamentos
  const handleViewClient = useCallback((client: any) => {
    console.log('Abrindo visualização do cliente:', client.id);
    setSelectedClient(client);
    setShowViewModal(true);
  }, []);

  const handleEditClient = useCallback((client: any) => {
    console.log('Abrindo edição do cliente:', client.id);
    setSelectedClient(client);
    setShowEditModal(true);
  }, []);

  const handleClientDocuments = useCallback((client: any) => {
    console.log('Abrindo documentos do cliente:', client.id);
    setSelectedClient(client);
    setShowDocumentsModal(true);
  }, []);

  const handleClientCredentials = useCallback((client: any) => {
    console.log('Abrindo credenciais do cliente:', client.id);
    setSelectedClient(client);
    setShowCredentialsModal(true);
  }, []);

  const [statusUpdating, setStatusUpdating] = useState<Set<string>>(new Set());
  
  const handleToggleClientStatus = useCallback(async (client: any) => {
    if (statusUpdating.has(client.id)) {
      console.log('Status já sendo atualizado para cliente:', client.id);
      return;
    }

    const newStatus = client.status === 'active' ? 'inactive' : 'active';
    setStatusUpdating(prev => new Set([...prev, client.id]));
    
    try {
      console.log('Alterando status do cliente:', client.id, 'para:', newStatus);
      await updateClient(client.id, { status: newStatus } as any);
    } catch (error) {
      console.error('Erro ao alterar status do cliente:', error);
    } finally {
      setStatusUpdating(prev => {
        const newSet = new Set(prev);
        newSet.delete(client.id);
        return newSet;
      });
    }
  }, [updateClient, statusUpdating]);

  const handleDeleteClient = useCallback((client: any) => {
    console.log('Abrindo exclusão do cliente:', client.id);
    setSelectedClient(client);
    setShowDeleteModal(true);
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-card px-6 py-4 flex-shrink-0">
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

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                {stats.byGroup.map((group, index) => (
                  <div key={`${group.name}-${index}`} className="flex items-center gap-2">
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
                  {clientGroups.filter(group => group.id && group.id.trim() !== '').map(group => (
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
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle>Lista de Clientes ({filteredClients.length})</CardTitle>
            <CardDescription>
              {filteredClients.length === clients.length 
                ? 'Todos os clientes cadastrados na plataforma'
                : `${filteredClients.length} de ${clients.length} clientes`
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            <div className="flex-1 overflow-auto">
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
                   {pagination.paginatedData.map((client) => (
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
                           <DropdownMenuItem 
                             onClick={(e) => {
                               e.preventDefault();
                               e.stopPropagation();
                               handleViewClient(client);
                             }}
                           >
                             <Eye className="h-4 w-4 mr-2" />
                             Visualizar
                           </DropdownMenuItem>
                           <DropdownMenuItem 
                             onClick={(e) => {
                               e.preventDefault();
                               e.stopPropagation();
                               handleEditClient(client);
                             }}
                           >
                             <Edit className="h-4 w-4 mr-2" />
                             Editar
                           </DropdownMenuItem>
                           <DropdownMenuItem 
                             onClick={(e) => {
                               e.preventDefault();
                               e.stopPropagation();
                               handleClientDocuments(client);
                             }}
                           >
                             <FileText className="h-4 w-4 mr-2" />
                             Documentos
                           </DropdownMenuItem>
                           <DropdownMenuItem 
                             onClick={(e) => {
                               e.preventDefault();
                               e.stopPropagation();
                               handleClientCredentials(client);
                             }}
                           >
                             <Shield className="h-4 w-4 mr-2" />
                             Credenciais
                           </DropdownMenuItem>
                           <DropdownMenuItem 
                             disabled={statusUpdating.has(client.id)}
                             onClick={(e) => {
                               e.preventDefault();
                               e.stopPropagation();
                               handleToggleClientStatus(client);
                             }}
                           >
                             {statusUpdating.has(client.id) ? (
                               <>
                                 <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900"></div>
                                 Atualizando...
                               </>
                             ) : client.status === 'active' ? (
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
                           <DropdownMenuItem 
                             className="text-red-600"
                             onClick={(e) => {
                               e.preventDefault();
                               e.stopPropagation();
                               handleDeleteClient(client);
                             }}
                           >
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

               {/* Empty state */}
               {pagination.paginatedData.length === 0 && (
                 <div className="flex flex-col items-center justify-center py-12">
                   <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                   <h3 className="text-lg font-medium text-muted-foreground mb-2">
                     {filteredClients.length === 0 ? 'Nenhum cliente encontrado' : 'Nenhum cliente nesta página'}
                   </h3>
                   <p className="text-sm text-muted-foreground">
                     {filteredClients.length === 0 
                       ? 'Tente ajustar os filtros ou criar um novo cliente'
                       : 'Navegue para outra página ou ajuste os filtros'
                     }
                   </p>
                 </div>
               )}
             </div>
             
             {/* Pagination integrada */}
             {filteredClients.length > 0 && (
               <div className="border-t px-6 py-4">
                 <DataTablePagination {...pagination} showCard={false} />
               </div>
             )}
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

      <ViewClientModal
        open={showViewModal}
        onOpenChange={setShowViewModal}
        client={selectedClient}
      />

      <EditClientModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        client={selectedClient}
        clientGroups={clientGroups}
        onUpdateClient={(id, data) => updateClient(id, data as any)}
      />

      <ClientCredentialsModal
        open={showCredentialsModal}
        onOpenChange={setShowCredentialsModal}
        client={selectedClient}
        onGenerateUsername={generateUsername}
        onGeneratePassword={generateTemporaryPassword}
        onResetPassword={resetClientPassword}
      />

      <ClientDocumentsModal
        open={showDocumentsModal}
        onOpenChange={setShowDocumentsModal}
        client={selectedClient}
      />

      <DeleteClientModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        client={selectedClient}
        onDeleteClient={deleteClient}
      />
    </div>
  );
};