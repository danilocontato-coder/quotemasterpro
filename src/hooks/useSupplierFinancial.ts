import { useState, useCallback, useMemo } from 'react';

export interface SupplierPayment {
  id: string;
  quoteId: string;
  clientName: string;
  clientId: string;
  amount: number;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  paymentMethod: string;
  stripePaymentId?: string;
  createdAt: string;
  paidAt?: string;
  fee: number;
  netAmount: number;
}

export interface Earnings {
  total: number;
  thisMonth: number;
  lastMonth: number;
  pending: number;
}

// Mock data
const mockPayments: SupplierPayment[] = [
  {
    id: '1',
    quoteId: 'RFQ009',
    clientName: 'Condomínio Jardim das Flores',
    clientId: 'cli-1',
    amount: 3500.00,
    status: 'paid',
    paymentMethod: 'Cartão de Crédito',
    stripePaymentId: 'pi_1234567890',
    createdAt: '2025-08-18T10:30:00Z',
    paidAt: '2025-08-19T14:20:00Z',
    fee: 101.50, // 2.9% + R$ 0,39
    netAmount: 3398.50,
  },
  {
    id: '2',
    quoteId: 'RFQ008',
    clientName: 'Residencial Vista Alegre',
    clientId: 'cli-2',
    amount: 8200.00,
    status: 'paid',
    paymentMethod: 'PIX',
    stripePaymentId: 'pi_0987654321',
    createdAt: '2025-08-17T09:15:00Z',
    paidAt: '2025-08-17T09:20:00Z',
    fee: 237.80,
    netAmount: 7962.20,
  },
  {
    id: '3',
    quoteId: 'RFQ007',
    clientName: 'Condomínio Jardim das Flores',
    clientId: 'cli-1',
    amount: 1200.00,
    status: 'processing',
    paymentMethod: 'Cartão de Débito',
    createdAt: '2025-08-20T11:45:00Z',
    fee: 34.80,
    netAmount: 1165.20,
  },
  {
    id: '4',
    quoteId: 'RFQ006',
    clientName: 'Condomínio Sol Nascente',
    clientId: 'cli-3',
    amount: 15000.00,
    status: 'pending',
    paymentMethod: 'Boleto',
    createdAt: '2025-08-19T16:30:00Z',
    fee: 435.00,
    netAmount: 14565.00,
  },
  {
    id: '5',
    quoteId: 'RFQ005',
    clientName: 'Residencial Primavera',
    clientId: 'cli-4',
    amount: 2500.00,
    status: 'failed',
    paymentMethod: 'Cartão de Crédito',
    createdAt: '2025-08-15T08:20:00Z',
    fee: 72.50,
    netAmount: 2427.50,
  },
];

let paymentsStore: SupplierPayment[] = [...mockPayments];

export const useSupplierFinancial = () => {
  const [payments, setPayments] = useState<SupplierPayment[]>(paymentsStore);
  const [isLoading, setIsLoading] = useState(false);

  const earnings = useMemo((): Earnings => {
    const paidPayments = payments.filter(p => p.status === 'paid');
    const total = paidPayments.reduce((sum, payment) => sum + payment.netAmount, 0);
    const pending = payments.filter(p => p.status === 'pending' || p.status === 'processing')
      .reduce((sum, payment) => sum + payment.amount, 0);

    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const thisMonthPayments = paidPayments.filter(p => {
      const paymentDate = new Date(p.paidAt || p.createdAt);
      return paymentDate >= thisMonth;
    });

    const lastMonthPayments = paidPayments.filter(p => {
      const paymentDate = new Date(p.paidAt || p.createdAt);
      return paymentDate >= lastMonth && paymentDate <= lastMonthEnd;
    });

    const thisMonthTotal = thisMonthPayments.reduce((sum, payment) => sum + payment.netAmount, 0);
    const lastMonthTotal = lastMonthPayments.reduce((sum, payment) => sum + payment.netAmount, 0);

    return {
      total,
      thisMonth: thisMonthTotal,
      lastMonth: lastMonthTotal,
      pending,
    };
  }, [payments]);

  const getTotalEarnings = useCallback(() => {
    return earnings.total;
  }, [earnings.total]);

  const getPendingPayments = useCallback(() => {
    return earnings.pending;
  }, [earnings.pending]);

  const getMonthlyStats = useCallback(() => {
    const growth = earnings.lastMonth > 0 
      ? ((earnings.thisMonth - earnings.lastMonth) / earnings.lastMonth) * 100 
      : 0;

    return {
      thisMonth: earnings.thisMonth,
      lastMonth: earnings.lastMonth,
      growth,
    };
  }, [earnings]);

  const updatePaymentStatus = useCallback(async (paymentId: string, status: SupplierPayment['status']) => {
    setIsLoading(true);
    try {
      paymentsStore = paymentsStore.map(payment =>
        payment.id === paymentId
          ? { 
              ...payment, 
              status,
              paidAt: status === 'paid' ? new Date().toISOString() : payment.paidAt
            }
          : payment
      );
      setPayments([...paymentsStore]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getPaymentsByStatus = useCallback((status: SupplierPayment['status']) => {
    return payments.filter(payment => payment.status === status);
  }, [payments]);

  const getPaymentsByDateRange = useCallback((startDate: Date, endDate: Date) => {
    return payments.filter(payment => {
      const paymentDate = new Date(payment.paidAt || payment.createdAt);
      return paymentDate >= startDate && paymentDate <= endDate;
    });
  }, [payments]);

  const exportPayments = useCallback((format: 'csv' | 'pdf' = 'csv') => {
    // Mock export functionality
    console.log(`Exporting payments in ${format} format`);
    // In real implementation, this would generate and download the file
  }, []);

  return {
    payments,
    earnings,
    isLoading,
    getTotalEarnings,
    getPendingPayments,
    getMonthlyStats,
    updatePaymentStatus,
    getPaymentsByStatus,
    getPaymentsByDateRange,
    exportPayments,
  };
};