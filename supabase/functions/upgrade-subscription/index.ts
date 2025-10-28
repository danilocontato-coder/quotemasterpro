import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { getAsaasConfig } from "../_shared/asaas-utils.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { newPlanId } = await req.json();

    console.log(`🔄 Iniciando upgrade de plano para: ${newPlanId}`);

    // Buscar client_id do usuário
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('client_id')
      .eq('id', user.id)
      .single();

    if (!profile?.client_id) {
      throw new Error('Cliente não encontrado');
    }

    const clientId = profile.client_id;

    // 1. Buscar subscription ativa atual
    const { data: currentSubscription, error: subError } = await supabaseClient
      .from('subscriptions')
      .select(`
        *,
        subscription_plans!plan_id(id, name, monthly_price, display_name)
      `)
      .eq('client_id', clientId)
      .eq('status', 'active')
      .single();

    if (subError || !currentSubscription) {
      throw new Error('Nenhuma assinatura ativa encontrada');
    }

    // 2. Buscar novo plano
    const { data: newPlan, error: planError } = await supabaseClient
      .from('subscription_plans')
      .select('*')
      .eq('id', newPlanId)
      .single();

    if (planError || !newPlan) {
      throw new Error('Plano não encontrado');
    }

    // 3. Calcular dias restantes
    const today = new Date();
    const periodEnd = new Date(currentSubscription.current_period_end);
    const daysRemaining = Math.ceil((periodEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // 4. Calcular valor pro-rata
    const oldPlanMonthly = currentSubscription.subscription_plans.monthly_price;
    const newPlanMonthly = newPlan.monthly_price;
    const priceDifference = newPlanMonthly - oldPlanMonthly;

    const amountDue = (priceDifference * daysRemaining) / 30;
    const amountDueRounded = Math.max(0, Math.round(amountDue * 100) / 100);

    console.log(`
      📊 CÁLCULO PRO-RATA:
      - Plano atual: ${currentSubscription.subscription_plans.name} (R$ ${oldPlanMonthly}/mês)
      - Novo plano: ${newPlan.name} (R$ ${newPlanMonthly}/mês)
      - Diferença mensal: R$ ${priceDifference}
      - Dias restantes: ${daysRemaining}
      - Valor a pagar: R$ ${amountDueRounded}
      - Vencimento original: ${periodEnd.toISOString().split('T')[0]}
    `);

    // 5. Validar se é upgrade
    if (amountDueRounded <= 0) {
      throw new Error('Upgrade não pode ser feito: plano novo é igual ou inferior ao atual.');
    }

    const { apiKey, baseUrl, environment } = await getAsaasConfig(supabaseClient);

    // 6. Cancelar assinatura antiga no Asaas
    if (currentSubscription.asaas_subscription_id) {
      console.log(`🚫 Cancelando assinatura antiga: ${currentSubscription.asaas_subscription_id}`);
      
      const cancelResponse = await fetch(
        `${baseUrl}/subscriptions/${currentSubscription.asaas_subscription_id}`,
        {
          method: 'DELETE',
          headers: {
            'access_token': apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!cancelResponse.ok) {
        console.error('⚠️ Erro ao cancelar assinatura no Asaas, mas continuando...');
      } else {
        console.log('✅ Assinatura antiga cancelada no Asaas');
      }
    }

    // 7. Atualizar subscription antiga para cancelled
    await supabaseClient
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', currentSubscription.id);

    // 8. Criar pagamento único no Asaas para a diferença
    const asaasCustomerId = currentSubscription.asaas_customer_id;
    console.log(`💰 Criando cobrança de upgrade no Asaas para cliente: ${asaasCustomerId}`);

    // Buscar configuração de tipo de cobrança
    const { data: settings } = await supabaseClient
      .from('financial_settings')
      .select('asaas_billing_type')
      .single();

    const billingType = settings?.asaas_billing_type || 'BOLETO';
    console.log(`   Tipo de cobrança: ${billingType}`);

    const paymentResponse = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType,
        value: amountDueRounded,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // D+2
        description: `Upgrade de Plano - ${currentSubscription.subscription_plans.name} → ${newPlan.name}`,
        externalReference: `upgrade-${currentSubscription.id}`
      })
    });

    if (!paymentResponse.ok) {
      const errorData = await paymentResponse.json();
      throw new Error(`Erro ao criar pagamento no Asaas: ${errorData.errors?.[0]?.description || paymentResponse.statusText}`);
    }

    const paymentData = await paymentResponse.json();
    const upgradePaymentId = paymentData.id;

    console.log(`💳 Pagamento de upgrade criado: ${upgradePaymentId}`);

    // 9. Criar nova subscription (status: pending_upgrade)
    console.log(`📝 Criando nova subscription para plano: ${newPlanId}`);
    
    const { data: newSubscription, error: newSubError } = await supabaseClient
      .from('subscriptions')
      .insert({
        client_id: clientId,
        plan_id: newPlanId,
        status: 'pending_upgrade',
        billing_cycle: currentSubscription.billing_cycle,
        current_period_start: today.toISOString(),
        current_period_end: currentSubscription.current_period_end, // MANTÉM A MESMA DATA
        asaas_customer_id: asaasCustomerId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (newSubError) {
      console.error('❌ Erro ao criar nova subscription:', newSubError);
      throw newSubError;
    }
    
    console.log(`✅ Nova subscription criada: ${newSubscription.id}`);

    // 10. Criar invoice para rastreamento
    console.log(`📄 Criando invoice para tracking do upgrade`);
    
    const { error: invoiceError } = await supabaseClient
      .from('invoices')
      .insert({
        id: `UPG-${Date.now()}`,
        subscription_id: newSubscription.id,
        client_id: clientId,
        amount: amountDueRounded,
        status: 'pending',
        due_date: paymentData.dueDate,
        asaas_charge_id: upgradePaymentId,
        boleto_url: paymentData.bankSlipUrl,
        boleto_barcode: paymentData.identificationField,
        created_at: new Date().toISOString()
      });

    if (invoiceError) {
      console.error('⚠️ Erro ao criar invoice (não crítico):', invoiceError);
    } else {
      console.log(`✅ Invoice criada com sucesso`);
    }

    // 11. Audit log
    console.log(`📝 Registrando no audit log`);
    
    const { error: auditError } = await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'SUBSCRIPTION_UPGRADE_INITIATED',
        entity_type: 'subscriptions',
        entity_id: newSubscription.id,
        panel_type: 'client',
        details: {
          old_subscription_id: currentSubscription.id,
          old_plan_id: currentSubscription.plan_id,
          new_plan_id: newPlanId,
          amount_due: amountDueRounded,
          days_remaining: daysRemaining,
          original_due_date: currentSubscription.current_period_end,
          environment
        }
      });

    if (auditError) {
      console.error('⚠️ Erro ao criar audit log (não crítico):', auditError);
    } else {
      console.log(`✅ Audit log registrado`);
    }

    // 12. Retornar resposta
    return new Response(
      JSON.stringify({
        success: true,
        subscription_id: newSubscription.id,
        upgrade_payment_id: upgradePaymentId,
        amount_due: amountDueRounded,
        days_remaining: daysRemaining,
        old_plan_name: currentSubscription.subscription_plans.display_name || currentSubscription.subscription_plans.name,
        new_plan_name: newPlan.display_name || newPlan.name,
        original_due_date: periodEnd.toISOString().split('T')[0],
        payment_url: paymentData.bankSlipUrl,
        payment_barcode: paymentData.identificationField,
        qr_code: paymentData.pixQrCodeUrl || paymentData.qrCode
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in upgrade-subscription:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
