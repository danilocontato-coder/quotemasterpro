import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Search, Mail, Phone, Globe, MapPin, Star, Package, Filter } from 'lucide-react';
import { useAdministradoraSuppliers } from '@/hooks/useAdministradoraSuppliers';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function FornecedoresPage() {
  const { suppliers, isLoading } = useAdministradoraSuppliers();
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'administradora' | 'condominio'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = 
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.cnpj.includes(searchTerm) ||
      supplier.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSource = sourceFilter === 'all' || supplier.source === sourceFilter;
    const matchesStatus = statusFilter === 'all' || supplier.status === statusFilter;

    return matchesSearch && matchesSource && matchesStatus;
  });

  const getSourceBadge = (supplier: typeof suppliers[0]) => {
    if (supplier.source === 'administradora') {
      return <Badge variant="default" className="bg-primary">Administradora</Badge>;
    }
    return (
      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
        {supplier.source_name || 'Condomínio'}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      active: { label: 'Ativo', className: 'bg-green-100 text-green-800' },
      inactive: { label: 'Inativo', className: 'bg-gray-100 text-gray-800' },
      pending: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800' },
    };
    
    const config = variants[status] || variants.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fornecedores</h1>
          <p className="text-muted-foreground">
            Gerencie fornecedores da administradora e dos condomínios
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nome, CNPJ ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={sourceFilter} onValueChange={(v: any) => setSourceFilter(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Origens</SelectItem>
              <SelectItem value="administradora">Administradora</SelectItem>
              <SelectItem value="condominio">Condomínios</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Fornecedores</p>
              <p className="text-2xl font-bold">{suppliers.length}</p>
            </div>
            <Building2 className="h-8 w-8 text-primary" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Da Administradora</p>
              <p className="text-2xl font-bold">
                {suppliers.filter(s => s.source === 'administradora').length}
              </p>
            </div>
            <Building2 className="h-8 w-8 text-primary" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Dos Condomínios</p>
              <p className="text-2xl font-bold">
                {suppliers.filter(s => s.source === 'condominio').length}
              </p>
            </div>
            <Building2 className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
      </div>

      {/* Lista de Fornecedores */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando fornecedores...</p>
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">Nenhum fornecedor encontrado</p>
          <p className="text-muted-foreground">
            {searchTerm || sourceFilter !== 'all' || statusFilter !== 'all'
              ? 'Tente ajustar os filtros de busca'
              : 'Adicione fornecedores para começar'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((supplier) => (
            <Card key={supplier.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{supplier.name}</h3>
                    <p className="text-sm text-muted-foreground">{supplier.cnpj}</p>
                  </div>
                  {supplier.is_certified && (
                    <Badge className="bg-purple-100 text-purple-800">Certificado</Badge>
                  )}
                </div>

                {/* Origem e Status */}
                <div className="flex gap-2">
                  {getSourceBadge(supplier)}
                  {getStatusBadge(supplier.status)}
                </div>

                {/* Contatos */}
                <div className="space-y-2 text-sm">
                  {supplier.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{supplier.email}</span>
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{supplier.phone}</span>
                    </div>
                  )}
                  {supplier.website && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="h-4 w-4" />
                      <span className="truncate">{supplier.website}</span>
                    </div>
                  )}
                </div>

                {/* Especialidades */}
                {supplier.specialties && supplier.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {supplier.specialties.slice(0, 3).map((specialty, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                    {supplier.specialties.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{supplier.specialties.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Rating e Pedidos */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-medium">{supplier.rating.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Package className="h-4 w-4" />
                    <span className="text-sm">{supplier.completed_orders} pedidos</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
