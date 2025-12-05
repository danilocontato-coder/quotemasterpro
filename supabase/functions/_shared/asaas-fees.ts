/**
 * Utilitário para gerenciamento de taxas do Asaas
 * Suporta taxas dinâmicas do banco ou fallback para valores padrão
 */

export interface AsaasFees {
  pix: number;
  boleto: number;
  credit_card: {
    installment_1: { percentage: number; fixed: number };
    installment_2_6: { percentage: number; fixed: number };
    installment_7_12: { percentage: number; fixed: number };
  };
  messaging: number;
  whatsapp?: number;
  anticipation?: {
    credit_card: number;
    credit_card_installment: number;
    boleto: number;
    pix: number;
  };
  transfer?: {
    pix: number;
    ted: number;
  };
  last_synced?: string;
  source?: string;
}

// Valores de fallback (caso não tenha sincronizado ainda)
// Atualizados para valores reais do Asaas (Dezembro 2024)
export const FALLBACK_FEES: AsaasFees = {
  pix: 1.99,
  boleto: 1.99,
  credit_card: {
    installment_1: { percentage: 2.99, fixed: 0.49 },
    installment_2_6: { percentage: 3.49, fixed: 0.49 },
    installment_7_12: { percentage: 3.99, fixed: 0.49 }
  },
  messaging: 0.99,
  whatsapp: 0.10,
  anticipation: {
    credit_card: 1.25,
    credit_card_installment: 1.70,
    boleto: 5.79,
    pix: 5.79
  },
  transfer: {
    pix: 0,
    ted: 0
  },
  source: 'fallback'
};

/**
 * Busca taxas do Asaas do banco de dados
 * Retorna fallback se não houver dados sincronizados
 */
export async function getAsaasFees(supabaseClient: any): Promise<AsaasFees> {
  try {
    const { data, error } = await supabaseClient
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'asaas_fees')
      .single();

    if (error || !data?.setting_value) {
      console.log('⚠️ Taxas não sincronizadas, usando fallback');
      return FALLBACK_FEES;
    }

    const storedFees = data.setting_value;
    
    // Garantir estrutura correta
    return {
      pix: storedFees.pix ?? FALLBACK_FEES.pix,
      boleto: storedFees.boleto ?? FALLBACK_FEES.boleto,
      credit_card: storedFees.credit_card ?? FALLBACK_FEES.credit_card,
      messaging: storedFees.messaging ?? FALLBACK_FEES.messaging,
      whatsapp: storedFees.whatsapp ?? FALLBACK_FEES.whatsapp,
      anticipation: storedFees.anticipation ?? FALLBACK_FEES.anticipation,
      transfer: storedFees.transfer ?? FALLBACK_FEES.transfer,
      last_synced: storedFees.last_synced,
      source: storedFees.source || 'database'
    };
  } catch (err) {
    console.error('Erro ao buscar taxas:', err);
    return FALLBACK_FEES;
  }
}

/**
 * Calcula a taxa Asaas baseada no tipo de cobrança
 * Agora suporta taxas dinâmicas e parcelamento
 */
export function calculateAsaasFee(
  baseAmount: number,
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'UNDEFINED',
  fees: AsaasFees = FALLBACK_FEES,
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

/**
 * Calcula taxas completas do Asaas (pagamento + mensageria)
 */
export function calculateCompleteAsaasFees(
  baseAmount: number,
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'UNDEFINED' = 'UNDEFINED',
  fees: AsaasFees = FALLBACK_FEES,
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

/**
 * Calcula o valor total que o cliente deve pagar (base + taxa Asaas)
 * A comissão da plataforma é paga pelo FORNECEDOR (descontada do valor base)
 */
export function calculateCustomerTotal(
  baseAmount: number,
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'UNDEFINED' = 'UNDEFINED',
  fees: AsaasFees = FALLBACK_FEES,
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
  
  // Comissão calculada APENAS sobre o valor base (não sobre taxas)
  const commissionPercentage = 5.0;
  const platformCommission = baseAmount * (commissionPercentage / 100);
  
  // Fornecedor paga APENAS a comissão
  // As taxas Asaas já foram pagas pelo cliente (embutidas no customerTotal)
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
