import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface AdministradoraSupplier {
  id: string;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  whatsapp: string;
  website: string;
  address: any;
  specialties: string[];
  certification_status: string;
  status: string;
  rating: number;
  completed_orders: number;
  type: 'local' | 'certified';
  is_certified: boolean;
  // Origem do fornecedor
  source: 'administradora' | 'condominio';
  source_name?: string; // Nome do condomínio se vier de lá
  source_id?: string; // ID do condomínio
}

export function useAdministradoraSuppliers() {
  const [suppliers, setSuppliers] = useState<AdministradoraSupplier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchSuppliers = async () => {
    if (!user?.clientId) return;
    
    setIsLoading(true);
    try {
      // 1. Buscar fornecedores da própria administradora
      const { data: adminSuppliers, error: adminError } = await supabase
        .from('suppliers')
        .select('*')
        .eq('client_id', user.clientId)
        .order('name');

      if (adminError) throw adminError;

      // 2. Buscar clientes vinculados à administradora
      const { data: linkedClients, error: clientsError } = await supabase
        .from('clients')
        .select('id, name')
        .eq('parent_client_id', user.clientId);

      if (clientsError) throw clientsError;

      // 3. Buscar fornecedores dos clientes vinculados
      let condominioSuppliers: any[] = [];
      if (linkedClients && linkedClients.length > 0) {
        const clientIds = linkedClients.map(c => c.id);
        const { data: suppliers, error: suppliersError } = await supabase
          .from('suppliers')
          .select('*')
          .in('client_id', clientIds)
          .order('name');

        if (suppliersError) throw suppliersError;
        condominioSuppliers = suppliers || [];
      }

      // 4. Combinar e formatar resultados
      const adminFormattedSuppliers: AdministradoraSupplier[] = (adminSuppliers || []).map(s => ({
        id: s.id,
        name: s.name,
        cnpj: s.cnpj,
        email: s.email,
        phone: s.phone || '',
        whatsapp: s.whatsapp || '',
        website: s.website || '',
        address: s.address,
        specialties: s.specialties || [],
        certification_status: s.certification_status || 'pending',
        status: s.status || 'active',
        rating: s.rating || 0,
        completed_orders: s.completed_orders || 0,
        type: (s.type === 'certified' ? 'certified' : 'local') as 'local' | 'certified',
        is_certified: s.is_certified || false,
        source: 'administradora',
      }));

      const condominioFormattedSuppliers: AdministradoraSupplier[] = condominioSuppliers.map(s => {
        const sourceClient = linkedClients?.find(c => c.id === s.client_id);
        return {
          id: s.id,
          name: s.name,
          cnpj: s.cnpj,
          email: s.email,
          phone: s.phone || '',
          whatsapp: s.whatsapp || '',
          website: s.website || '',
          address: s.address,
          specialties: s.specialties || [],
          certification_status: s.certification_status || 'pending',
          status: s.status || 'active',
          rating: s.rating || 0,
          completed_orders: s.completed_orders || 0,
          type: (s.type === 'certified' ? 'certified' : 'local') as 'local' | 'certified',
          is_certified: s.is_certified || false,
          source: 'condominio',
          source_name: sourceClient?.name,
          source_id: sourceClient?.id,
        };
      });

      setSuppliers([...adminFormattedSuppliers, ...condominioFormattedSuppliers]);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
      toast({
        title: "Erro ao carregar fornecedores",
        description: "Não foi possível carregar a lista de fornecedores.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = () => {
    fetchSuppliers();
  };

  useEffect(() => {
    fetchSuppliers();
  }, [user?.clientId]);

  return {
    suppliers,
    isLoading,
    refetch,
  };
}
