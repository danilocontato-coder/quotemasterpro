import { useState } from "react";
import { Plus, Search, Filter, Eye, Edit, Trash2, Phone, Mail, MessageCircle, Users, Building, UserPlus } from "lucide-react";
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
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [suppliers, setSuppliers] = useState(mockSuppliers);
  const [supplierGroups, setSupplierGroups] = useState(mockSupplierGroups);

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.cnpj.includes(searchTerm) ||
                         supplier.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesFilter = true;
    if (activeFilter === "active") {
      matchesFilter = supplier.status === "active";
    } else if (activeFilter === "inactive") {
      matchesFilter = supplier.status === "inactive";
    } else if (activeFilter === "recent") {
      const createdDate = new Date(supplier.createdAt);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      matchesFilter = createdDate >= thirtyDaysAgo;
    }
    
    return matchesSearch && matchesFilter;
  });

  // Calculate metrics
  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter(s => s.status === 'active').length;
  const inactiveSuppliers = suppliers.filter(s => s.status === 'inactive').length;
  const recentSuppliers = suppliers.filter(s => {
    const createdDate = new Date(s.createdAt);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return createdDate >= thirtyDaysAgo;
  }).length;

  const handleSupplierCreate = (newSupplier: Supplier) => {
    setSuppliers(prev => [...prev, newSupplier]);
  };

  const handleGroupCreate = (newGroup: SupplierGroup) => {
    setSupplierGroups(prev => [...prev, newGroup]);
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          title="Inativos"
          value={inactiveSuppliers}
          isActive={activeFilter === "inactive"}
          onClick={() => setActiveFilter("inactive")}
          colorClass="text-red-600"
        />
        <FilterMetricCard
          title="Recentes"
          value={recentSuppliers}
          isActive={activeFilter === "recent"}
          onClick={() => setActiveFilter("recent")}
          colorClass="text-blue-600"
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSuppliers.map((supplier) => (
          <Card key={supplier.id} className="card-corporate hover:shadow-[var(--shadow-dropdown)] transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{supplier.name}</CardTitle>
                  <p className="text-sm text-muted-foreground font-mono mt-1">
                    {supplier.cnpj}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Badge className={getStatusColor(supplier.status)}>
                    {getStatusText(supplier.status)}
                  </Badge>
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
                <Button variant="outline" size="sm" className="flex-1">
                  <Eye className="h-4 w-4 mr-2" />
                  Ver
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button variant="outline" size="sm">
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
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
        onOpenChange={setShowNewSupplierModal}
        onSupplierCreate={handleSupplierCreate}
        availableGroups={supplierGroups}
      />

      {/* New Group Modal */}
      <NewGroupModal
        open={showNewGroupModal}
        onOpenChange={setShowNewGroupModal}
        onGroupCreate={handleGroupCreate}
      />
    </div>
  );
}