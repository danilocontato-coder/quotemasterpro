import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useSupplierAssociation } from './useSupplierAssociation';

export interface ClientSupplier {
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
  association_status: string;
  associated_at: string;
}

export function useClientSuppliers() {
  const [suppliers, setSuppliers] = useState<ClientSupplier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { getClientSuppliers } = useSupplierAssociation();

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      const data = await getClientSuppliers();
      setSuppliers(data as ClientSupplier[]);
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
  }, []);

  return {
    suppliers,
    isLoading,
    refetch,
    setSuppliers
  };
}