import React, { useState } from 'react';
import { Globe, MapPin, Star, Plus, Search, Filter, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Supplier, SupplierGroup } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';

interface GlobalSuppliersManagerProps {
  suppliers: Supplier[];
  supplierGroups: SupplierGroup[];
  onSupplierUpdate: (supplier: Supplier) => void;
  onSupplierCreate: (supplier: Supplier) => void;
  onSupplierDelete: (supplierId: string) => void;
}

const regions = [
  'São Paulo - Capital',
  'São Paulo - Grande ABC',
  'São Paulo - Zona Norte',
  'São Paulo - Zona Sul',
  'São Paulo - Zona Leste',
  'São Paulo - Zona Oeste',
  'Rio de Janeiro - Capital',
  'Rio de Janeiro - Zona Sul',
  'Minas Gerais - Belo Horizonte',
  'Paraná - Curitiba',
  'Rio Grande do Sul - Porto Alegre',
  'Bahia - Salvador',
  'Brasília - DF',
  'Nacional'
];

export function GlobalSuppliersManager({ 
  suppliers, 
  supplierGroups, 
  onSupplierUpdate, 
  onSupplierCreate,
  onSupplierDelete 
}: GlobalSuppliersManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const { toast } = useToast();

  // Filtrar apenas fornecedores globais
  const globalSuppliers = suppliers.filter(s => s.type === 'global');

  const filteredSuppliers = globalSuppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.cnpj.includes(searchTerm) ||
                         supplier.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRegion = regionFilter === "all" || supplier.region === regionFilter;
    const matchesStatus = statusFilter === "all" || supplier.status === statusFilter;
    
    return matchesSearch && matchesRegion && matchesStatus;
  });

  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
    region: '',
    groupId: '',
    specialties: [] as string[],
    subscriptionPlan: 'basic' as 'basic' | 'premium' | 'enterprise'
  });

  const handleCreateSupplier = () => {
    const newSupplier: Supplier = {
      id: `global-${Date.now()}`,
      ...formData,
      status: 'active',
      type: 'global',
      rating: 0,
      completedOrders: 0,
      createdAt: new Date().toISOString()
    };

    onSupplierCreate(newSupplier);
    toast({
      title: "Fornecedor Global Criado",
      description: `${formData.name} foi adicionado como fornecedor global.`
    });

    resetForm();
    setShowCreateModal(false);
  };

  const handleUpdateSupplier = () => {
    if (!editingSupplier) return;

    const updatedSupplier: Supplier = {
      ...editingSupplier,
      ...formData
    };

    onSupplierUpdate(updatedSupplier);
    toast({
      title: "Fornecedor Atualizado",
      description: `${formData.name} foi atualizado com sucesso.`
    });

    resetForm();
    setEditingSupplier(null);
  };

  const handleDeleteSupplier = (supplier: Supplier) => {
    if (window.confirm(`Tem certeza que deseja remover ${supplier.name} dos fornecedores globais?`)) {
      onSupplierDelete(supplier.id);
      toast({
        title: "Fornecedor Removido",
        description: `${supplier.name} foi removido dos fornecedores globais.`
      });
    }
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setFormData({
      name: supplier.name,
      cnpj: supplier.cnpj,
      email: supplier.email,
      phone: supplier.phone,
      whatsapp: supplier.whatsapp || '',
      address: supplier.address,
      region: supplier.region || '',
      groupId: supplier.groupId || '',
      specialties: supplier.specialties || [],
      subscriptionPlan: supplier.subscriptionPlan
    });
    setEditingSupplier(supplier);
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      cnpj: '',
      email: '',
      phone: '',
      whatsapp: '',
      address: '',
      region: '',
      groupId: '',
      specialties: [],
      subscriptionPlan: 'basic'
    });
  };

  const toggleSupplierStatus = (supplier: Supplier) => {
    const updatedSupplier = {
      ...supplier,
      status: supplier.status === 'active' ? 'inactive' as const : 'active' as const
    };
    onSupplierUpdate(updatedSupplier);
    
    toast({
      title: `Fornecedor ${updatedSupplier.status === 'active' ? 'Ativado' : 'Desativado'}`,
      description: `${supplier.name} está agora ${updatedSupplier.status === 'active' ? 'disponível' : 'indisponível'} para todos os clientes.`
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6 text-purple-600" />
            Fornecedores Globais
          </h2>
          <p className="text-muted-foreground">
            Gerenciar fornecedores disponíveis para todos os clientes
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Fornecedor Global
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar fornecedores globais..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por região" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as regiões</SelectItem>
                {regions.map(region => (
                  <SelectItem key={region} value={region}>{region}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSuppliers.map((supplier) => (
          <Card key={supplier.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-lg">{supplier.name}</CardTitle>
                    <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                      <Globe className="h-3 w-3 mr-1" />
                      Global
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">
                    {supplier.cnpj}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={supplier.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {supplier.status === 'active' ? 'Ativo' : 'Inativo'}
                  </Badge>
                  {supplier.rating && supplier.rating > 0 && (
                    <div className="flex items-center gap-1 text-xs">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{supplier.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {/* Region */}
              {supplier.region && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{supplier.region}</span>
                </div>
              )}

              {/* Stats */}
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

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleEditSupplier(supplier)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleSupplierStatus(supplier)}
                >
                  {supplier.status === 'active' ? (
                    <XCircle className="h-4 w-4" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteSupplier(supplier)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showCreateModal} onOpenChange={(open) => {
        setShowCreateModal(open);
        if (!open) {
          setEditingSupplier(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? 'Editar Fornecedor Global' : 'Novo Fornecedor Global'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Nome da Empresa *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Razão social"
                />
              </div>
              <div>
                <label className="text-sm font-medium">CNPJ *</label>
                <Input
                  value={formData.cnpj}
                  onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                  placeholder="00.000.000/0000-00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Email *</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="contato@empresa.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Telefone *</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(11) 0000-0000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">WhatsApp</label>
                <Input
                  value={formData.whatsapp}
                  onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                  placeholder="(11) 90000-0000"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Região de Atuação *</label>
                <Select value={formData.region} onValueChange={(value) => setFormData(prev => ({ ...prev, region: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar região" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map(region => (
                      <SelectItem key={region} value={region}>{region}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Endereço *</label>
              <Textarea
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Endereço completo da empresa"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Grupo</label>
                <Select value={formData.groupId} onValueChange={(value) => setFormData(prev => ({ ...prev, groupId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum grupo</SelectItem>
                    {supplierGroups.map(group => (
                      <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Plano</label>
                <Select value={formData.subscriptionPlan} onValueChange={(value: any) => setFormData(prev => ({ ...prev, subscriptionPlan: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Básico</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={editingSupplier ? handleUpdateSupplier : handleCreateSupplier}
              className="flex-1"
            >
              {editingSupplier ? 'Atualizar' : 'Criar'} Fornecedor
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}