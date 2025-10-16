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

    console.log(`🗑️ Iniciando exclusão do cliente ${clientId} no Asaas`);

    // Buscar dados do cliente incluindo asaas_customer_id
    const { data: client, error: clientError } = await supabaseClient
      .from('clients')
      .select('asaas_customer_id, asaas_subscription_id, name, company_name')
      .eq('id', clientId)
      .single();

    if (clientError) {
      console.error('Erro ao buscar cliente:', clientError);
      throw new Error('Cliente não encontrado');
    }

    // Se não tem asaas_customer_id, não precisa deletar no Asaas
    if (!client.asaas_customer_id) {
      console.log('⚠️ Cliente não possui asaas_customer_id, pulando exclusão no Asaas');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Cliente não estava cadastrado no Asaas',
          skipped: true
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Buscar configuração do Asaas
    const asaasConfig = await getAsaasConfig(supabaseClient);

    // Se tem assinatura ativa, cancelar primeiro
    if (client.asaas_subscription_id) {
      console.log(`📋 Cancelando assinatura ${client.asaas_subscription_id} no Asaas`);
      
      const cancelSubscriptionResponse = await fetch(
        `${asaasConfig.baseUrl}/subscriptions/${client.asaas_subscription_id}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'access_token': asaasConfig.apiKey,
          },
        }
      );

      if (!cancelSubscriptionResponse.ok) {
        const errorData = await cancelSubscriptionResponse.json();
        console.error('⚠️ Erro ao cancelar assinatura no Asaas:', errorData);
        // Continuar mesmo se falhar - pode já estar cancelada
      } else {
        console.log('✅ Assinatura cancelada no Asaas');
      }
    }

    // Deletar cliente no Asaas
    console.log(`🗑️ Deletando cliente ${client.asaas_customer_id} no Asaas`);
    
    const deleteCustomerResponse = await fetch(
      `${asaasConfig.baseUrl}/customers/${client.asaas_customer_id}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'access_token': asaasConfig.apiKey,
        },
      }
    );

    if (!deleteCustomerResponse.ok) {
      const errorData = await deleteCustomerResponse.json();
      console.error('❌ Erro ao deletar cliente no Asaas:', errorData);
      
      // Se o erro for "not found", considerar sucesso (já foi deletado)
      if (deleteCustomerResponse.status === 404) {
        console.log('ℹ️ Cliente não encontrado no Asaas (já foi deletado)');
      } else {
        throw new Error(`Erro Asaas: ${errorData.errors?.[0]?.description || 'Erro desconhecido'}`);
      }
    } else {
      console.log('✅ Cliente deletado no Asaas com sucesso');
    }

    // Log de auditoria
    await supabaseClient
      .from('audit_logs')
      .insert({
        action: 'ASAAS_CUSTOMER_DELETED',
        entity_type: 'clients',
        entity_id: clientId,
        panel_type: 'system',
        details: {
          asaas_customer_id: client.asaas_customer_id,
          asaas_subscription_id: client.asaas_subscription_id,
          customer_name: client.company_name || client.name,
          timestamp: new Date().toISOString()
        }
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Cliente deletado no Asaas com sucesso',
        asaasCustomerId: client.asaas_customer_id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Erro ao deletar cliente no Asaas:', error);
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
