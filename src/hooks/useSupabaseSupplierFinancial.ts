import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface SupplierPayment {
  id: string;
  quote_id: string;
  quote_title: string;
  client_name: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  payment_method?: string;
  due_date?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  pendingPayments: number;
  completedPayments: number;
  revenueGrowth: number;
  averageTicket: number;
}

export const useSupabaseSupplierFinancial = () => {
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [metrics, setMetrics] = useState<FinancialMetrics>({
    totalRevenue: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
    completedPayments: 0,
    revenueGrowth: 0,
    averageTicket: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch payments for supplier
  const fetchPayments = useCallback(async () => {
    if (!user || !user.supplierId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch payments related to supplier's quotes
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          quotes!inner (
            title,
            client_name,
            supplier_id
          )
        `)
        .eq('quotes.supplier_id', user.supplierId)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Transform data to match our interface
      const transformedPayments: SupplierPayment[] = (paymentsData || []).map(payment => ({
        id: payment.id,
        quote_id: payment.quote_id,
        quote_title: (payment.quotes as any)?.title || 'Cotação',
        client_name: (payment.quotes as any)?.client_name || 'Cliente',
        amount: payment.amount,
        status: payment.status as SupplierPayment['status'],
        payment_method: 'Boleto/PIX', // Default since we don't have this field
        due_date: payment.escrow_release_date,
        paid_at: payment.status === 'completed' ? payment.updated_at : undefined,
        created_at: payment.created_at,
        updated_at: payment.updated_at,
      }));

      setPayments(transformedPayments);

      // Calculate metrics
      calculateMetrics(transformedPayments);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados financeiros';
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  const calculateMetrics = useCallback((paymentsData: SupplierPayment[]) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Total revenue (completed payments)
    const completedPayments = paymentsData.filter(p => p.status === 'completed');
    const totalRevenue = completedPayments.reduce((sum, p) => sum + p.amount, 0);

    // Monthly revenue (current month completed payments)
    const monthlyPayments = completedPayments.filter(p => {
      const paymentDate = new Date(p.paid_at || p.created_at);
      return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
    });
    const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + p.amount, 0);

    // Previous month revenue for growth calculation
    const prevMonthPayments = completedPayments.filter(p => {
      const paymentDate = new Date(p.paid_at || p.created_at);
      return paymentDate.getMonth() === previousMonth && paymentDate.getFullYear() === previousYear;
    });
    const prevMonthRevenue = prevMonthPayments.reduce((sum, p) => sum + p.amount, 0);

    // Revenue growth
    const revenueGrowth = prevMonthRevenue > 0 
      ? ((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 
      : 0;

    // Pending payments count and amount
    const pendingPayments = paymentsData.filter(p => p.status === 'pending').length;

    // Average ticket
    const averageTicket = completedPayments.length > 0 
      ? totalRevenue / completedPayments.length 
      : 0;

    setMetrics({
      totalRevenue,
      monthlyRevenue,
      pendingPayments,
      completedPayments: completedPayments.length,
      revenueGrowth,
      averageTicket,
    });
  }, []);

  // Get payments by status
  const getPaymentsByStatus = useCallback((status: SupplierPayment['status']) => {
    return payments.filter(payment => payment.status === status);
  }, [payments]);

  // Get payments by date range
  const getPaymentsByDateRange = useCallback((startDate: Date, endDate: Date) => {
    return payments.filter(payment => {
      const paymentDate = new Date(payment.created_at);
      return paymentDate >= startDate && paymentDate <= endDate;
    });
  }, [payments]);

  // Get revenue by month (for charts)
  const getRevenueByMonth = useCallback((months: number = 12) => {
    const monthlyData: { month: string; revenue: number }[] = [];
    const today = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      
      const monthRevenue = payments
        .filter(p => {
          const paymentDate = new Date(p.paid_at || p.created_at);
          return p.status === 'completed' &&
                 paymentDate.getMonth() === date.getMonth() &&
                 paymentDate.getFullYear() === date.getFullYear();
        })
        .reduce((sum, p) => sum + p.amount, 0);

      monthlyData.push({
        month: monthName,
        revenue: monthRevenue,
      });
    }

    return monthlyData;
  }, [payments]);

  // Get payment statistics
  const getPaymentStats = useCallback(() => {
    const stats = {
      pending: payments.filter(p => p.status === 'pending').length,
      processing: payments.filter(p => p.status === 'processing').length,
      completed: payments.filter(p => p.status === 'completed').length,
      failed: payments.filter(p => p.status === 'failed').length,
      cancelled: payments.filter(p => p.status === 'cancelled').length,
    };

    return stats;
  }, [payments]);

  // Fetch data on mount
  useEffect(() => {
    if (user?.supplierId) {
      fetchPayments();
    }
  }, [fetchPayments, user?.supplierId]);

  return {
    payments,
    metrics,
    isLoading,
    error,
    getPaymentsByStatus,
    getPaymentsByDateRange,
    getRevenueByMonth,
    getPaymentStats,
    refetch: fetchPayments,
  };
};