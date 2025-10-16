import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getAsaasConfig } from '../_shared/asaas-utils.ts';

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { clientId } = await req.json();

    if (!clientId) {
      throw new Error('clientId é obrigatório');
    }

    // Buscar dados do cliente
    const { data: client, error: clientError } = await supabaseClient
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError) {
      console.error('Erro ao buscar cliente:', clientError);
      throw new Error('Cliente não encontrado');
    }

    // Buscar configuração do Asaas
    const asaasConfig = await getAsaasConfig(supabaseClient);

    // Preparar dados do cliente para Asaas
    const customerData: any = {
      name: client.company_name || client.name,
      email: client.email,
      cpfCnpj: client.cnpj?.replace(/\D/g, ''), // Remove formatação
      phone: client.phone?.replace(/\D/g, ''),
    };

    // Se tiver endereço, adicionar
    if (client.address) {
      let addressObj;
      if (typeof client.address === 'string') {
        // Se for string, tentar parsear ou usar como está
        try {
          addressObj = JSON.parse(client.address);
        } catch {
          // Se não conseguir parsear, criar objeto básico
          addressObj = { address: client.address };
        }
      } else {
        addressObj = client.address;
      }

      if (addressObj) {
        customerData.address = addressObj.street || addressObj.address || '';
        customerData.addressNumber = addressObj.number || 'S/N';
        customerData.province = addressObj.neighborhood || '';
        customerData.postalCode = addressObj.zipCode?.replace(/\D/g, '') || '';
        customerData.complement = addressObj.complement || '';
      }
    }

    console.log('Criando cliente no Asaas:', customerData);

    // Criar cliente no Asaas
    const asaasResponse = await fetch(`${asaasConfig.baseUrl}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasConfig.apiKey,
      },
      body: JSON.stringify(customerData),
    });

    if (!asaasResponse.ok) {
      const errorData = await asaasResponse.json();
      console.error('Erro ao criar cliente no Asaas:', errorData);
      throw new Error(`Erro Asaas: ${errorData.errors?.[0]?.description || 'Erro desconhecido'}`);
    }

    const asaasCustomer = await asaasResponse.json();
    console.log('Cliente criado no Asaas:', asaasCustomer);

    // Buscar informações do plano do cliente
    const { data: planData } = await supabaseClient
      .from('subscription_plans')
      .select('price')
      .eq('id', client.subscription_plan_id)
      .single();

    const planPrice = planData?.price || 0;

    // Criar assinatura recorrente no Asaas
    let asaasSubscriptionId = null;
    if (planPrice > 0) {
      console.log(`Criando assinatura recorrente no Asaas - Valor: R$ ${planPrice}`);
      
      const subscriptionData = {
        customer: asaasCustomer.id,
        billingType: 'BOLETO', // Pode ser: BOLETO, CREDIT_CARD, PIX, UNDEFINED
        value: planPrice,
        nextDueDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0], // Próximo mês
        cycle: 'MONTHLY', // Recorrência mensal
        description: `Assinatura ${client.subscription_plan_id}`,
      };

      const subscriptionResponse = await fetch(`${asaasConfig.baseUrl}/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': asaasConfig.apiKey,
        },
        body: JSON.stringify(subscriptionData),
      });

      if (subscriptionResponse.ok) {
        const asaasSubscription = await subscriptionResponse.json();
        asaasSubscriptionId = asaasSubscription.id;
        console.log('Assinatura criada no Asaas:', asaasSubscription);
      } else {
        const errorData = await subscriptionResponse.json();
        console.error('Erro ao criar assinatura no Asaas:', errorData);
      }
    }

    // Atualizar cliente no Supabase com o ID do Asaas e da assinatura
    const { error: updateError } = await supabaseClient
      .from('clients')
      .update({ 
        asaas_customer_id: asaasCustomer.id,
        asaas_subscription_id: asaasSubscriptionId,
        updated_at: new Date().toISOString()
      })
      .eq('id', clientId);

    if (updateError) {
      console.error('Erro ao atualizar cliente com dados Asaas:', updateError);
    }

    // Log de auditoria
    await supabaseClient
      .from('audit_logs')
      .insert({
        action: 'ASAAS_CUSTOMER_CREATED',
        entity_type: 'clients',
        entity_id: clientId,
        panel_type: 'system',
        details: {
          asaas_customer_id: asaasCustomer.id,
          asaas_subscription_id: asaasSubscriptionId,
          customer_name: asaasCustomer.name,
          plan_price: planPrice,
          timestamp: new Date().toISOString()
        }
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        asaasCustomerId: asaasCustomer.id,
        asaasSubscriptionId: asaasSubscriptionId,
        customer: asaasCustomer,
        planPrice: planPrice
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Erro ao criar cliente no Asaas:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
