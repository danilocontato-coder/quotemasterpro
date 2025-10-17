import { useState, useEffect } from 'react';
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
}

export const useSupplierData = () => {
  const [supplierData, setSupplierData] = useState<SupplierData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchSupplierData = async () => {
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
          bank_data: supplier.bank_data
        });
      }
    } catch (error) {
      console.error('Error in fetchSupplierData:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSupplierData();
  }, [user?.supplierId]);

  return {
    supplierData,
    isLoading,
    refetch: fetchSupplierData,
  };
};