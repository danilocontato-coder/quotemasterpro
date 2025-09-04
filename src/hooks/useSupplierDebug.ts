import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SupplierDebugInfo {
  userId: string;
  userEmail: string;
  userRole: string;
  userSupplierId?: string;
  supplierRecord?: any;
  profileRecord?: any;
  hasSupplierData: boolean;
  totalQuotes: number;
  totalProducts: number;
  error?: string;
}

export const useSupplierDebug = () => {
  const [debugInfo, setDebugInfo] = useState<SupplierDebugInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchDebugInfo = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      console.log('🔍 DEBUG: Fetching supplier debug info for user:', user.email);

      // 1. Get current profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      // 2. Try to find supplier by email
      const { data: supplierRecord, error: supplierError } = await supabase
        .from('suppliers')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      // 3. Count quotes for this supplier
      let totalQuotes = 0;
      if (supplierRecord?.id) {
        const { count: quotesCount } = await supabase
          .from('quote_responses')
          .select('*', { count: 'exact', head: true })
          .eq('supplier_id', supplierRecord.id);
        totalQuotes = quotesCount || 0;
      }

      // 4. Count products for this supplier  
      let totalProducts = 0;
      if (supplierRecord?.id) {
        const { count: productsCount } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('supplier_id', supplierRecord.id);
        totalProducts = productsCount || 0;
      }

      const debugInfo: SupplierDebugInfo = {
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        userSupplierId: user.supplierId,
        supplierRecord,
        profileRecord: profile,
        hasSupplierData: !!supplierRecord,
        totalQuotes,
        totalProducts,
        error: profileError?.message || supplierError?.message,
      };

      console.log('🔍 DEBUG: Supplier debug info:', debugInfo);
      setDebugInfo(debugInfo);

    } catch (error) {
      console.error('Error fetching debug info:', error);
      setDebugInfo({
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        userSupplierId: user.supplierId,
        hasSupplierData: false,
        totalQuotes: 0,
        totalProducts: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const linkSupplierToProfile = async () => {
    if (!user || !debugInfo?.supplierRecord) return false;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ supplier_id: debugInfo.supplierRecord.id })
        .eq('id', user.id);

      if (error) throw error;

      // Trigger profile reload
      window.dispatchEvent(new CustomEvent('user-profile-updated'));
      
      // Refresh debug info
      setTimeout(() => fetchDebugInfo(), 1000);
      
      return true;
    } catch (error) {
      console.error('Error linking supplier to profile:', error);
      return false;
    }
  };

  const createSupplierRecord = async (supplierData: { name: string; cnpj?: string; phone?: string }) => {
    if (!user) return false;

    try {
      const { data: newSupplier, error } = await supabase
        .from('suppliers')
        .insert({
          name: supplierData.name,
          cnpj: supplierData.cnpj || '',
          email: user.email,
          phone: supplierData.phone || '',
          status: 'active',
          type: 'local'
        })
        .select()
        .single();

      if (error) throw error;

      // Link to profile
      await supabase
        .from('profiles')
        .update({ 
          supplier_id: newSupplier.id,
          role: 'supplier' 
        })
        .eq('id', user.id);

      // Trigger profile reload
      window.dispatchEvent(new CustomEvent('user-profile-updated'));
      
      // Refresh debug info
      setTimeout(() => fetchDebugInfo(), 1000);
      
      return true;
    } catch (error) {
      console.error('Error creating supplier record:', error);
      return false;
    }
  };

  useEffect(() => {
    if (user) {
      fetchDebugInfo();
    }
  }, [user?.id, user?.supplierId]);

  return {
    debugInfo,
    isLoading,
    refetch: fetchDebugInfo,
    linkSupplierToProfile,
    createSupplierRecord,
  };
};