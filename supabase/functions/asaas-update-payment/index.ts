import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validar usuário e permissões
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extrair token e validar usuário
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error('❌ Erro de autenticação:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar se usuário é admin
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      console.error('❌ Acesso negado: usuário não é admin');
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`✅ Usuário autenticado: ${user.email} (Admin)`);

    const { paymentId, dueDate, value, description } = await req.json();

    if (!paymentId) {
      throw new Error('paymentId é obrigatório');
    }

    const asaasConfig = await getAsaasConfig(supabaseClient);

    const updateData: any = {};
    if (dueDate) updateData.dueDate = dueDate;
    if (value) updateData.value = value;
    if (description) updateData.description = description;

    console.log(`📝 Atualizando cobrança ${paymentId}:`, updateData);

    const response = await fetch(`${asaasConfig.baseUrl}/payments/${paymentId}`, {
      method: 'POST',
      headers: {
        'access_token': asaasConfig.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Erro ao atualizar cobrança:', error);
      throw new Error(`Erro Asaas: ${error}`);
    }

    const updatedPayment = await response.json();
    console.log(`✅ Cobrança ${paymentId} atualizada com sucesso`);

    // Atualizar invoice no banco se existir
    const { data: invoice } = await supabaseClient
      .from('invoices')
      .select('id')
      .eq('asaas_charge_id', paymentId)
      .single();

    if (invoice) {
      await supabaseClient
        .from('invoices')
        .update({
          amount: value || updatedPayment.value,
          due_date: dueDate || updatedPayment.dueDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoice.id);
    }

    return new Response(JSON.stringify(updatedPayment), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
