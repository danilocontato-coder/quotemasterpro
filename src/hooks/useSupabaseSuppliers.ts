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
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setSuppliers(data || []);
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

  const createSupplier = async (supplierData: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert([supplierData])
        .select()
        .single();

      if (error) throw error;

      // Add audit log
      await supabase.from('audit_logs').insert([{
        action: 'CREATE_SUPPLIER',
        entity_type: 'suppliers',
        entity_id: data.id,
        details: { supplier_data: supplierData }
      }]);

      await fetchSuppliers();
      toast({
        title: "Fornecedor criado",
        description: "Fornecedor cadastrado com sucesso."
      });
      return data;
    } catch (error) {
      console.error('Error creating supplier:', error);
      toast({
        title: "Erro ao criar fornecedor",
        description: "Não foi possível cadastrar o fornecedor.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateSupplier = async (supplierId: string, updates: Partial<Supplier>) => {
    try {
      const { error } = await supabase
        .from('suppliers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', supplierId);

      if (error) throw error;

      // Add audit log
      await supabase.from('audit_logs').insert([{
        action: 'UPDATE_SUPPLIER',
        entity_type: 'suppliers',
        entity_id: supplierId,
        details: { updates }
      }]);

      await fetchSuppliers();
      toast({
        title: "Fornecedor atualizado",
        description: "Dados do fornecedor atualizados com sucesso."
      });
    } catch (error) {
      console.error('Error updating supplier:', error);
      toast({
        title: "Erro ao atualizar fornecedor",
        description: "Não foi possível atualizar os dados do fornecedor.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateSupplierStatus = async (supplierId: string, status: Supplier['status']) => {
    try {
      const { error } = await supabase
        .from('suppliers')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', supplierId);

      if (error) throw error;

      // Add audit log
      await supabase.from('audit_logs').insert([{
        action: 'UPDATE_SUPPLIER_STATUS',
        entity_type: 'suppliers',
        entity_id: supplierId,
        details: { new_status: status }
      }]);

      await fetchSuppliers();
      toast({
        title: "Status atualizado",
        description: "Status do fornecedor foi atualizado com sucesso."
      });
    } catch (error) {
      console.error('Error updating supplier status:', error);
      toast({
        title: "Erro ao atualizar status",
        description: "Não foi possível atualizar o status do fornecedor.",
        variant: "destructive"
      });
      throw error;
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

  return {
    suppliers,
    isLoading,
    createSupplier,
    updateSupplier,
    updateSupplierStatus,
    refetch: fetchSuppliers
  };
};