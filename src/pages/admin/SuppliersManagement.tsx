import React, { useState, useMemo } from 'react';
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
import { useSupabaseSuppliers } from '@/hooks/useSupabaseSuppliers';
import { usePagination } from '@/hooks/usePagination';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { CreateSupplierModal } from '@/components/suppliers/CreateSupplierModal';

export const SuppliersManagement = () => {
  console.log('SuppliersManagement component rendering');
  const {
    suppliers,
    isLoading,
    createSupplier,
    updateSupplier,
    deleteSupplier
  } = useSupabaseSuppliers();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filtered suppliers based on search and filters
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(supplier => {
      const matchesSearch = !searchTerm || 
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.cnpj.includes(searchTerm) ||
        supplier.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (supplier.specialties && supplier.specialties.some(spec => 
          spec.toLowerCase().includes(searchTerm.toLowerCase())
        ));
      
      const matchesStatus = filterStatus === "all" || supplier.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [suppliers, searchTerm, filterStatus]);

  // Pagination
  const pagination = usePagination(filteredSuppliers, {
    initialPageSize: 10,
    pageSizeOptions: [5, 10, 20, 50]
  });

  const getSupplierStats = () => ({
    total: suppliers.length,
    active: suppliers.filter(s => s.status === "active").length,
    totalRevenue: 0,
    avgRating: suppliers.reduce((sum, s) => sum + s.rating, 0) / suppliers.length || 0,
    avgResponseTime: 24
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'suspended': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Truck className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{getSupplierStats().total}</p>
              <p className="text-xs text-muted-foreground">Total Fornecedores</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <UserCheck className="h-6 w-6 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold">{getSupplierStats().active}</p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Star className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl font-bold">{getSupplierStats().avgRating.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Avaliação Média</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-6 w-6 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold">{formatResponseTime(getSupplierStats().avgResponseTime)}</p>
              <p className="text-xs text-muted-foreground">Tempo Médio Resposta</p>
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
                    placeholder="Pesquisar por nome, CNPJ, email ou categoria..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              
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
            <CardTitle>Lista de Fornecedores ({filteredSuppliers.length})</CardTitle>
            <CardDescription>
              {filteredSuppliers.length === suppliers.length 
                ? 'Todos os fornecedores cadastrados na plataforma'
                : `${filteredSuppliers.length} de ${suppliers.length} fornecedores`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <p>Carregando fornecedores...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Avaliação</TableHead>
                    <TableHead>Região</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.paginatedData.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-muted">
                            <Truck className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{supplier.name}</p>
                            <p className="text-sm text-muted-foreground">{supplier.cnpj}</p>
                            {supplier.specialties && supplier.specialties.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {supplier.specialties.slice(0, 2).map((specialty) => (
                                  <Badge key={specialty} variant="outline" className="text-xs">
                                    {specialty}
                                  </Badge>
                                ))}
                                {supplier.specialties.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{supplier.specialties.length - 2}
                                  </Badge>
                                )}
                              </div>
                            )}
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
                        <Badge className={getStatusColor(supplier.status)}>
                          {supplier.status === 'active' ? 'Ativo' :
                           supplier.status === 'inactive' ? 'Inativo' : 
                           supplier.status === 'suspended' ? 'Suspenso' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          {renderStars(supplier.rating)}
                          <div className="text-xs text-muted-foreground">
                            {supplier.completed_orders} pedidos
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <span className="text-sm">{supplier.region || 'Não informado'}</span>
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
                              <Shield className="h-4 w-4 mr-2" />
                              Credenciais
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => updateSupplier(supplier.id, { 
                                status: supplier.status === 'active' ? 'inactive' : 'active' 
                              })}
                            >
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
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => deleteSupplier(supplier.id, supplier.name)}
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
            )}

            {/* Empty state */}
            {!isLoading && pagination.paginatedData.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <Truck className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  {filteredSuppliers.length === 0 ? 'Nenhum fornecedor encontrado' : 'Nenhum fornecedor nesta página'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {filteredSuppliers.length === 0 
                    ? 'Tente ajustar os filtros ou criar um novo fornecedor'
                    : 'Navegue para outra página ou ajuste os filtros'
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {!isLoading && filteredSuppliers.length > 0 && (
          <DataTablePagination {...pagination} />
        )}
      </div>

      {/* Modal */}
      <CreateSupplierModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateSupplier={createSupplier}
      />
    </div>
  );
};