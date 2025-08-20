import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Plus, 
  Truck, 
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
  Star,
  Clock,
  Award
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
import { useAdminSuppliers } from '@/hooks/useAdminSuppliers';
import { ComprehensiveSupplierModal } from '@/components/suppliers/ComprehensiveSupplierModal';
import { EnhancedGroupModal } from '@/components/suppliers/EnhancedGroupModal';

export const SuppliersManagement = () => {
  const {
    suppliers,
    supplierGroups,
    searchTerm,
    setSearchTerm,
    filterGroup,
    setFilterGroup,
    filterStatus,
    setFilterStatus,
    createSupplier,
    updateGroup,
    deleteGroup,
    createGroup,
    generateTemporaryPassword,
    generateUsername,
    stats
  } = useAdminSuppliers();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGroupsManager, setShowGroupsManager] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'suspended': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getGroupColor = (groupId?: string) => {
    const group = supplierGroups.find(g => g.id === groupId);
    return group?.color || 'gray';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatResponseTime = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}min`;
    if (hours < 24) return `${Math.round(hours)}h`;
    return `${Math.round(hours / 24)}d`;
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-3 w-3 ${
              i < Math.floor(rating) 
                ? 'fill-yellow-400 text-yellow-400' 
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-1">{rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gerenciamento de Fornecedores</h1>
            <p className="text-muted-foreground">Gerencie todos os fornecedores da plataforma</p>
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
              Novo Fornecedor
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Truck className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Fornecedores</p>
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
              <Star className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl font-bold">{stats.avgRating.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Avaliação Média</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-6 w-6 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold">{formatResponseTime(stats.avgResponseTime)}</p>
              <p className="text-xs text-muted-foreground">Tempo Médio Resposta</p>
            </CardContent>
          </Card>
        </div>

        {/* Top Rated Suppliers */}
        {stats.topRated.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                Fornecedores Melhor Avaliados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {stats.topRated.slice(0, 5).map((supplier) => (
                  <div key={supplier.id} className="flex items-center gap-3 bg-muted rounded-lg p-3">
                    <div className="p-2 bg-background rounded-full">
                      <Truck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{supplier.companyName}</p>
                      {renderStars(supplier.avgRating)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
                    placeholder="Pesquisar por nome, CNPJ, email ou categoria..."
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
                  {supplierGroups.map(group => (
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
                  <SelectItem value="suspended">Suspenso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Fornecedores */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Fornecedores ({suppliers.length})</CardTitle>
            <CardDescription>Todos os fornecedores cadastrados na plataforma</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Avaliação</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Último Acesso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-muted">
                          <Truck className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{supplier.companyName}</p>
                          <p className="text-sm text-muted-foreground">{supplier.cnpj}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {supplier.businessInfo.categories.slice(0, 2).map((category) => (
                              <Badge key={category} variant="outline" className="text-xs">
                                {category}
                              </Badge>
                            ))}
                            {supplier.businessInfo.categories.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{supplier.businessInfo.categories.length - 2}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span>{supplier.email}</span>
                        </div>
                        {supplier.phone && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{supplier.phone}</span>
                          </div>
                        )}
                        {supplier.website && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>Website</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {supplier.groupName ? (
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full bg-${getGroupColor(supplier.groupId)}-500`}></div>
                          <span className="text-sm">{supplier.groupName}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Sem grupo</span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <Badge className={getStatusColor(supplier.status)}>
                        {supplier.status === 'active' ? 'Ativo' :
                         supplier.status === 'inactive' ? 'Inativo' : 
                         supplier.status === 'suspended' ? 'Suspenso' : 'Pendente'}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        {renderStars(supplier.avgRating)}
                        <div className="text-xs text-muted-foreground">
                          {supplier.ratings.length} avaliação{supplier.ratings.length !== 1 ? 'ões' : ''}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-green-600">
                          {formatCurrency(supplier.financialInfo.revenue)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {supplier.financialInfo.quotesAccepted}/{supplier.financialInfo.quotesReceived} cotações
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {supplier.financialInfo.completionRate.toFixed(1)}% conclusão
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ⏱ {formatResponseTime(supplier.financialInfo.avgResponseTime)}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {supplier.lastAccess || 'Nunca'}
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
                            <Star className="h-4 w-4 mr-2" />
                            Avaliações
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            {supplier.status === 'active' ? (
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
      <ComprehensiveSupplierModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSupplierCreate={createSupplier}
        availableGroups={supplierGroups}
        onPasswordGenerate={generateTemporaryPassword}
        onUsernameGenerate={generateUsername}
      />
      
      <EnhancedGroupModal
        open={showGroupsManager}
        onOpenChange={setShowGroupsManager}
        onGroupCreate={createGroup}
        onGroupUpdate={updateGroup}
        onGroupDelete={deleteGroup}
        existingGroups={supplierGroups}
      />
    </div>
  );
};