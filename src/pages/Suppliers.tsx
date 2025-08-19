import { useState } from "react";
import { Plus, Search, Filter, Eye, Edit, Trash2, Phone, Mail, MessageCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockSuppliers, getStatusColor, getStatusText } from "@/data/mockData";

export default function Suppliers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredSuppliers = mockSuppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.cnpj.includes(searchTerm) ||
                         supplier.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || supplier.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusOptions = [
    { value: "all", label: "Todos" },
    { value: "active", label: "Ativo" },
    { value: "inactive", label: "Inativo" },
  ];

  const planOptions = [
    { value: "all", label: "Todos os Planos" },
    { value: "basic", label: "Básico" },
    { value: "premium", label: "Premium" },
    { value: "enterprise", label: "Enterprise" },
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
        <Button className="btn-corporate flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Fornecedor
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-corporate">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{mockSuppliers.length}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-corporate">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-success">
                {mockSuppliers.filter(s => s.status === 'active').length}
              </p>
              <p className="text-sm text-muted-foreground">Ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-corporate">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {mockSuppliers.filter(s => s.subscriptionPlan === 'premium').length}
              </p>
              <p className="text-sm text-muted-foreground">Premium</p>
            </div>
          </CardContent>
        </Card>
        <Card className="card-corporate">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">
                {mockSuppliers.filter(s => s.subscriptionPlan === 'enterprise').length}
              </p>
              <p className="text-sm text-muted-foreground">Enterprise</p>
            </div>
          </CardContent>
        </Card>
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

              {/* Subscription Plan */}
              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Plano:</span>
                  <Badge className={getStatusColor(supplier.subscriptionPlan)}>
                    {getStatusText(supplier.subscriptionPlan)}
                  </Badge>
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
              <Button className="btn-corporate">
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Primeiro Fornecedor
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}