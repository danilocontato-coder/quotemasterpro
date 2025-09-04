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
  status: 'pending' | 'active' | 'inactive' | 'suspended';
  subscription_plan_id?: string;
  client_id?: string;
}

interface CredentialsData {
  username: string;
  password: string;
  generateCredentials: boolean;
  forcePasswordChange: boolean;
}

export const useSupabaseAdminSuppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchSuppliers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
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

  useEffect(() => {
    fetchSuppliers();
    
    const channel = supabase
      .channel('admin-suppliers-changes')
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

  const createSupplierWithUser = async (
    supplierData: SupplierWithUserData,
    credentials: CredentialsData
  ) => {
    try {
      // 1. Create auth user if credentials are provided
      let authUserId = null;
      if (credentials.generateCredentials) {
        const { data: authData, error: authError } = await supabase.functions.invoke('create-auth-user', {
          body: {
            email: supplierData.email,
            password: credentials.password,
            role: 'supplier',
            user_metadata: {
              name: supplierData.name,
              role: 'supplier',
              force_password_change: credentials.forcePasswordChange
            }
          }
        });

        if (authError) throw authError;
        authUserId = authData?.user?.id;
      }

      // 2. Create supplier record
      const { data: supplier, error: supplierError } = await supabase
        .from('suppliers')
        .insert([supplierData])
        .select()
        .single();

      if (supplierError) throw supplierError;

      // 3. Create user record if auth user was created
      if (authUserId) {
        const { error: userError } = await supabase
          .from('users')
          .insert([{
            name: supplierData.name,
            email: supplierData.email,
            role: 'supplier',
            supplier_id: supplier.id,
            auth_user_id: authUserId,
            force_password_change: credentials.forcePasswordChange,
            status: 'active'
          }]);

        if (userError) {
          console.error('Error creating user record:', userError);
        }
      }

      // 4. Create audit log
      await supabase
        .from('audit_logs')
        .insert([{
          user_id: authUserId,
          action: 'SUPPLIER_CREATE',
          entity_type: 'suppliers',
          entity_id: supplier.id,
          details: {
            supplier_name: supplierData.name,
            cnpj: supplierData.cnpj,
            with_user: !!authUserId
          }
        }]);

      setSuppliers(prev => [...prev, supplier as Supplier].sort((a, b) => a.name.localeCompare(b.name)));
      
      toast({
        title: "Fornecedor criado com sucesso",
        description: `${supplierData.name} foi adicionado ao sistema${authUserId ? ' com acesso de usuário' : ''}.`
      });

      return supplier;
    } catch (error) {
      console.error('Error creating supplier with user:', error);
      toast({
        title: "Erro ao criar fornecedor",
        description: "Não foi possível criar o fornecedor. Verifique os dados e tente novamente.",
        variant: "destructive"
      });
      throw error;
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
        description: "As alterações foram salvas com sucesso."
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
        description: `${name} foi removido do sistema.`
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
    createSupplierWithUser,
    updateSupplier,
    deleteSupplier
  };
};