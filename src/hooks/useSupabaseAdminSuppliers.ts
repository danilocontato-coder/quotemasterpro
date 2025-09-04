import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Supplier } from '@/hooks/useSupabaseSuppliers';

interface SupplierWithUserData {
  name: string;
  cnpj: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  address?: any;
  business_info?: any;
  specialties?: string[];
  type: 'local' | 'certified';
  region?: string;
  state?: string;
  city?: string;
  visibility_scope?: 'region' | 'global';
  status: 'pending' | 'active' | 'inactive' | 'suspended';
  subscription_plan_id?: string;
  client_id?: string;
  is_certified?: boolean;
  certification_date?: string | null;
  certification_expires_at?: string | null;
}

interface CredentialsData {
  username: string;
  password: string;
  generateCredentials: boolean;
  forcePasswordChange: boolean;
}

export const useSupabaseAdminSuppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Função de fetch mais simples possível
  const fetchSuppliers = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Fetching suppliers...');
      
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      
      console.log('✅ Suppliers loaded:', data?.length || 0);
      setSuppliers((data as any[])?.map(supplier => ({
        ...supplier,
        type: supplier.type as 'local' | 'certified'
      })) || []);
    } catch (error) {
      console.error('❌ Error fetching suppliers:', error);
      toast({
        title: "Erro ao carregar fornecedores",
        description: "Não foi possível carregar a lista de fornecedores.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load inicial simples - SEM real-time
  useEffect(() => {
    fetchSuppliers();
  }, []);

  const updateSupplier = async (id: string, updates: Partial<Supplier>) => {
    try {
      console.log('🔄 Updating supplier:', id);
      
      const { data, error } = await supabase
        .from('suppliers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Supplier updated successfully');
      
      // Update local state immediately
      setSuppliers(prev => 
        prev.map(supplier => 
          supplier.id === id ? { 
            ...supplier, 
            ...(data as any),
            type: (data as any).type as 'local' | 'certified'
          } : supplier
        )
      );
      
      toast({
        title: "Fornecedor atualizado",
        description: "As alterações foram salvas com sucesso."
      });

      return true;
    } catch (error) {
      console.error('❌ Error updating supplier:', error);
      toast({
        title: "Erro ao atualizar fornecedor",
        description: "Não foi possível atualizar o fornecedor.",
        variant: "destructive"
      });
      return false;
    }
  };

  const createSupplierWithUser = async (
    supplierData: SupplierWithUserData,
    credentials: CredentialsData
  ) => {
    try {
      console.log('🔄 Creating supplier...');
      
      // Simple create without complex logic
      const { data: supplier, error } = await supabase
        .from('suppliers')
        .insert([supplierData])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Supplier created successfully');
      
      // Update local state
      setSuppliers(prev => [...prev, {
        ...supplier,
        type: (supplier as any).type as 'local' | 'certified'
      } as Supplier]);
      
      toast({
        title: "Fornecedor criado com sucesso",
        description: `${supplierData.name} foi adicionado ao sistema.`
      });

      return supplier;
    } catch (error) {
      console.error('❌ Error creating supplier:', error);
      toast({
        title: "Erro ao criar fornecedor",
        description: "Não foi possível criar o fornecedor.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteSupplier = async (id: string, name: string) => {
    try {
      console.log('🔄 Deleting supplier:', id);
      
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      console.log('✅ Supplier deleted successfully');
      
      setSuppliers(prev => prev.filter(supplier => supplier.id !== id));
      
      toast({
        title: "Fornecedor removido",
        description: `${name} foi removido do sistema.`
      });

      return true;
    } catch (error) {
      console.error('❌ Error deleting supplier:', error);
      toast({
        title: "Erro ao remover fornecedor",
        description: "Não foi possível remover o fornecedor.",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    suppliers,
    isLoading,
    refetch: fetchSuppliers,
    createSupplierWithUser,
    updateSupplier,
    deleteSupplier
  };
};