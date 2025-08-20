import { useState, useEffect } from "react";
import { Plus, Search, Filter, Edit, Trash2, Phone, Mail, MessageCircle, Users, Building, UserPlus, Globe, MapPin, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FilterMetricCard } from "@/components/ui/filter-metric-card";
import { NewSupplierModal } from "@/components/suppliers/NewSupplierModal";
import { NewGroupModal } from "@/components/suppliers/NewGroupModal";
import { mockSuppliers, mockSupplierGroups, getStatusColor, getStatusText, Supplier, SupplierGroup } from "@/data/mockData";

export default function Suppliers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all"); // Novo filtro para tipo
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [suppliers, setSuppliers] = useState(mockSuppliers);
  const [supplierGroups, setSupplierGroups] = useState(mockSupplierGroups);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9; // 3x3 grid confortável

  // Mock do cliente atual - em produção virá do contexto/auth
  const currentClientId = '1';
  const currentClientRegion = 'São Paulo - Capital';

  // Função para filtrar fornecedores baseado no cliente atual
  const getAvailableSuppliers = () => {
    return suppliers.filter(supplier => {
      // Fornecedores locais: apenas os do cliente atual
      if (supplier.type === 'local') {
        return supplier.clientId === currentClientId;
      }
      // Fornecedores globais: todos disponíveis
      return supplier.type === 'global';
    }).sort((a, b) => {
      // Priorizar fornecedores da mesma região
      if (a.type === 'global' && b.type === 'global') {
        const aMatchesRegion = a.region === currentClientRegion;
        const bMatchesRegion = b.region === currentClientRegion;
        
        if (aMatchesRegion && !bMatchesRegion) return -1;
        if (!aMatchesRegion && bMatchesRegion) return 1;
        
        // Se ambos ou nenhum da mesma região, ordenar por rating
        return (b.rating || 0) - (a.rating || 0);
      }
      
      // Fornecedores locais vêm primeiro
      if (a.type === 'local' && b.type === 'global') return -1;
      if (a.type === 'global' && b.type === 'local') return 1;
      
      return 0;
    });
  };

  const availableSuppliers = getAvailableSuppliers();

  const filteredSuppliers = availableSuppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.cnpj.includes(searchTerm) ||
                         supplier.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesFilter = true;
    if (activeFilter === "active") {
      matchesFilter = supplier.status === "active";
    } else if (activeFilter === "inactive") {
      matchesFilter = supplier.status === "inactive";
    } else if (activeFilter === "local") {
      matchesFilter = supplier.type === "local";
    } else if (activeFilter === "global") {
      matchesFilter = supplier.type === "global";
    } else if (activeFilter === "priority") {
      // Fornecedores prioritários: locais + globais da mesma região
      matchesFilter = supplier.type === "local" || 
                     (supplier.type === "global" && supplier.region === currentClientRegion);
    } else if (activeFilter === "recent") {
      const createdDate = new Date(supplier.createdAt);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      matchesFilter = createdDate >= thirtyDaysAgo;
    }
    
    return matchesSearch && matchesFilter;
  });

  // Calculate metrics
  const totalSuppliers = availableSuppliers.length;
  const activeSuppliers = availableSuppliers.filter(s => s.status === 'active').length;
  const localSuppliers = availableSuppliers.filter(s => s.type === 'local').length;
  const globalSuppliers = availableSuppliers.filter(s => s.type === 'global').length;
  const prioritySuppliers = availableSuppliers.filter(s => 
    s.type === 'local' || (s.type === 'global' && s.region === currentClientRegion)
  ).length;

  const handleSupplierCreate = (newSupplier: Supplier) => {
    if (editingSupplier) {
      // Atualizar fornecedor existente
      setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? newSupplier : s));
    } else {
      // Criar novo fornecedor
      setSuppliers(prev => [...prev, newSupplier]);
    }
    setEditingSupplier(null);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    console.log('Editando fornecedor:', supplier.name, supplier.type);
    setEditingSupplier(supplier);
    setShowNewSupplierModal(true);
  };

  const handleDeleteSupplier = (supplier: Supplier) => {
    if (supplier.type === 'global') {
      alert('Fornecedores globais só podem ser excluídos pelo administrador');
      return;
    }

    if (window.confirm(`Tem certeza que deseja excluir o fornecedor "${supplier.name}"?`)) {
      setSuppliers(prev => prev.filter(s => s.id !== supplier.id));
      // Se estava na última página e ficou vazia, volta uma página
      const remainingSuppliers = filteredSuppliers.filter(s => s.id !== supplier.id);
      const maxPage = Math.ceil(remainingSuppliers.length / itemsPerPage);
      if (currentPage > maxPage && maxPage > 0) {
        setCurrentPage(maxPage);
      }
    }
  };

  const handleCloseModal = () => {
    console.log('Fechando modal, resetando editingSupplier');
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

  const handleGroupCreate = (newGroup: SupplierGroup) => {
    setSupplierGroups(prev => [...prev, newGroup]);
  };

  const handleGroupDelete = (groupId: string) => {
    setSupplierGroups(prev => prev.filter(group => group.id !== groupId));
    // Also remove the group reference from suppliers
    setSuppliers(prev => prev.map(supplier => 
      supplier.groupId === groupId 
        ? { ...supplier, groupId: undefined }
        : supplier
    ));
  };

  const getGroupName = (groupId?: string) => {
    if (!groupId) return null;
    const group = supplierGroups.find(g => g.id === groupId);
    return group;
  };

  const statusOptions = [
    { value: "all", label: "Todos" },
    { value: "active", label: "Ativo" },
    { value: "inactive", label: "Inativo" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fornecedores</h1>
          <p className="text-muted-foreground">
            Gerencie sua rede de fornecedores e parceiros
          </p>
        </div>
        <div className="flex gap-2">
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <FilterMetricCard
          title="Total"
          value={totalSuppliers}
          isActive={activeFilter === "all"}
          onClick={() => setActiveFilter("all")}
          colorClass="text-foreground"
        />
        <FilterMetricCard
          title="Ativos"
          value={activeSuppliers}
          isActive={activeFilter === "active"}
          onClick={() => setActiveFilter("active")}
          colorClass="text-green-600"
        />
        <FilterMetricCard
          title="Locais"
          value={localSuppliers}
          isActive={activeFilter === "local"}
          onClick={() => setActiveFilter("local")}
          colorClass="text-blue-600"
        />
        <FilterMetricCard
          title="Globais"
          value={globalSuppliers}
          isActive={activeFilter === "global"}
          onClick={() => setActiveFilter("global")}
          colorClass="text-purple-600"
        />
        <FilterMetricCard
          title="Prioritários"
          value={prioritySuppliers}
          isActive={activeFilter === "priority"}
          onClick={() => setActiveFilter("priority")}
          colorClass="text-orange-600"
        />
      </div>

      {/* Filters and Search */}
      <Card className="card-corporate">
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
          <Card key={supplier.id} className="card-corporate hover:shadow-[var(--shadow-dropdown)] transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-lg">{supplier.name}</CardTitle>
                    {supplier.type === 'global' ? (
                      <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                        <Globe className="h-3 w-3 mr-1" />
                        Global
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        Local
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">
                    {supplier.cnpj}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={getStatusColor(supplier.status)}>
                    {getStatusText(supplier.status)}
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
              {/* Group */}
              {supplier.groupId && getGroupName(supplier.groupId) && (
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getGroupName(supplier.groupId)?.color}`}></div>
                  <span className="text-sm font-medium">{getGroupName(supplier.groupId)?.name}</span>
                </div>
              )}

              {/* Region/Priority Badge para Globais */}
              {supplier.type === 'global' && supplier.region && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{supplier.region}</span>
                  {supplier.region === currentClientRegion && (
                    <Badge variant="default" className="text-xs bg-orange-100 text-orange-700 border-orange-200">
                      Região Prioritária
                    </Badge>
                  )}
                </div>
              )}

              {/* Stats para fornecedores com histórico */}
              {supplier.completedOrders && supplier.completedOrders > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pedidos completados:</span>
                  <span className="font-medium">{supplier.completedOrders}</span>
                </div>
              )}

              {/* Specialties */}
              {supplier.specialties && supplier.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {supplier.specialties.slice(0, 2).map((specialty) => (
                    <Badge key={specialty} variant="secondary" className="text-xs">
                      {specialty}
                    </Badge>
                  ))}
                  {supplier.specialties.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{supplier.specialties.length - 2}
                    </Badge>
                  )}
                </div>
              )}

              {/* Address */}
              {supplier.address && (
                <div className="flex items-start gap-2 text-sm">
                  <Building className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-muted-foreground line-clamp-2">{supplier.address}</span>
                </div>
              )}

              {/* Contact Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{supplier.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{supplier.phone}</span>
                </div>
                {supplier.whatsapp && (
                  <div className="flex items-center gap-2 text-sm">
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    <span>{supplier.whatsapp}</span>
                  </div>
                )}
              </div>

              {/* Date Added */}
              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Cadastrado em:</span>
                  <span className="text-sm">
                    {new Date(supplier.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {/* Botão Editar - apenas para fornecedores locais */}
                {supplier.type === 'local' ? (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleEditSupplier(supplier)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 cursor-not-allowed opacity-50" 
                    disabled
                    title="Fornecedores globais são gerenciados pelo administrador"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                )}
                
                {/* Botão Excluir - apenas para fornecedores locais */}
                {supplier.type === 'local' ? (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDeleteSupplier(supplier)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="cursor-not-allowed opacity-50" 
                    disabled
                    title="Fornecedores globais são gerenciados pelo administrador"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
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
      {filteredSuppliers.length === 0 && (
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

      {/* New Supplier Modal */}
      <NewSupplierModal
        open={showNewSupplierModal}
        onOpenChange={handleCloseModal}
        onSupplierCreate={handleSupplierCreate}
        availableGroups={supplierGroups}
        editingSupplier={editingSupplier}
      />

      {/* New Group Modal */}
      <NewGroupModal
        open={showNewGroupModal}
        onOpenChange={setShowNewGroupModal}
        onGroupCreate={handleGroupCreate}
        existingGroups={supplierGroups}
        onGroupDelete={handleGroupDelete}
      />
    </div>
  );
}