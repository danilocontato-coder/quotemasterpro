/**
 * FornecedoresPage - Módulo Completo de Gestão de Fornecedores da Administradora
 * @version 2.0.0 - CRUD completo, tabs, fornecedores locais e certificados
 */
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Search, Users, Building2, Award, Loader2 } from 'lucide-react';
import { useAdministradoraSuppliersManagement } from '@/hooks/useAdministradoraSuppliersManagement';
import { AdministradoraSupplierCard } from '@/components/administradora/suppliers/AdministradoraSupplierCard';
import { CreateLocalSupplierModal } from '@/components/administradora/suppliers/CreateLocalSupplierModal';
import { EditLocalSupplierModal } from '@/components/administradora/suppliers/EditLocalSupplierModal';

export default function FornecedoresPage() {
  const {
    suppliers,
    isLoading,
    createLocalSupplier,
    updateLocalSupplier,
    deleteLocalSupplier,
    toggleSupplierStatus,
    linkCertifiedSupplier,
    unlinkCertifiedSupplier,
  } = useAdministradoraSuppliersManagement();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<any>(null);

  // Separar fornecedores por origem
  const localSuppliers = useMemo(
    () => suppliers.filter((s) => s.source === 'administradora'),
    [suppliers]
  );

  const condominioSuppliers = useMemo(
    () => suppliers.filter((s) => s.source === 'condominio'),
    [suppliers]
  );

  const certifiedSuppliers = useMemo(
    () => suppliers.filter((s) => s.source === 'certified'),
    [suppliers]
  );

  // Filtrar fornecedores locais
  const filteredLocalSuppliers = useMemo(() => {
    return localSuppliers.filter((supplier) => {
      const matchesSearch =
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.cnpj.includes(searchTerm) ||
        supplier.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' || supplier.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [localSuppliers, searchTerm, statusFilter]);

  // Filtrar fornecedores dos condomínios
  const filteredCondominioSuppliers = useMemo(() => {
    return condominioSuppliers.filter((supplier) => {
      return (
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.cnpj.includes(searchTerm) ||
        supplier.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.condominio_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [condominioSuppliers, searchTerm]);

  // Filtrar fornecedores certificados
  const filteredCertifiedSuppliers = useMemo(() => {
    return certifiedSuppliers.filter((supplier) => {
      return (
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.cnpj.includes(searchTerm) ||
        supplier.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [certifiedSuppliers, searchTerm]);

  const handleEdit = (supplier: any) => {
    setSelectedSupplier(supplier);
    setShowEditModal(true);
  };

  const handleDelete = (supplier: any) => {
    setSupplierToDelete(supplier);
  };

  const confirmDelete = async () => {
    if (supplierToDelete) {
      await deleteLocalSupplier(supplierToDelete.id, supplierToDelete.name);
      setSupplierToDelete(null);
    }
  };

  const handleToggleStatus = async (supplier: any) => {
    await toggleSupplierStatus(supplier.id, supplier.status);
  };

  const handleLink = async (supplier: any) => {
    await linkCertifiedSupplier(supplier.id);
  };

  const handleUnlink = async (supplier: any) => {
    await unlinkCertifiedSupplier(supplier.id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Fornecedores</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie seus fornecedores locais, visualize fornecedores dos condomínios e acesse fornecedores certificados
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meus Fornecedores</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{localSuppliers.length}</div>
            <p className="text-xs text-muted-foreground">
              {localSuppliers.filter((s) => s.status === 'active').length} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dos Condomínios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{condominioSuppliers.length}</div>
            <p className="text-xs text-muted-foreground">Fornecedores vinculados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certificados</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{certifiedSuppliers.length}</div>
            <p className="text-xs text-muted-foreground">
              {certifiedSuppliers.filter((s) => s.is_linked).length} vinculados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar por nome, CNPJ ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="local" className="space-y-4">
        <TabsList>
          <TabsTrigger value="local">
            Meus Fornecedores ({filteredLocalSuppliers.length})
          </TabsTrigger>
          <TabsTrigger value="condominio">
            Dos Condomínios ({filteredCondominioSuppliers.length})
          </TabsTrigger>
          <TabsTrigger value="certified">
            Certificados ({filteredCertifiedSuppliers.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab: Meus Fornecedores */}
        <TabsContent value="local" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Fornecedor
            </Button>
          </div>

          {filteredLocalSuppliers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Nenhum fornecedor encontrado com os filtros aplicados'
                    : 'Nenhum fornecedor cadastrado ainda'}
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Cadastrar Primeiro Fornecedor
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredLocalSuppliers.map((supplier) => (
                <AdministradoraSupplierCard
                  key={supplier.id}
                  supplier={supplier}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggleStatus={handleToggleStatus}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Fornecedores dos Condomínios */}
        <TabsContent value="condominio" className="space-y-4">
          {filteredCondominioSuppliers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  {searchTerm
                    ? 'Nenhum fornecedor encontrado'
                    : 'Nenhum fornecedor cadastrado pelos condomínios'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredCondominioSuppliers.map((supplier) => (
                <AdministradoraSupplierCard
                  key={supplier.id}
                  supplier={supplier}
                  readOnly
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Fornecedores Certificados */}
        <TabsContent value="certified" className="space-y-4">
          {filteredCertifiedSuppliers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Award className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  Nenhum fornecedor certificado disponível
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredCertifiedSuppliers.map((supplier) => (
                <AdministradoraSupplierCard
                  key={supplier.id}
                  supplier={supplier}
                  onLink={handleLink}
                  onUnlink={handleUnlink}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <CreateLocalSupplierModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onCreateSupplier={createLocalSupplier}
      />

      <EditLocalSupplierModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        supplier={selectedSupplier}
        onUpdateSupplier={updateLocalSupplier}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!supplierToDelete} onOpenChange={() => setSupplierToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o fornecedor "{supplierToDelete?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
