// Página de Fornecedores - Sistema funcionando ✅
import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Filter, Edit, Trash2, Phone, Mail, Users, Building, UserPlus, Shield, MapPin, Star, ChevronLeft, ChevronRight, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FilterMetricCard } from "@/components/ui/filter-metric-card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { SupplierFormModal } from "@/components/suppliers/SupplierFormModal";
import { NewGroupModal } from "@/components/suppliers/NewGroupModal";
import { useSupabaseSuppliers } from "@/hooks/useSupabaseSuppliers";
import { useAuth } from "@/contexts/AuthContext";
import { PageLoader } from "@/components/ui/page-loader";
import { useToast } from "@/hooks/use-toast";
import { STANDARD_SPECIALTIES } from "@/components/common/SpecialtiesInput";

export default function Suppliers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [specialtyFilter, setSpecialtyFilter] = useState<string[]>([]);
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
    const isLocal = supplier.type === 'local';
    const isAssociated = supplier.association_status === 'active';
    const isCertified = supplier.type === 'certified';
    
    // Admin pode editar tudo
    // Cliente só edita locais ativamente associados
    // Certificados não podem ser editados por clientes
    if (isAdmin) return true;
    if (isCertified) return false;
    return isLocal && isAssociated;
  };

  const canDeleteSupplier = (supplier: any) => {
    const isAdmin = user?.role === 'admin';
    const isLocal = supplier.type === 'local';
    const isAssociated = supplier.association_status === 'active';
    const isCertified = supplier.type === 'certified';
    
    // Admin pode remover tudo
    // Cliente só remove locais associados
    // Certificados não podem ser removidos por clientes
    if (isAdmin) return true;
    if (isCertified) return false;
    return isLocal && isAssociated;
  };

  // Função para filtrar fornecedores baseado no cliente atual
  const getAvailableSuppliers = () => {
    return suppliers.filter(supplier => {
      // Por enquanto retornar todos, pois os tipos do Supabase são diferentes
      return true;
    });
  };

  const availableSuppliers = getAvailableSuppliers();

  // Calcular distribuição de especialidades para o contador
  const specialtyDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    availableSuppliers.forEach(s => {
      s.specialties?.forEach(sp => {
        counts[sp] = (counts[sp] || 0) + 1;
      });
    });
    return counts;
  }, [availableSuppliers]);

  const filteredSuppliers = availableSuppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (supplier.document_number && supplier.document_number.includes(searchTerm)) ||
                         supplier.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesFilter = true;
    if (activeFilter === "active") {
      matchesFilter = supplier.status === "active";
    } else if (activeFilter === "inactive") {
      matchesFilter = supplier.status !== "active";
    }
    
    // Filtro por especialidades
    const matchesSpecialty = specialtyFilter.length === 0 || 
      (supplier.specialties && specialtyFilter.some(sf => supplier.specialties?.includes(sf)));
    
    return matchesSearch && matchesFilter && matchesSpecialty;
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
  }, [searchTerm, activeFilter, specialtyFilter]);

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
      <div className="flex flex-col gap-4 animate-fade-in">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight animate-fade-in" style={{ animationDelay: '0.1s', opacity: 0, animationFillMode: 'forwards' }}>
            Fornecedores
          </h1>
          <p className="text-sm md:text-base text-muted-foreground animate-fade-in" style={{ animationDelay: '0.2s', opacity: 0, animationFillMode: 'forwards' }}>
            Gerencie sua rede de fornecedores e parceiros
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 animate-fade-in w-full" style={{ animationDelay: '0.3s', opacity: 0, animationFillMode: 'forwards' }}>
            <Button 
              variant="outline"
              className="flex items-center gap-2 justify-center w-full sm:w-auto"
              onClick={() => setShowNewGroupModal(true)}
            >
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Criar Grupo</span>
              <span className="sm:hidden">Grupo</span>
            </Button>
            <Button 
              className="btn-corporate flex items-center gap-2 justify-center w-full sm:w-auto sm:ml-auto"
              onClick={() => setShowNewSupplierModal(true)}
            >
              <Plus className="h-4 w-4" />
              Novo Fornecedor
            </Button>
        </div>
      </div>

      {/* Filter Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 md:gap-4">
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
              
              {/* Filtro de Especialidades */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Wrench className="h-4 w-4" />
                    <span className="hidden sm:inline">Especialidades</span>
                    {specialtyFilter.length > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {specialtyFilter.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[280px] max-h-[400px] overflow-y-auto">
            {STANDARD_SPECIALTIES.map(specialty => (
              <DropdownMenuCheckboxItem
                key={specialty}
                checked={specialtyFilter.includes(specialty)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSpecialtyFilter([...specialtyFilter, specialty]);
                  } else {
                    setSpecialtyFilter(specialtyFilter.filter(s => s !== specialty));
                  }
                }}
              >
                <span className="flex-1">{specialty}</span>
                {specialtyDistribution[specialty] && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {specialtyDistribution[specialty]}
                  </Badge>
                )}
              </DropdownMenuCheckboxItem>
            ))}
                  {specialtyFilter.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full"
                        onClick={() => setSpecialtyFilter([])}
                      >
                        Limpar filtros
                      </Button>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              
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
                      {supplier.type === 'local' && supplier.document_number && (
                        <p className="text-sm text-muted-foreground font-mono">
                          {supplier.document_type === 'cpf' ? 'CPF: ' : 'CNPJ: '}{supplier.document_number}
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

                  {/* Specialties Tags */}
                  {supplier.specialties && supplier.specialties.length > 0 && (
                    <div className="pt-2 border-t border-border">
                      <div className="flex items-start gap-2">
                        <Wrench className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex flex-wrap gap-1">
                          {supplier.specialties.slice(0, 3).map((specialty) => (
                            <Badge 
                              key={specialty} 
                              variant="outline" 
                              className="text-xs bg-primary/5 text-primary border-primary/20"
                            >
                              {specialty}
                            </Badge>
                          ))}
                          {supplier.specialties.length > 3 && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              +{supplier.specialties.length - 3} mais
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Date Added */}
                  <div className="pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {supplier.type === 'certified' ? 'Certificado desde:' : 'Associado em:'}
                      </span>
                      <span className="text-sm">
                        {new Date(
                          supplier.type === 'certified' 
                            ? (supplier.certification_date || supplier.created_at)
                            : (supplier.associated_at || supplier.created_at)
                        ).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>

                   {/* Actions */}
                   <div className="flex gap-2 pt-2">
                     {supplier.type === 'certified' ? (
                       // Certificados: apenas visualização (sem botões de ação para clientes)
                       user?.role === 'admin' && (
                         <Button 
                           variant="outline" 
                           size="sm" 
                           className="flex-1"
                           onClick={() => handleEditSupplier(supplier)}
                         >
                           <Edit className="h-4 w-4 mr-2" />
                           Editar (Admin)
                         </Button>
                       )
                     ) : (
                       // Locais: pode editar/excluir se associado
                       <>
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
                       </>
                     )}
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
          refetch();
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