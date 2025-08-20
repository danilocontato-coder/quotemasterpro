import { useState, useCallback } from 'react';
import { mockPayments, Payment, PaymentTransaction } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';

export const usePayments = () => {
  const [payments, setPayments] = useState<Payment[]>(mockPayments);
  const { toast } = useToast();

  const confirmDelivery = useCallback((paymentId: string, notes?: string) => {
    setPayments(prev => prev.map(payment => {
      if (payment.id === paymentId) {
        const newTransaction: PaymentTransaction = {
          id: `TXN${Date.now()}`,
          paymentId,
          type: 'delivery_confirmed',
          description: notes ? `Entrega confirmada: ${notes}` : 'Entrega confirmada pelo cliente',
          userId: 'USR001', // Mock user
          userName: 'João Silva (Cliente)',
          createdAt: new Date().toISOString(),
        };

        const releaseTransaction: PaymentTransaction = {
          id: `TXN${Date.now() + 1}`,
          paymentId,
          type: 'funds_released',
          description: 'Valores liberados para o fornecedor',
          amount: payment.amount,
          userId: 'SYSTEM',
          userName: 'Sistema',
          createdAt: new Date().toISOString(),
        };

        return {
          ...payment,
          status: 'paid' as const,
          updatedAt: new Date().toISOString(),
          transactions: [...payment.transactions, newTransaction, releaseTransaction],
        };
      }
      return payment;
    }));

    toast({
      title: "Entrega confirmada",
      description: "O pagamento foi liberado para o fornecedor.",
    });
  }, [toast]);

  const openDispute = useCallback((paymentId: string, reason: string) => {
    setPayments(prev => prev.map(payment => {
      if (payment.id === paymentId) {
        const newTransaction: PaymentTransaction = {
          id: `TXN${Date.now()}`,
          paymentId,
          type: 'dispute_opened',
          description: `Disputa aberta: ${reason}`,
          userId: 'USR001', // Mock user
          userName: 'João Silva (Cliente)',
          createdAt: new Date().toISOString(),
          metadata: { reason },
        };

        return {
          ...payment,
          status: 'disputed' as const,
          updatedAt: new Date().toISOString(),
          transactions: [...payment.transactions, newTransaction],
        };
      }
      return payment;
    }));

    toast({
      title: "Disputa aberta",
      description: "A disputa foi registrada e será analisada.",
      variant: "destructive",
    });
  }, [toast]);

  const cancelPayment = useCallback((paymentId: string, reason: string) => {
    setPayments(prev => prev.map(payment => {
      if (payment.id === paymentId && payment.status === 'pending') {
        const newTransaction: PaymentTransaction = {
          id: `TXN${Date.now()}`,
          paymentId,
          type: 'payment_cancelled',
          description: `Pagamento cancelado: ${reason}`,
          userId: 'USR001', // Mock user
          userName: 'João Silva (Cliente)',
          createdAt: new Date().toISOString(),
          metadata: { reason },
        };

        return {
          ...payment,
          status: 'cancelled' as const,
          updatedAt: new Date().toISOString(),
          transactions: [...payment.transactions, newTransaction],
        };
      }
      return payment;
    }));

    toast({
      title: "Pagamento cancelado",
      description: "O pagamento foi cancelado com sucesso.",
    });
  }, [toast]);

  const createPayment = useCallback((quoteId: string, amount: number) => {
    // This would integrate with Stripe in real implementation
    const newPayment: Payment = {
      id: `PAY${Date.now()}`,
      quoteId,
      quoteName: `Cotação ${quoteId}`,
      clientId: '1',
      clientName: 'Condomínio Jardim das Flores',
      supplierId: '1',
      supplierName: 'Fornecedor Mock',
      amount,
      status: 'pending',
      escrowReleaseDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      transactions: [
        {
          id: `TXN${Date.now()}`,
          paymentId: `PAY${Date.now()}`,
          type: 'payment_created',
          description: 'Pagamento criado pelo cliente',
          amount,
          userId: 'USR001',
          userName: 'João Silva (Cliente)',
          createdAt: new Date().toISOString(),
        }
      ],
    };

    setPayments(prev => [newPayment, ...prev]);

    toast({
      title: "Pagamento criado",
      description: "Redirecionando para o Stripe...",
    });

    // Mock Stripe redirect
    setTimeout(() => {
      // Simulate successful payment
      setPayments(prev => prev.map(p => 
        p.id === newPayment.id 
          ? {
              ...p, 
              status: 'in_escrow' as const,
              stripeSessionId: 'cs_mock_' + Date.now(),
              stripePaymentIntentId: 'pi_mock_' + Date.now(),
              transactions: [
                ...p.transactions,
                {
                  id: `TXN${Date.now() + 1}`,
                  paymentId: p.id,
                  type: 'payment_received',
                  description: 'Pagamento recebido via Stripe',
                  amount: p.amount,
                  userId: 'SYSTEM',
                  userName: 'Sistema',
                  createdAt: new Date().toISOString(),
                },
                {
                  id: `TXN${Date.now() + 2}`,
                  paymentId: p.id,
                  type: 'funds_held',
                  description: 'Valores retidos em escrow - aguardando confirmação de entrega',
                  amount: p.amount,
                  userId: 'SYSTEM',
                  userName: 'Sistema',
                  createdAt: new Date().toISOString(),
                  metadata: { release_date: p.escrowReleaseDate }
                }
              ]
            }
          : p
      ));
    }, 2000);

    return newPayment.id;
  }, [toast]);

  const getPaymentsByStatus = useCallback((status: Payment['status']) => {
    return payments.filter(payment => payment.status === status);
  }, [payments]);

  const getPaymentsByClient = useCallback((clientId: string) => {
    return payments.filter(payment => payment.clientId === clientId);
  }, [payments]);

  const getPaymentsBySupplier = useCallback((supplierId: string) => {
    return payments.filter(payment => payment.supplierId === supplierId);
  }, [payments]);

  return {
    payments,
    confirmDelivery,
    openDispute,
    cancelPayment,
    createPayment,
    getPaymentsByStatus,
    getPaymentsByClient,
    getPaymentsBySupplier,
  };
};