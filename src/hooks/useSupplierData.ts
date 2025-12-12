import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SupplierData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  subscription_plan_id?: string;
  planDisplayName?: string;
  bank_data?: any;
  document_number?: string;
  document_type?: string;
  asaas_wallet_id?: string;
  pix_key?: string;
}

export const useSupplierData = () => {
  const [supplierData, setSupplierData] = useState<SupplierData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchSupplierData = useCallback(async () => {
    if (!user?.supplierId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      const { data: supplier, error } = await supabase
        .from('suppliers')
        .select(`
          *,
          subscription_plans:subscription_plan_id (
            display_name
          )
        `)
        .eq('id', user.supplierId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching supplier data:', error);
        return;
      }

      if (supplier) {
        setSupplierData({
          id: supplier.id,
          name: supplier.name,
          email: supplier.email,
          phone: supplier.phone,
          status: supplier.status,
          subscription_plan_id: supplier.subscription_plan_id,
          planDisplayName: supplier.subscription_plans?.display_name || 'Basic',
          bank_data: supplier.bank_data,
          document_number: supplier.document_number,
          document_type: supplier.document_type,
          asaas_wallet_id: supplier.asaas_wallet_id,
          pix_key: supplier.pix_key
        });
      }
    } catch (error) {
      console.error('Error in fetchSupplierData:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.supplierId]);

  // Fetch inicial
  useEffect(() => {
    fetchSupplierData();
  }, [fetchSupplierData]);

  // Real-time subscription para auto-refresh quando dados do fornecedor mudam
  useEffect(() => {
    if (!user?.supplierId) return;

    const channel = supabase
      .channel(`supplier-data-${user.supplierId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'suppliers',
          filter: `id=eq.${user.supplierId}`
        },
        () => {
          // Refetch quando dados do fornecedor são atualizados
          fetchSupplierData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.supplierId, fetchSupplierData]);

  return {
    supplierData,
    isLoading,
    refetch: fetchSupplierData,
  };
};