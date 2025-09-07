import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Coupon {
  id: string;
  code: string;
  name: string;
  description?: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  max_discount_amount?: number;
  minimum_purchase_amount: number;
  usage_limit?: number;
  usage_count: number;
  target_plans: string[];
  target_audience: 'all' | 'new_customers' | 'existing_customers';
  active: boolean;
  starts_at: string;
  expires_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CouponUsage {
  id: string;
  coupon_id: string;
  user_id: string;
  client_id?: string;
  subscription_plan_id?: string;
  original_amount: number;
  discount_amount: number;
  final_amount: number;
  used_at: string;
}

export interface CouponValidation {
  valid: boolean;
  coupon_id?: string;
  discount_type?: string;
  discount_value?: number;
  max_discount_amount?: number;
  final_discount: number;
  error_message?: string;
}

export const useCoupons = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponUsages, setCouponUsages] = useState<CouponUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Carregar todos os cupons
  const fetchCoupons = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons((data || []) as Coupon[]);
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os cupons",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar usos de cupons
  const fetchCouponUsages = async () => {
    try {
      const { data, error } = await supabase
        .from('coupon_usages')
        .select(`
          *,
          coupons (
            code,
            name
          )
        `)
        .order('used_at', { ascending: false });

      if (error) throw error;
      setCouponUsages(data || []);
    } catch (err: any) {
      console.error('Erro ao carregar usos de cupons:', err);
    }
  };

  // Criar cupom
  const createCoupon = async (couponData: Omit<Coupon, 'id' | 'usage_count' | 'created_at' | 'updated_at' | 'created_by'>) => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .insert([couponData])
        .select()
        .single();

      if (error) throw error;

      setCoupons(prev => [data as Coupon, ...prev]);
      toast({
        title: "Sucesso",
        description: "Cupom criado com sucesso",
      });
      return data;
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message || "Não foi possível criar o cupom",
        variant: "destructive",
      });
      throw err;
    }
  };

  // Atualizar cupom
  const updateCoupon = async (id: string, couponData: Partial<Coupon>) => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .update(couponData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setCoupons(prev => prev.map(coupon => 
        coupon.id === id ? data as Coupon : coupon
      ));
      toast({
        title: "Sucesso",
        description: "Cupom atualizado com sucesso",
      });
      return data;
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message || "Não foi possível atualizar o cupom",
        variant: "destructive",
      });
      throw err;
    }
  };

  // Deletar cupom
  const deleteCoupon = async (id: string) => {
    try {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCoupons(prev => prev.filter(coupon => coupon.id !== id));
      toast({
        title: "Sucesso",
        description: "Cupom deletado com sucesso",
      });
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message || "Não foi possível deletar o cupom",
        variant: "destructive",
      });
      throw err;
    }
  };

  // Validar cupom
  const validateCoupon = async (
    code: string, 
    planId?: string, 
    amount: number = 0
  ): Promise<CouponValidation> => {
    try {
      const { data, error } = await supabase.rpc('validate_coupon', {
        coupon_code: code,
        plan_id: planId,
        purchase_amount: amount
      });

      if (error) throw error;

      const result = data[0];
      return {
        valid: result.valid,
        coupon_id: result.coupon_id,
        discount_type: result.discount_type,
        discount_value: result.discount_value,
        max_discount_amount: result.max_discount_amount,
        final_discount: result.final_discount,
        error_message: result.error_message
      };
    } catch (err: any) {
      return {
        valid: false,
        final_discount: 0,
        error_message: err.message || 'Erro ao validar cupom'
      };
    }
  };

  // Aplicar cupom
  const applyCoupon = async (
    couponId: string,
    userId: string,
    originalAmount: number,
    discountAmount: number,
    finalAmount: number,
    planId?: string,
    clientId?: string
  ) => {
    try {
      const { data, error } = await supabase
        .from('coupon_usages')
        .insert([{
          coupon_id: couponId,
          user_id: userId,
          client_id: clientId,
          subscription_plan_id: planId,
          original_amount: originalAmount,
          discount_amount: discountAmount,
          final_amount: finalAmount
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Cupom aplicado com sucesso",
      });
      return data;
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message || "Não foi possível aplicar o cupom",
        variant: "destructive",
      });
      throw err;
    }
  };

  // Ativar/Desativar cupom
  const toggleCouponStatus = async (id: string, active: boolean) => {
    return updateCoupon(id, { active });
  };

  useEffect(() => {
    fetchCoupons();
    fetchCouponUsages();

    // Configurar realtime
    const channel = supabase
      .channel('coupons-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'coupons'
      }, () => {
        fetchCoupons();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'coupon_usages'
      }, () => {
        fetchCouponUsages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    coupons,
    couponUsages,
    isLoading,
    error,
    fetchCoupons,
    fetchCouponUsages,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    validateCoupon,
    applyCoupon,
    toggleCouponStatus,
  };
};