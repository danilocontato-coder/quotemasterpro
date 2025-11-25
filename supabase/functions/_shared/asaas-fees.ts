export interface AsaasFees {
  pix: number;
  boleto: number;
  credit_card: {
    percentage: number;
    fixed: number;
  };
}

export const ASAAS_FEES: AsaasFees = {
  pix: 0.99, // Corrigido: taxa real do Asaas
  boleto: 3.49,
  credit_card: {
    percentage: 1.99,
    fixed: 0.49
  }
};

// Taxa de mensageria do Asaas (cobrada em todas as cobranças)
export const ASAAS_MESSAGING_FEE = 0.99;

/**
 * Calcula a taxa Asaas baseada no tipo de cobrança
 * @param baseAmount - Valor base da cotação (sem taxas)
 * @param billingType - Tipo de cobrança (PIX, BOLETO, CREDIT_CARD, UNDEFINED)
 * @returns Taxa em reais que será cobrada do cliente
 */
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
      // Cliente ainda não escolheu, usar taxa de cartão (pior cenário)
      return (baseAmount * ASAAS_FEES.credit_card.percentage / 100) + ASAAS_FEES.credit_card.fixed;
    default:
      return 0;
  }
}

/**
 * Calcula taxas completas do Asaas (pagamento + mensageria)
 */
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

/**
 * Calcula o valor total que o cliente deve pagar (base + taxa Asaas)
 * A comissão da plataforma é paga pelo FORNECEDOR (descontada do valor base)
 */
export function calculateCustomerTotal(
  baseAmount: number,
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'UNDEFINED' = 'UNDEFINED'
): {
  baseAmount: number;
  asaasFee: number;
  asaasPaymentFee: number;
  asaasMessagingFee: number;
  customerTotal: number; // O que o cliente paga
  platformCommission: number; // O que a plataforma ganha (pago pelo fornecedor)
  supplierNet: number; // O que o fornecedor recebe
} {
  const fees = calculateCompleteAsaasFees(baseAmount, billingType);
  const customerTotal = baseAmount + fees.totalFees;
  
  // Comissão calculada APENAS sobre o valor base (não sobre taxas)
  // O fornecedor paga a comissão, não o cliente
  const commissionPercentage = 5.0; // Pode vir de config depois
  const platformCommission = baseAmount * (commissionPercentage / 100);
  
  // ✅ CORREÇÃO: Fornecedor paga APENAS a comissão
  // Cliente paga: baseAmount + taxas Asaas (R$ 1.000 + R$ 1,98 = R$ 1.001,98)
  // Asaas retém: R$ 1,98 (taxas) - pagas pelo cliente
  // Fornecedor recebe: baseAmount - comissão (R$ 1.000 - R$ 50 = R$ 950,00)
  // As taxas Asaas já foram pagas pelo cliente (embutidas no customerTotal)
  const supplierNet = baseAmount - platformCommission;

  // Arredondar todos os valores para 2 casas decimais para evitar erros de precisão
  return {
    baseAmount: Math.round(baseAmount * 100) / 100,
    asaasFee: Math.round(fees.totalFees * 100) / 100,
    asaasPaymentFee: Math.round(fees.paymentFee * 100) / 100,
    asaasMessagingFee: Math.round(fees.messagingFee * 100) / 100,
    customerTotal: Math.round(customerTotal * 100) / 100,
    platformCommission: Math.round(platformCommission * 100) / 100,
    supplierNet: Math.round(supplierNet * 100) / 100
  };
}
