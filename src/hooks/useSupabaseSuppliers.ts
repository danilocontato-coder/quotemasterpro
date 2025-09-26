import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { checkSupplierDuplicate, normalizeCNPJ } from '@/lib/supplierDeduplication';

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
  type: 'local' | 'certified';
  region?: string;
  state?: string;
  city?: string;
  rating: number;
  completed_orders: number;
  status: 'pending' | 'active' | 'inactive' | 'suspended';
  subscription_plan_id?: string;
  is_certified?: boolean;
  created_at: string;
  updated_at: string;
}

export const useSupabaseSuppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchSuppliers = async () => {
    try {
      setIsLoading(true);
      
      // Get current user to determine filtering - use context user first
      const authUser = user?.id ? { id: user.id } : (await supabase.auth.getUser()).data.user;
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

      let supplierIds: string[] = [];

      // Apply filters based on user role and context
      if (profile?.role !== 'admin') {
        // Non-admin users should only see suppliers associated with their client
        if (profile?.client_id) {
          console.log('Filtering suppliers by client association');
          
          // Get suppliers associated with this client
          const { data: associations } = await supabase
            .from('client_suppliers')
            .select('supplier_id')
            .eq('client_id', profile.client_id)
            .eq('status', 'active');

          supplierIds = associations?.map(a => a.supplier_id) || [];
          console.log('Associated supplier IDs:', supplierIds);
        } else {
          // If user has no client_id context, show no suppliers
          console.log('No client context, showing no suppliers');
          supplierIds = [];
        }
      }

      // Build query for suppliers
      let query = supabase
        .from('suppliers')
        .select('*')
        .order('name', { ascending: true });

      // Apply supplier ID filter for non-admin users
      if (profile?.role !== 'admin') {
        if (supplierIds.length > 0) {
          query = query.in('id', supplierIds);
        } else {
          // No associated suppliers, return empty
          setSuppliers([]);
          return;
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
        (payload) => {
          console.log('Real-time update received:', payload);
          fetchSuppliers(); // Refetch data when changes occur
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
      });

    return () => {
      console.log('Cleaning up suppliers subscription');
      supabase.removeChannel(channel);
    };
  }, []);

  const createSupplier = async (supplierData: Omit<Supplier, 'id' | 'created_at' | 'updated_at' | 'rating' | 'completed_orders'>) => {
    try {
      // Check for duplicates before creating
      const duplicateCheck = await checkSupplierDuplicate(
        supplierData.cnpj || '',
        supplierData.email || '',
        supabase
      );

      if (duplicateCheck.exists && duplicateCheck.existing) {
        const existing = duplicateCheck.existing;
        const reason = duplicateCheck.reason === 'cnpj' ? 'CNPJ' : 'E-mail';
        
        toast({
          title: "Fornecedor já existe",
          description: `Já existe um fornecedor ${existing.type === 'certified' ? 'certificado' : 'local'} com este ${reason}: ${existing.name}`,
          variant: "destructive"
        });
        
        // Return existing supplier instead of creating new one
        return existing;
      }

      // Get current user's profile to get client_id
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        throw new Error('Usuário não autenticado');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', authUser.id)
        .single();

      if (!profile?.client_id) {
        throw new Error('Perfil de usuário não encontrado ou sem cliente associado');
      }

      // Create supplier - triggers will handle client_id and CNPJ normalization
      const insertData = {
        ...supplierData,
        cnpj: normalizeCNPJ(supplierData.cnpj || ''), // Normalize CNPJ
        rating: 0,
        completed_orders: 0
      };
      
      const { data, error } = await supabase
        .from('suppliers')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      // Associate supplier with current client
      await supabase
        .from('client_suppliers')
        .insert({
          client_id: profile.client_id,
          supplier_id: data.id,
          status: 'active'
        });

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
      
      // Ensure UI is in sync with DB (handles replication delays)
      setTimeout(() => {
        fetchSuppliers();
      }, 150);
      
      toast({
        title: "Fornecedor removido",
        description: `O fornecedor "${name}" foi removido com sucesso.`,
      });
      return true;
    } catch (error: any) {
      console.error('Error deleting supplier:', error);
      const message = (error?.message?.includes('permission') || error?.code === '42501')
        ? 'Permissão negada pelas políticas de acesso (RLS). Você só pode excluir fornecedores locais do seu cliente. Fornecedores certificados (globais) só podem ser removidos pelo Superadmin.'
        : 'Não foi possível remover o fornecedor.';
      toast({
        title: "Erro ao remover fornecedor",
        description: message,
        variant: "destructive"
      });
      // Re-sync state just in case local removal happened elsewhere
      setTimeout(() => {
        fetchSuppliers();
      }, 150);
      return false;
    }
  };

  const refetch = async () => {
    await fetchSuppliers();
  };

  return {
    suppliers,
    isLoading,
    refetch,
    createSupplier,
    updateSupplier,
    deleteSupplier
  };
};