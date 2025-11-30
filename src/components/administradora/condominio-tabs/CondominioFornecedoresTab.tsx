import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Package,
  Search,
  Plus,
  Star,
  Phone,
  Mail,
  MapPin,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Supplier {
  id: string;
  name: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  city: string | null;
  state: string | null;
  specialties: string[] | null;
  rating: number | null;
  active: boolean;
}

interface CondominioFornecedoresTabProps {
  condominioId: string;
}

export function CondominioFornecedoresTab({ condominioId }: CondominioFornecedoresTabProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSuppliers();
  }, [condominioId]);

  const fetchSuppliers = async () => {
    try {
      setIsLoading(true);
      
      // Fetch suppliers linked to this condominio's parent (administradora)
      // First get the parent_client_id
      const { data: client } = await supabase
        .from('clients')
        .select('parent_client_id')
        .eq('id', condominioId)
        .single();

      if (!client?.parent_client_id) {
        setSuppliers([]);
        return;
      }

      // Get suppliers linked to the administradora
      const { data: clientSuppliers, error } = await supabase
        .from('client_suppliers')
        .select(`
          supplier_id,
          suppliers (
            id,
            name,
            cnpj,
            email,
            phone,
            whatsapp,
            city,
            state,
            specialties,
            rating,
            active
          )
        `)
        .eq('client_id', client.parent_client_id)
        .eq('status', 'active');

      if (error) throw error;

      const suppliersList = clientSuppliers
        ?.map(cs => cs.suppliers as unknown as Supplier)
        .filter(Boolean) || [];

      setSuppliers(suppliersList);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSuppliers = suppliers.filter(supplier => 
    searchTerm === '' ||
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.specialties?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Fornecedores Disponíveis</CardTitle>
              <CardDescription>
                Fornecedores vinculados à sua administradora disponíveis para cotações
              </CardDescription>
            </div>
            <Button variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver Todos
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou especialidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Grid */}
      {filteredSuppliers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">Nenhum fornecedor encontrado</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              {searchTerm 
                ? 'Tente ajustar os termos de busca'
                : 'A administradora ainda não possui fornecedores vinculados'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSuppliers.map((supplier) => (
            <Card key={supplier.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{supplier.name}</CardTitle>
                      {supplier.cnpj && (
                        <p className="text-xs text-muted-foreground">{supplier.cnpj}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant={supplier.active ? 'default' : 'secondary'}>
                    {supplier.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Rating */}
                {supplier.rating && (
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= supplier.rating! 
                            ? 'text-amber-400 fill-amber-400' 
                            : 'text-muted-foreground'
                        }`}
                      />
                    ))}
                    <span className="text-sm text-muted-foreground ml-1">
                      ({supplier.rating.toFixed(1)})
                    </span>
                  </div>
                )}

                {/* Contact Info */}
                <div className="space-y-1 text-sm">
                  {supplier.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{supplier.phone}</span>
                    </div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{supplier.email}</span>
                    </div>
                  )}
                  {(supplier.city || supplier.state) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{[supplier.city, supplier.state].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                </div>

                {/* Specialties */}
                {supplier.specialties && supplier.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-2 border-t">
                    {supplier.specialties.slice(0, 3).map((specialty, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
