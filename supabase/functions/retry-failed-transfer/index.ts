import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { getAsaasConfig } from '../_shared/asaas-utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { paymentId } = await req.json();

    if (!paymentId) {
      throw new Error('paymentId é obrigatório');
    }

    console.log(`🔄 [RETRY-TRANSFER] Tentando reprocessar transferência para pagamento: ${paymentId}`);

    // Buscar pagamento
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .select(`
        *,
        suppliers!payments_supplier_id_fkey(id, name, asaas_wallet_id),
        clients(id, name),
        quotes(id, local_code, title)
      `)
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      throw new Error(`Pagamento não encontrado: ${paymentError?.message}`);
    }

    console.log('📋 Payment data:', {
      id: payment.id,
      status: payment.status,
      transfer_status: payment.transfer_status,
      asaas_transfer_id: payment.asaas_transfer_id,
      supplier_net_amount: payment.supplier_net_amount
    });

    // Validações
    if (payment.status !== 'completed') {
      throw new Error('Pagamento deve estar com status "completed" para transferência');
    }

    if (payment.transfer_status === 'completed' && payment.asaas_transfer_id) {
      throw new Error('Transferência já foi concluída');
    }

    if (!payment.suppliers?.asaas_wallet_id) {
      throw new Error('Fornecedor não possui wallet Asaas configurada');
    }

    // Obter configuração Asaas
    const { apiKey, baseUrl } = await getAsaasConfig(supabaseClient);

    const supplierNetAmount = payment.supplier_net_amount || 
      (payment.base_amount || payment.amount) * 0.95;

    console.log('💸 Executando transferência Asaas:', {
      walletId: payment.suppliers.asaas_wallet_id,
      value: supplierNetAmount
    });

    // Criar transferência no Asaas
    const transferResponse = await fetch(`${baseUrl}/transfers`, {
      method: 'POST',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        value: supplierNetAmount,
        walletId: payment.suppliers.asaas_wallet_id,
        description: `Pagamento ${payment.id} - Cotação ${payment.quotes?.local_code || payment.quote_id}`
      })
    });

    if (!transferResponse.ok) {
      const errorData = await transferResponse.json();
      console.error('❌ Erro Asaas API:', errorData);
      throw new Error(errorData.errors?.[0]?.description || 'Erro ao criar transferência no Asaas');
    }

    const transferData = await transferResponse.json();
    console.log('✅ Transferência Asaas criada:', transferData);

    // Atualizar pagamento com dados da transferência
    const { error: updateError } = await supabaseClient
      .from('payments')
      .update({
        asaas_transfer_id: transferData.id,
        transfer_status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId);

    if (updateError) {
      console.error('⚠️ Erro ao atualizar payment, mas transferência foi criada:', updateError);
    }

    // Log de auditoria
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: null,
        action: 'TRANSFER_RETRY_SUCCESS',
        entity_type: 'payments',
        entity_id: paymentId,
        panel_type: 'system',
        details: {
          transfer_id: transferData.id,
          amount: supplierNetAmount,
          wallet_id: payment.suppliers.asaas_wallet_id,
          retry_reason: 'Manual retry from admin'
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Transferência executada com sucesso',
        transferId: transferData.id,
        amount: supplierNetAmount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in retry-failed-transfer:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
