import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface Supplier {
  id: string;
  name: string;
  cnpj: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  address?: any;
  business_info?: any;
  specialties?: string[];
  type: 'local' | 'national' | 'international';
  region?: string;
  rating: number;
  completed_orders: number;
  status: 'pending' | 'active' | 'inactive' | 'suspended';
  subscription_plan_id?: string;
  client_id?: string;
  created_at: string;
  updated_at: string;
}

export const useSupabaseSuppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchSuppliers = async () => {
    try {
      setIsLoading(true);
      
      // Get current user to determine filtering
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        console.log('No authenticated user, skipping suppliers fetch');
        setSuppliers([]);
        return;
      }

      // Get user profile to check client_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id, role')
        .eq('id', authUser.id)
        .single();

      console.log('Fetching suppliers for user profile:', profile);

      let query = supabase
        .from('suppliers')
        .select('*')
        .order('name', { ascending: true });

      // Apply filters based on user role and context
      if (profile?.role !== 'admin') {
        // Non-admin users should only see suppliers from their client context
        if (profile?.client_id) {
          console.log('Filtering suppliers by client_id:', profile.client_id);
          query = query.or(`client_id.eq.${profile.client_id},status.eq.active`);
        } else {
          // If user has no client_id context, only show active global suppliers
          console.log('No client context, showing only active suppliers');
          query = query.eq('status', 'active').is('client_id', null);
        }
      }
      // Admin users see all suppliers

      const { data, error } = await query;

      if (error) {
        console.error('Suppliers fetch error:', error);
        throw error;
      }
      
      console.log('Suppliers fetched:', data?.length, 'records');
      setSuppliers((data as Supplier[]) || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast({
        title: "Erro ao carregar fornecedores",
        description: "Não foi possível carregar a lista de fornecedores.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time subscription
  useEffect(() => {
    fetchSuppliers();
    
    const channel = supabase
      .channel('suppliers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'suppliers'
        },
        () => {
          fetchSuppliers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const createSupplier = async (supplierData: Omit<Supplier, 'id' | 'created_at' | 'updated_at' | 'rating' | 'completed_orders'>) => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert([{
          ...supplierData,
          rating: 0,
          completed_orders: 0
        }])
        .select()
        .single();

      if (error) throw error;

      setSuppliers(prev => [...prev, data as Supplier].sort((a, b) => a.name.localeCompare(b.name)));
      
      toast({
        title: "Fornecedor criado",
        description: `O fornecedor "${supplierData.name}" foi criado com sucesso.`,
      });
      return data;
    } catch (error) {
      console.error('Error creating supplier:', error);
      toast({
        title: "Erro ao criar fornecedor",
        description: "Não foi possível criar o fornecedor.",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateSupplier = async (id: string, updates: Partial<Supplier>) => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setSuppliers(prev => 
        prev.map(supplier => supplier.id === id ? { ...supplier, ...data as Supplier } : supplier)
      );
      
      toast({
        title: "Fornecedor atualizado",
        description: "As alterações foram salvas com sucesso.",
      });
      return true;
    } catch (error) {
      console.error('Error updating supplier:', error);
      toast({
        title: "Erro ao atualizar fornecedor",
        description: "Não foi possível atualizar o fornecedor.",
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteSupplier = async (id: string, name: string) => {
    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSuppliers(prev => prev.filter(supplier => supplier.id !== id));
      
      toast({
        title: "Fornecedor removido",
        description: `O fornecedor "${name}" foi removido com sucesso.`,
      });
      return true;
    } catch (error) {
      console.error('Error deleting supplier:', error);
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
    createSupplier,
    updateSupplier,
    deleteSupplier
  };
};