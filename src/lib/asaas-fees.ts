// Espelha a lógica de supabase/functions/_shared/asaas-fees.ts
// para uso no frontend (cálculos de preview)

export interface AsaasFees {
  pix: number;
  boleto: number;
  credit_card: {
    installment_1: { percentage: number; fixed: number };
    installment_2_6: { percentage: number; fixed: number };
    installment_7_12: { percentage: number; fixed: number };
  };
  messaging: number;
}

// Valores de fallback atualizados (Dezembro 2024)
export const ASAAS_FEES: AsaasFees = {
  pix: 1.99,
  boleto: 1.99,
  credit_card: {
    installment_1: { percentage: 2.99, fixed: 0.49 },
    installment_2_6: { percentage: 3.49, fixed: 0.49 },
    installment_7_12: { percentage: 3.99, fixed: 0.49 }
  },
  messaging: 0.99
};

export const ASAAS_MESSAGING_FEE = 0.99;

export function calculateAsaasFee(
  baseAmount: number, 
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'UNDEFINED',
  fees: AsaasFees = ASAAS_FEES,
  installments: number = 1
): number {
  switch (billingType) {
    case 'PIX':
      return fees.pix;
    case 'BOLETO':
      return fees.boleto;
    case 'CREDIT_CARD':
      // Usar taxa escalonada baseada no número de parcelas
      let rate = fees.credit_card.installment_1;
      
      if (installments >= 7) {
        rate = fees.credit_card.installment_7_12;
      } else if (installments >= 2) {
        rate = fees.credit_card.installment_2_6;
      }
      
      return (baseAmount * rate.percentage / 100) + rate.fixed;
    case 'UNDEFINED':
      // Cliente ainda não escolheu - usar maior taxa (cartão 12x)
      const maxRate = fees.credit_card.installment_7_12;
      return (baseAmount * maxRate.percentage / 100) + maxRate.fixed;
    default:
      return 0;
  }
}

export function calculateCompleteAsaasFees(
  baseAmount: number,
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'UNDEFINED' = 'UNDEFINED',
  fees: AsaasFees = ASAAS_FEES,
  installments: number = 1
): {
  paymentFee: number;
  messagingFee: number;
  totalFees: number;
} {
  const paymentFee = calculateAsaasFee(baseAmount, billingType, fees, installments);
  const messagingFee = fees.messaging;
  
  return {
    paymentFee,
    messagingFee,
    totalFees: paymentFee + messagingFee
  };
}

export function calculateCustomerTotal(
  baseAmount: number,
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'UNDEFINED' = 'UNDEFINED',
  fees: AsaasFees = ASAAS_FEES,
  installments: number = 1
): {
  baseAmount: number;
  asaasFee: number;
  asaasPaymentFee: number;
  asaasMessagingFee: number;
  customerTotal: number;
  platformCommission: number;
  supplierNet: number;
} {
  const feeDetails = calculateCompleteAsaasFees(baseAmount, billingType, fees, installments);
  const customerTotal = baseAmount + feeDetails.totalFees;
  
  const commissionPercentage = 5.0;
  const platformCommission = baseAmount * (commissionPercentage / 100);
  
  // Fornecedor paga APENAS a comissão
  const supplierNet = baseAmount - platformCommission;

  // Arredondar todos os valores para 2 casas decimais
  return {
    baseAmount: Math.round(baseAmount * 100) / 100,
    asaasFee: Math.round(feeDetails.totalFees * 100) / 100,
    asaasPaymentFee: Math.round(feeDetails.paymentFee * 100) / 100,
    asaasMessagingFee: Math.round(feeDetails.messagingFee * 100) / 100,
    customerTotal: Math.round(customerTotal * 100) / 100,
    platformCommission: Math.round(platformCommission * 100) / 100,
    supplierNet: Math.round(supplierNet * 100) / 100
  };
}
