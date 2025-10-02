// Página de Fornecedores - Sistema funcionando ✅
import { useState, useEffect } from "react";
import { Plus, Search, Filter, Edit, Trash2, Phone, Mail, MessageCircle, Users, Building, UserPlus, Shield, MapPin, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FilterMetricCard } from "@/components/ui/filter-metric-card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SupplierFormModal } from "@/components/suppliers/SupplierFormModal";
import { NewGroupModal } from "@/components/suppliers/NewGroupModal";
import { useSupabaseSuppliers } from "@/hooks/useSupabaseSuppliers";
import { useAuth } from "@/contexts/AuthContext";
import { PageLoader } from "@/components/ui/page-loader";
import { AnimatedHeader, AnimatedGrid, AnimatedSection } from '@/components/ui/animated-page';
import { useToast } from "@/hooks/use-toast";

export default function Suppliers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  const { user } = useAuth();
  const { suppliers, isLoading, refetch, createSupplier, updateSupplier, deleteSupplier } = useSupabaseSuppliers();
  const { toast } = useToast();
  
  // Load suppliers on component mount
  useEffect(() => {
    refetch();
  }, []);

  const currentClientId = user?.clientId || '';
  const currentClientRegion = 'São Paulo - Capital';

  // Helper function para verificar permissões de edição/exclusão
  const canEditSupplier = (supplier: any) => {
    const isAdmin = user?.role === 'admin';
    const isOwnLocal = supplier.type === 'local' && supplier.client_id === user?.clientId;
    return isAdmin || isOwnLocal;
  };

  const canDeleteSupplier = (supplier: any) => {
    const isAdmin = user?.role === 'admin';
    const isOwnLocal = supplier.type === 'local' && supplier.client_id === user?.clientId;
    return isAdmin || isOwnLocal;
  };

  // Função para filtrar fornecedores baseado no cliente atual
  const getAvailableSuppliers = () => {
    return suppliers.filter(supplier => {
      // Por enquanto retornar todos, pois os tipos do Supabase são diferentes
      return true;
    });
  };

  const availableSuppliers = getAvailableSuppliers();

  const filteredSuppliers = availableSuppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (supplier.cnpj && supplier.cnpj.includes(searchTerm)) ||
                         supplier.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesFilter = true;
    if (activeFilter === "active") {
      matchesFilter = supplier.status === "active";
    } else if (activeFilter === "inactive") {
      matchesFilter = supplier.status !== "active";
    }
    
    return matchesSearch && matchesFilter;
  });

  // Calculate metrics
  const totalSuppliers = availableSuppliers.length;
  const activeSuppliers = availableSuppliers.filter(s => s.status === 'active').length;
  const localSuppliers = availableSuppliers.filter(s => s.type === 'local').length;
  const globalSuppliers = availableSuppliers.filter(s => s.type === 'certified').length;
  const prioritySuppliers = availableSuppliers.filter(s => s.rating > 4).length;

  
  const handleEditSupplier = (supplier: any) => {
    if (!canEditSupplier(supplier)) {
      toast({
        title: 'Ação não permitida',
        description: supplier.type === 'certified' 
          ? 'Fornecedores certificados só podem ser editados pelo SuperAdmin.'
          : 'Você só pode editar fornecedores locais do seu cliente.',
        variant: 'destructive'
      });
      return;
    }
    console.log('Editando fornecedor:', supplier.name, supplier.type);
    setEditingSupplier(supplier);
    setShowNewSupplierModal(true);
  };
  
  const handleDeleteSupplier = async (supplier: any) => {
    if (!canDeleteSupplier(supplier)) {
      toast({
        title: 'Ação não permitida',
        description: supplier.type === 'certified'
          ? 'Fornecedores certificados só podem ser removidos pelo SuperAdmin.'
          : 'Você só pode excluir fornecedores locais do seu cliente.',
        variant: 'destructive'
      });
      return;
    }

    // Show confirmation dialog - simple and direct
    const confirmed = window.confirm(`Tem certeza que deseja remover "${supplier.name}" da sua lista?`);
    
    if (!confirmed) return;
    await deleteSupplier(supplier.id, supplier.name);
  };
  
  const handleCloseModal = () => {
    setShowNewSupplierModal(false);
    setEditingSupplier(null);
  };
  
  // Cálculos de paginação
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSuppliers = filteredSuppliers.slice(startIndex, endIndex);

  // Reset da página quando filtros mudam
  const resetPage = () => {
    setCurrentPage(1);
  };

  // Resetar página quando filtros mudam
  useEffect(() => {
    resetPage();
  }, [searchTerm, activeFilter]);

  const handleGroupCreate = () => {
    console.log('Group created');
  };

  const handleGroupDelete = () => {
    console.log('Group deleted');
  };

  const getGroupName = () => {
    return null;
  };

  const statusOptions = [
    { value: "all", label: "Todos" },
    { value: "active", label: "Ativo" },
    { value: "inactive", label: "Inativo" },
  ];

  if (isLoading) {
    return (
      <PageLoader
        hasHeader={true}
        hasMetrics={true}
        hasSearch={true}
        hasGrid={true}
        gridColumns={3}
        metricsCount={5}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight animate-fade-in" style={{ animationDelay: '0.1s', opacity: 0, animationFillMode: 'forwards' }}>
            Fornecedores
          </h1>
          <p className="text-muted-foreground animate-fade-in" style={{ animationDelay: '0.2s', opacity: 0, animationFillMode: 'forwards' }}>
            Gerencie sua rede de fornecedores e parceiros
          </p>
        </div>
        <div className="flex gap-2 animate-fade-in" style={{ animationDelay: '0.3s', opacity: 0, animationFillMode: 'forwards' }}>
            <Button 
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => setShowNewGroupModal(true)}
            >
              <UserPlus className="h-4 w-4" />
              Criar Grupo
            </Button>
            <Button 
              className="btn-corporate flex items-center gap-2"
              onClick={() => setShowNewSupplierModal(true)}
            >
              <Plus className="h-4 w-4" />
              Novo Fornecedor
            </Button>
        </div>
      </div>

      {/* Filter Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="animate-scale-in" style={{ animationDelay: '0.1s', opacity: 0, animationFillMode: 'forwards' }}>
          <FilterMetricCard
            title="Total"
            value={totalSuppliers}
            icon={<Users />}
            isActive={activeFilter === "all"}
            onClick={() => setActiveFilter("all")}
            variant="default"
          />
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.15s', opacity: 0, animationFillMode: 'forwards' }}>
          <FilterMetricCard
            title="Ativos"
            value={activeSuppliers}
            icon={<Shield />}
            isActive={activeFilter === "active"}
            onClick={() => setActiveFilter("active")}
            variant="success"
          />
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.2s', opacity: 0, animationFillMode: 'forwards' }}>
          <FilterMetricCard
            title="Locais"
            value={localSuppliers}
            icon={<MapPin />}
            isActive={activeFilter === "local"}
            onClick={() => setActiveFilter("local")}
            variant="default"
          />
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.25s', opacity: 0, animationFillMode: 'forwards' }}>
          <FilterMetricCard
            title="Certificados"
            value={globalSuppliers}
            icon={<Building />}
            isActive={activeFilter === "global"}
            onClick={() => setActiveFilter("global")}
            variant="default"
          />
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.3s', opacity: 0, animationFillMode: 'forwards' }}>
          <FilterMetricCard
            title="Prioritários"
            value={prioritySuppliers}
            icon={<Star />}
            isActive={activeFilter === "priority"}
            onClick={() => setActiveFilter("priority")}
            variant="warning"
          />
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="card-corporate animate-fade-in" style={{ animationDelay: '0.4s' }}>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nome, CNPJ ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Grid */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentSuppliers.map((supplier) => (
            <TooltipProvider key={supplier.id}>
              <Card className="card-corporate hover:shadow-[var(--shadow-dropdown)] transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg">{supplier.name}</CardTitle>
                        {supplier.type === 'certified' ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200 cursor-help">
                                <Shield className="h-3 w-3 mr-1" />
                                Certificado
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Fornecedor passou por análise criteriosa da plataforma</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            Local
                          </Badge>
                        )}
                      </div>
                      {supplier.type === 'local' && (
                        <p className="text-sm text-muted-foreground font-mono">
                          {supplier.cnpj}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={supplier.status === 'active' ? 'bg-success text-white' : 'bg-muted text-foreground'}>
                        {supplier.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                      {supplier.rating && (
                        <div className="flex items-center gap-1 text-xs">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{supplier.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                   {/* Contact Info for local suppliers */}
                   <div className="space-y-2">
                     <div className="flex items-center gap-2 text-sm">
                       <Mail className="h-4 w-4 text-muted-foreground" />
                       <span className="truncate">{supplier.email}</span>
                     </div>
                     {supplier.phone && (
                       <div className="flex items-center gap-2 text-sm">
                         <Phone className="h-4 w-4 text-muted-foreground" />
                         <span>{supplier.phone}</span>
                       </div>
                     )}
                   </div>

                  {/* Date Added */}
                  <div className="pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Cadastrado em:</span>
                      <span className="text-sm">
                        {new Date(supplier.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>

                   {/* Actions */}
                   <div className="flex gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleEditSupplier(supplier)}
                        disabled={!canEditSupplier(supplier)}
                       >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                         onClick={() => handleDeleteSupplier(supplier)}
                         disabled={!canDeleteSupplier(supplier)}
                         className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:text-gray-400"
                      >
                       <Trash2 className="h-4 w-4" />
                     </Button>
                   </div>
                </CardContent>
              </Card>
            </TooltipProvider>
          ))}
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Mostrando {startIndex + 1} a {Math.min(endIndex, filteredSuppliers.length)} de {filteredSuppliers.length} fornecedores
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-10"
                  >
                    {page}
                  </Button>
                ))}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Empty State */}
      {!isLoading && filteredSuppliers.length === 0 && (
        <Card className="card-corporate">
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum fornecedor encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== "all" 
                ? "Tente ajustar os filtros de busca"
                : "Comece cadastrando seu primeiro fornecedor"
              }
            </p>
            {!searchTerm && statusFilter === "all" && (
              <Button 
                className="btn-corporate"
                onClick={() => setShowNewSupplierModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Primeiro Fornecedor
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <SupplierFormModal
        open={showNewSupplierModal}
        onClose={() => {
          handleCloseModal();
          refetch(); // Refresh suppliers list after modal closes
        }}
        editingSupplier={editingSupplier}
      />

      <NewGroupModal
        open={showNewGroupModal}
        onOpenChange={setShowNewGroupModal}
        onGroupCreate={handleGroupCreate}
        existingGroups={[]}
        onGroupDelete={handleGroupDelete}
      />
    </div>
  );
}