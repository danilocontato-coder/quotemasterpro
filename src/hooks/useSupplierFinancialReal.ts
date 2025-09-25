import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface RealSupplierPayment {
  id: string;
  quoteId: string;
  quoteName: string;
  clientName: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'in_escrow' | 'manual_confirmation';
  paymentMethod: string;
  createdAt: string;
  paidAt?: string;
  dueDate?: string;
}

export interface RealFinancialMetrics {
  totalEarnings: number;
  pendingPayments: number;
  thisMonth: number;
  growth: number;
  averageTicket: number;
  totalPayments: number;
}

export const useSupplierFinancialReal = () => {
  const [payments, setPayments] = useState<RealSupplierPayment[]>([]);
  const [metrics, setMetrics] = useState<RealFinancialMetrics>({
    totalEarnings: 0,
    pendingPayments: 0,
    thisMonth: 0,
    growth: 0,
    averageTicket: 0,
    totalPayments: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  console.log('🏦 [SUPPLIER-FINANCIAL] Hook iniciado para usuário:', user?.email);

  const fetchFinancialData = useCallback(async () => {
    if (!user || user.role !== 'supplier') {
      console.log('🏦 [SUPPLIER-FINANCIAL] Usuário não é fornecedor, saindo...');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('🏦 [SUPPLIER-FINANCIAL] Buscando supplier_id do usuário...');
      
      // Primeiro, buscar o supplier_id do usuário logado
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('supplier_id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('❌ [SUPPLIER-FINANCIAL] Erro ao buscar perfil:', profileError);
        throw profileError;
      }

      const currentSupplierId = profileData?.supplier_id;
      console.log('🏦 [SUPPLIER-FINANCIAL] Supplier ID encontrado:', currentSupplierId);

      if (!currentSupplierId) {
        console.log('⚠️ [SUPPLIER-FINANCIAL] Usuário não tem supplier_id definido');
        setPayments([]);
        setMetrics({
          totalEarnings: 0,
          pendingPayments: 0,
          thisMonth: 0,
          growth: 0,
          averageTicket: 0,
          totalPayments: 0,
        });
        setIsLoading(false);
        return;
      }

      // Buscar pagamentos onde o fornecedor é o supplier_id
      console.log('🏦 [SUPPLIER-FINANCIAL] Buscando pagamentos do fornecedor...');
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          quotes!inner (
            id,
            title,
            client_name,
            supplier_id
          )
        `)
        .eq('supplier_id', currentSupplierId)
        .order('created_at', { ascending: false });

      if (paymentsError) {
        console.error('❌ [SUPPLIER-FINANCIAL] Erro ao buscar pagamentos:', paymentsError);
        throw paymentsError;
      }

      console.log('✅ [SUPPLIER-FINANCIAL] Pagamentos encontrados:', paymentsData?.length || 0);

      // Transformar dados para o formato esperado
      const transformedPayments: RealSupplierPayment[] = (paymentsData || []).map(payment => ({
        id: payment.id,
        quoteId: payment.quote_id,
        quoteName: (payment.quotes as any)?.title || 'Cotação sem título',
        clientName: (payment.quotes as any)?.client_name || 'Cliente não informado',
        amount: payment.amount || 0,
        status: payment.status as RealSupplierPayment['status'],
        paymentMethod: payment.payment_method || 'Não informado',
        createdAt: payment.created_at,
        paidAt: payment.status === 'completed' ? payment.updated_at : undefined,
        dueDate: payment.escrow_release_date,
      }));

      setPayments(transformedPayments);

      // Calcular métricas financeiras
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      // Total ganho (pagamentos completados)
      const completedPayments = transformedPayments.filter(p => p.status === 'completed');
      const totalEarnings = completedPayments.reduce((sum, p) => sum + p.amount, 0);

      // Pagamentos pendentes (valor total)
      const pendingAmount = transformedPayments
        .filter(p => ['pending', 'processing', 'in_escrow', 'manual_confirmation'].includes(p.status))
        .reduce((sum, p) => sum + p.amount, 0);

      // Receita deste mês
      const thisMonthPayments = completedPayments.filter(p => {
        const paymentDate = new Date(p.paidAt || p.createdAt);
        return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
      });
      const thisMonth = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0);

      // Receita do mês anterior para cálculo de crescimento
      const lastMonthPayments = completedPayments.filter(p => {
        const paymentDate = new Date(p.paidAt || p.createdAt);
        return paymentDate.getMonth() === previousMonth && paymentDate.getFullYear() === previousYear;
      });
      const lastMonth = lastMonthPayments.reduce((sum, p) => sum + p.amount, 0);

      // Crescimento percentual
      const growth = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

      // Ticket médio
      const averageTicket = completedPayments.length > 0 ? totalEarnings / completedPayments.length : 0;

      const calculatedMetrics: RealFinancialMetrics = {
        totalEarnings,
        pendingPayments: pendingAmount,
        thisMonth,
        growth,
        averageTicket,
        totalPayments: transformedPayments.length,
      };

      console.log('📊 [SUPPLIER-FINANCIAL] Métricas calculadas:', calculatedMetrics);
      setMetrics(calculatedMetrics);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados financeiros';
      console.error('❌ [SUPPLIER-FINANCIAL] Erro:', errorMessage);
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

  // Funções auxiliares
  const getTotalEarnings = useCallback(() => metrics.totalEarnings, [metrics.totalEarnings]);
  const getPendingPayments = useCallback(() => metrics.pendingPayments, [metrics.pendingPayments]);
  const getMonthlyStats = useCallback(() => ({
    thisMonth: metrics.thisMonth,
    growth: metrics.growth,
  }), [metrics.thisMonth, metrics.growth]);

  const getPaymentsByStatus = useCallback((status: RealSupplierPayment['status']) => {
    return payments.filter(payment => payment.status === status);
  }, [payments]);

  const getPaymentsByDateRange = useCallback((days: number) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return payments.filter(payment => {
      const paymentDate = new Date(payment.createdAt);
      return paymentDate >= startDate;
    });
  }, [payments]);

  // Carregar dados na inicialização
  useEffect(() => {
    if (user?.role === 'supplier') {
      fetchFinancialData();
    }
  }, [fetchFinancialData, user?.role]);

  return {
    payments,
    earnings: metrics,
    isLoading,
    error,
    getTotalEarnings,
    getPendingPayments,
    getMonthlyStats,
    getPaymentsByStatus,
    getPaymentsByDateRange,
    refetch: fetchFinancialData,
  };
};