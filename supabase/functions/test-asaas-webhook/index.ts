import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log('🧪 [TEST WEBHOOK] Payload recebido:', JSON.stringify(payload, null, 2));

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const result = await processTestWebhook(supabase, payload);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('❌ [TEST WEBHOOK] Erro:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        actions: []
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});

async function processTestWebhook(supabase: any, payload: any) {
  const { event, payment, subscription } = payload;
  const actions: string[] = [];
  const details: any = {};

  console.log(`🔍 [TEST] Processando evento: ${event}`);

  // Validar estrutura básica
  if (!event) {
    throw new Error('Campo "event" é obrigatório no payload');
  }

  // Processar eventos de pagamento
  if (event.startsWith('PAYMENT_')) {
    if (!payment) {
      throw new Error('Campo "payment" é obrigatório para eventos de pagamento');
    }

    actions.push(`✅ Payload validado: evento ${event}`);
    
    // Simular busca do pagamento no banco
    const paymentId = payment.id;
    if (payment.externalReference) {
      actions.push(`🔍 Buscaria payment com asaas_payment_id = "${paymentId}"`);
      actions.push(`🔍 Buscaria quote com id = "${payment.externalReference}"`);
    }

    // Ações específicas por tipo de evento
    switch (event) {
      case 'PAYMENT_RECEIVED':
        actions.push(`💰 Atualizaria status do pagamento para "paid"`);
        actions.push(`📋 Atualizaria status da cotação para "paid"`);
        actions.push(`🔓 Liberaria fundos do escrow (se aplicável)`);
        actions.push(`📝 Criaria log de auditoria`);
        actions.push(`📧 Enviaria notificações ao cliente e fornecedor`);
        details.newStatus = 'paid';
        details.amount = payment.value;
        details.netAmount = payment.netValue;
        break;

      case 'PAYMENT_CONFIRMED':
        actions.push(`✅ Atualizaria status do pagamento para "confirmed"`);
        actions.push(`📅 Atualizaria confirmed_at = "${new Date().toISOString()}"`);
        actions.push(`📝 Criaria log de auditoria`);
        actions.push(`🚚 Iniciaria processo de entrega (se configurado)`);
        details.newStatus = 'confirmed';
        details.confirmedAt = payment.confirmedDate;
        break;

      case 'PAYMENT_OVERDUE':
        actions.push(`⏰ Atualizaria status do pagamento para "overdue"`);
        actions.push(`⚠️ Criaria alerta para o cliente`);
        actions.push(`📧 Enviaria notificação de atraso`);
        actions.push(`📝 Criaria log de auditoria`);
        details.newStatus = 'overdue';
        details.dueDate = payment.dueDate;
        break;

      case 'PAYMENT_DELETED':
        actions.push(`❌ Atualizaria status do pagamento para "cancelled"`);
        actions.push(`📋 Atualizaria status da cotação para "cancelled"`);
        actions.push(`📝 Criaria log de auditoria`);
        actions.push(`📧 Notificaria partes interessadas`);
        details.newStatus = 'cancelled';
        break;

      default:
        actions.push(`⚠️ Evento de pagamento não reconhecido: ${event}`);
    }
  }

  // Processar eventos de assinatura
  if (event.startsWith('SUBSCRIPTION_')) {
    if (!subscription) {
      throw new Error('Campo "subscription" é obrigatório para eventos de assinatura');
    }

    actions.push(`✅ Payload validado: evento ${event}`);
    
    const subscriptionId = subscription.id;
    if (subscription.externalReference) {
      actions.push(`🔍 Buscaria client com id = "${subscription.externalReference}"`);
      actions.push(`🔍 Buscaria subscription com asaas_subscription_id = "${subscriptionId}"`);
    }

    switch (event) {
      case 'SUBSCRIPTION_UPDATED':
        actions.push(`🔄 Atualizaria dados da assinatura`);
        actions.push(`💰 Atualizaria valor para R$ ${subscription.value}`);
        actions.push(`📅 Atualizaria próxima cobrança para ${subscription.nextDueDate}`);
        actions.push(`📝 Criaria log de auditoria`);
        actions.push(`📧 Notificaria cliente sobre mudanças`);
        details.newValue = subscription.value;
        details.nextDueDate = subscription.nextDueDate;
        break;

      case 'SUBSCRIPTION_EXPIRED':
        actions.push(`⏱️ Atualizaria status da assinatura para "expired"`);
        actions.push(`🚫 Desativaria funcionalidades premium`);
        actions.push(`📝 Criaria log de auditoria`);
        actions.push(`📧 Notificaria cliente sobre expiração`);
        details.newStatus = 'expired';
        details.endDate = subscription.endDate;
        break;

      default:
        actions.push(`⚠️ Evento de assinatura não reconhecido: ${event}`);
    }
  }

  // Validações adicionais
  actions.push(`🔐 Validaria token de webhook (em produção)`);
  actions.push(`📊 Verificaria rate limiting`);

  console.log(`✅ [TEST] ${actions.length} ações simuladas`);

  return {
    success: true,
    event,
    actions,
    details,
    message: `Teste concluído: ${actions.length} ações seriam executadas em produção`,
    note: 'Este é um teste simulado. Nenhum dado foi modificado no banco de dados.'
  };
}
