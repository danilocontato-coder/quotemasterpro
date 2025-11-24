// Espelha a lógica de supabase/functions/_shared/asaas-fees.ts
// para uso no frontend (cálculos de preview)

export interface AsaasFees {
  pix: number;
  boleto: number;
  credit_card: {
    percentage: number;
    fixed: number;
  };
}

export const ASAAS_FEES: AsaasFees = {
  pix: 0.99,
  boleto: 3.49,
  credit_card: {
    percentage: 1.99,
    fixed: 0.49
  }
};

export const ASAAS_MESSAGING_FEE = 0.99;

export function calculateAsaasFee(
  baseAmount: number, 
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'UNDEFINED'
): number {
  switch (billingType) {
    case 'PIX':
      return ASAAS_FEES.pix;
    case 'BOLETO':
      return ASAAS_FEES.boleto;
    case 'CREDIT_CARD':
      return (baseAmount * ASAAS_FEES.credit_card.percentage / 100) + ASAAS_FEES.credit_card.fixed;
    case 'UNDEFINED':
      return (baseAmount * ASAAS_FEES.credit_card.percentage / 100) + ASAAS_FEES.credit_card.fixed;
    default:
      return 0;
  }
}

export function calculateCompleteAsaasFees(
  baseAmount: number,
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'UNDEFINED' = 'UNDEFINED'
): {
  paymentFee: number;
  messagingFee: number;
  totalFees: number;
} {
  const paymentFee = calculateAsaasFee(baseAmount, billingType);
  const messagingFee = ASAAS_MESSAGING_FEE;
  
  return {
    paymentFee,
    messagingFee,
    totalFees: paymentFee + messagingFee
  };
}

export function calculateCustomerTotal(
  baseAmount: number,
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'UNDEFINED' = 'UNDEFINED'
): {
  baseAmount: number;
  asaasFee: number;
  asaasPaymentFee: number;
  asaasMessagingFee: number;
  customerTotal: number;
  platformCommission: number;
  supplierNet: number;
} {
  const fees = calculateCompleteAsaasFees(baseAmount, billingType);
  const customerTotal = baseAmount + fees.totalFees;
  
  const commissionPercentage = 5.0;
  const platformCommission = baseAmount * (commissionPercentage / 100);
  
  // 🆕 CORREÇÃO: Fornecedor paga comissão + taxas Asaas
  // Cliente paga: baseAmount + taxas Asaas
  // Fornecedor recebe: baseAmount - comissão - taxas Asaas
  const supplierNet = baseAmount - platformCommission - fees.totalFees;

  return {
    baseAmount,
    asaasFee: fees.totalFees,
    asaasPaymentFee: fees.paymentFee,
    asaasMessagingFee: fees.messagingFee,
    customerTotal,
    platformCommission,
    supplierNet
  };
}
