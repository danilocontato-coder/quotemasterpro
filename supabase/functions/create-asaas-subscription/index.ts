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

    const { subscription_id } = await req.json();

    console.log(`Creating Asaas subscription for: ${subscription_id}`);

    // Buscar assinatura e dados do cliente
    const { data: subscription, error: subError } = await supabaseClient
      .from('subscriptions')
      .select(`
        *,
        clients:client_id(id, name, cnpj, email, phone, address),
        suppliers:supplier_id(id, name, cnpj, email, phone),
        subscription_plans!plan_id(id, name, monthly_price, yearly_price)
      `)
      .eq('id', subscription_id)
      .single();

    if (subError || !subscription) {
      throw new Error(`Subscription not found: ${subError?.message}`);
    }

    const { apiKey, baseUrl, environment } = await getAsaasConfig(supabaseClient);

    const entityData = subscription.clients || subscription.suppliers;
    if (!entityData) {
      throw new Error('No client or supplier data found');
    }

    // 1. Criar ou buscar customer no Asaas
    let asaasCustomerId = subscription.asaas_customer_id;

    if (!asaasCustomerId) {
      console.log('Creating Asaas customer...');
      const customerResponse = await fetch(`${baseUrl}/customers`, {
        method: 'POST',
        headers: {
          'access_token': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: entityData.name,
          cpfCnpj: entityData.cnpj?.replace(/\D/g, ''),
          email: entityData.email,
          phone: entityData.phone?.replace(/\D/g, ''),
          postalCode: entityData.address?.cep?.replace(/\D/g, ''),
          address: entityData.address?.street,
          addressNumber: entityData.address?.number,
          complement: entityData.address?.complement,
          province: entityData.address?.neighborhood,
          externalReference: subscription.client_id || subscription.supplier_id
        })
      });

      if (!customerResponse.ok) {
        const errorData = await customerResponse.json();
        throw new Error(`Failed to create customer: ${errorData.errors?.[0]?.description || customerResponse.statusText}`);
      }

      const customerData = await customerResponse.json();
      asaasCustomerId = customerData.id;
      console.log(`Customer created: ${asaasCustomerId}`);
    }

    // 2. Calcular valor baseado no ciclo de cobrança
    const plan = subscription.subscription_plans;
    let subscriptionValue: number;
    let cycle: string;

    switch (subscription.billing_cycle) {
      case 'monthly':
        subscriptionValue = plan.monthly_price;
        cycle = 'MONTHLY';
        break;
      case 'quarterly':
        subscriptionValue = plan.quarterly_price || plan.monthly_price * 3;
        cycle = 'QUARTERLY';
        break;
      case 'yearly':
        subscriptionValue = plan.yearly_price || plan.monthly_price * 12;
        cycle = 'YEARLY';
        break;
      default:
        subscriptionValue = plan.monthly_price;
        cycle = 'MONTHLY';
    }

    // 3. Buscar configuração de tipo de cobrança
    const { data: settings } = await supabaseClient
      .from('financial_settings')
      .select('asaas_billing_type')
      .single();

    const billingType = settings?.asaas_billing_type || 'BOLETO';

    // 4. Calcular próxima data de vencimento com regra D+2 e dia de aniversário
    const minDueDate = new Date();
    minDueDate.setDate(minDueDate.getDate() + 2); // D+2

    // Calcular data de vencimento baseada no dia de aniversário (current_period_start)
    const periodStart = new Date(subscription.current_period_start);
    const configuredDueDate = new Date(periodStart);
    configuredDueDate.setMonth(configuredDueDate.getMonth() + 1); // Mesmo dia do mês seguinte

    // Usar a data mais tardia entre D+2 e a data configurada
    const nextDueDate = configuredDueDate > minDueDate ? configuredDueDate : minDueDate;
    const nextDueDateStr = nextDueDate.toISOString().split('T')[0];

    console.log(`📅 Data de vencimento: Aniversário=${periodStart.toISOString().split('T')[0]}, Próximo=${configuredDueDate.toISOString().split('T')[0]}, Mínima (D+2)=${minDueDate.toISOString().split('T')[0]}, Escolhida=${nextDueDateStr}`);

    // 5. Criar assinatura recorrente no Asaas
    console.log(`Creating Asaas subscription with value: ${subscriptionValue}`);
    const subscriptionResponse = await fetch(`${baseUrl}/subscriptions`, {
      method: 'POST',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType,
        cycle,
        value: subscriptionValue,
        nextDueDate: nextDueDateStr,
        description: `Assinatura Cotiz - ${plan.name}`,
        externalReference: subscription_id
      })
    });

    if (!subscriptionResponse.ok) {
      const errorData = await subscriptionResponse.json();
      throw new Error(`Failed to create subscription: ${errorData.errors?.[0]?.description || subscriptionResponse.statusText}`);
    }

    const asaasSubscription = await subscriptionResponse.json();
    console.log(`Asaas subscription created: ${asaasSubscription.id}`);

    // 6. Atualizar subscription no Supabase
    const { error: updateError } = await supabaseClient
      .from('subscriptions')
      .update({
        asaas_subscription_id: asaasSubscription.id,
        asaas_customer_id: asaasCustomerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription_id);

    if (updateError) {
      throw updateError;
    }

    // 7. Log de auditoria
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'ASAAS_SUBSCRIPTION_CREATED',
        entity_type: 'subscriptions',
        entity_id: subscription_id,
        panel_type: 'admin',
        details: {
          asaas_subscription_id: asaasSubscription.id,
          asaas_customer_id: asaasCustomerId,
          value: subscriptionValue,
          cycle,
          billing_type: billingType,
          environment
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        asaas_subscription_id: asaasSubscription.id,
        asaas_customer_id: asaasCustomerId,
        next_due_date: asaasSubscription.nextDueDate
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in create-asaas-subscription:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
