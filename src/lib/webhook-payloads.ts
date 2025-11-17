export interface WebhookTestPayload {
  event: string;
  payment?: any;
  subscription?: any;
}

export const webhookPayloadTemplates: Record<string, WebhookTestPayload> = {
  PAYMENT_RECEIVED: {
    event: "PAYMENT_RECEIVED",
    payment: {
      id: "pay_test_received_123",
      customer: "cus_test_789",
      billingType: "PIX",
      value: 1500.00,
      netValue: 1425.00,
      status: "RECEIVED",
      dueDate: "2025-11-20",
      paymentDate: "2025-11-17",
      description: "Cotação #COT-001",
      externalReference: "quote_test_001"
    }
  },
  
  PAYMENT_CONFIRMED: {
    event: "PAYMENT_CONFIRMED",
    payment: {
      id: "pay_test_confirmed_456",
      customer: "cus_test_789",
      billingType: "CREDIT_CARD",
      value: 2800.00,
      netValue: 2660.00,
      status: "CONFIRMED",
      dueDate: "2025-11-18",
      paymentDate: "2025-11-17",
      confirmedDate: "2025-11-17",
      description: "Cotação #COT-002",
      externalReference: "quote_test_002"
    }
  },
  
  PAYMENT_OVERDUE: {
    event: "PAYMENT_OVERDUE",
    payment: {
      id: "pay_test_overdue_789",
      customer: "cus_test_789",
      billingType: "BOLETO",
      value: 2500.00,
      netValue: 2375.00,
      status: "OVERDUE",
      dueDate: "2025-11-10",
      description: "Cotação #COT-003",
      externalReference: "quote_test_003"
    }
  },
  
  PAYMENT_DELETED: {
    event: "PAYMENT_DELETED",
    payment: {
      id: "pay_test_deleted_101",
      customer: "cus_test_789",
      billingType: "PIX",
      value: 800.00,
      status: "DELETED",
      dueDate: "2025-11-25",
      description: "Cotação #COT-004 - Cancelada",
      externalReference: "quote_test_004",
      deleted: true
    }
  },
  
  SUBSCRIPTION_UPDATED: {
    event: "SUBSCRIPTION_UPDATED",
    subscription: {
      id: "sub_test_updated_202",
      customer: "cus_test_789",
      billingType: "CREDIT_CARD",
      value: 299.90,
      nextDueDate: "2025-12-17",
      cycle: "MONTHLY",
      description: "Plano Pro",
      status: "ACTIVE",
      externalReference: "client_test_001"
    }
  },
  
  SUBSCRIPTION_EXPIRED: {
    event: "SUBSCRIPTION_EXPIRED",
    subscription: {
      id: "sub_test_expired_303",
      customer: "cus_test_789",
      billingType: "CREDIT_CARD",
      value: 99.90,
      cycle: "MONTHLY",
      description: "Plano Basic",
      status: "EXPIRED",
      endDate: "2025-11-16",
      externalReference: "client_test_002"
    }
  }
};

export const getPayloadDescription = (eventType: string): string => {
  const descriptions: Record<string, string> = {
    PAYMENT_RECEIVED: "Pagamento recebido com sucesso (PIX confirmado instantaneamente)",
    PAYMENT_CONFIRMED: "Pagamento confirmado após compensação (cartão de crédito aprovado)",
    PAYMENT_OVERDUE: "Pagamento está vencido e não foi pago",
    PAYMENT_DELETED: "Pagamento foi cancelado/deletado",
    SUBSCRIPTION_UPDATED: "Assinatura foi atualizada (mudança de plano, valor, etc)",
    SUBSCRIPTION_EXPIRED: "Assinatura expirou por falta de pagamento"
  };
  
  return descriptions[eventType] || "Evento desconhecido";
};

export const getExpectedActions = (eventType: string): string[] => {
  const actions: Record<string, string[]> = {
    PAYMENT_RECEIVED: [
      "Atualizar status do pagamento para 'paid'",
      "Atualizar status da cotação para 'paid'",
      "Liberar fundos do escrow (se aplicável)",
      "Criar log de auditoria",
      "Notificar cliente e fornecedor"
    ],
    PAYMENT_CONFIRMED: [
      "Atualizar status do pagamento para 'confirmed'",
      "Atualizar data de confirmação",
      "Criar log de auditoria",
      "Iniciar processo de entrega (se configurado)"
    ],
    PAYMENT_OVERDUE: [
      "Atualizar status do pagamento para 'overdue'",
      "Criar alerta para o cliente",
      "Enviar notificação de atraso",
      "Criar log de auditoria"
    ],
    PAYMENT_DELETED: [
      "Atualizar status do pagamento para 'cancelled'",
      "Atualizar status da cotação para 'cancelled'",
      "Criar log de auditoria",
      "Notificar partes interessadas"
    ],
    SUBSCRIPTION_UPDATED: [
      "Atualizar dados da assinatura do cliente",
      "Ajustar próxima data de cobrança",
      "Criar log de auditoria",
      "Notificar cliente sobre mudanças"
    ],
    SUBSCRIPTION_EXPIRED: [
      "Atualizar status da assinatura para 'expired'",
      "Desativar funcionalidades premium",
      "Criar log de auditoria",
      "Notificar cliente sobre expiração"
    ]
  };
  
  return actions[eventType] || [];
};
