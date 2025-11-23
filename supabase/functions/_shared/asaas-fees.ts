export interface AsaasFees {
  pix: number;
  boleto: number;
  credit_card: {
    percentage: number;
    fixed: number;
  };
}

export const ASAAS_FEES: AsaasFees = {
  pix: 0.00,
  boleto: 3.49,
  credit_card: {
    percentage: 1.99,
    fixed: 0.49
  }
};

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
 * Calcula o valor total que o cliente deve pagar (base + taxa Asaas)
 * A comissão da plataforma é paga pelo FORNECEDOR (descontada do valor base)
 */
export function calculateCustomerTotal(
  baseAmount: number,
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'UNDEFINED' = 'UNDEFINED'
): {
  baseAmount: number;
  asaasFee: number;
  customerTotal: number; // O que o cliente paga
  platformCommission: number; // O que a plataforma ganha (pago pelo fornecedor)
  supplierNet: number; // O que o fornecedor recebe
} {
  const asaasFee = calculateAsaasFee(baseAmount, billingType);
  const customerTotal = baseAmount + asaasFee;
  
  // Comissão calculada APENAS sobre o valor base (não sobre taxas)
  // O fornecedor paga a comissão, não o cliente
  const commissionPercentage = 5.0; // Pode vir de config depois
  const platformCommission = baseAmount * (commissionPercentage / 100);
  const supplierNet = baseAmount - platformCommission;

  return {
    baseAmount,
    asaasFee,
    customerTotal,
    platformCommission,
    supplierNet
  };
}
