import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'
import { getAsaasConfig } from '../_shared/asaas-utils.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
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
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { paymentId } = await req.json()
    console.log(`🔄 Regenerando pagamento: ${paymentId}`)

    // Buscar dados do pagamento
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .select(`
        *,
        quotes(id, local_code, title, total, client_name, supplier_id, suppliers(id, name, asaas_wallet_id)),
        suppliers(id, name, asaas_wallet_id),
        clients(id, name)
      `)
      .eq('id', paymentId)
      .in('status', ['processing', 'waiting_confirmation', 'failed'])
      .single()

    if (paymentError || !payment) {
      console.error('❌ Pagamento não encontrado ou status inválido:', paymentError)
      return new Response(
        JSON.stringify({ error: 'Pagamento não encontrado ou status inválido para regeneração' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se tem pagamento Asaas antigo para cancelar
    if (payment.asaas_payment_id) {
      console.log(`🔴 Cancelando pagamento Asaas antigo: ${payment.asaas_payment_id}`)
      
      const asaasConfig = await getAsaasConfig(supabaseClient)
      
      try {
        const deleteResponse = await fetch(
          `${asaasConfig.baseUrl}/payments/${payment.asaas_payment_id}`,
          {
            method: 'DELETE',
            headers: {
              'access_token': asaasConfig.apiKey,
              'Content-Type': 'application/json',
            },
          }
        )

        if (!deleteResponse.ok) {
          console.warn('⚠️ Não foi possível cancelar pagamento antigo, continuando...', await deleteResponse.text())
        } else {
          console.log('✅ Pagamento antigo cancelado com sucesso')
        }
      } catch (cancelError) {
        console.warn('⚠️ Erro ao cancelar pagamento antigo:', cancelError)
      }
    }

    // Resetar payment para pending para permitir nova criação
    const { error: resetError } = await supabaseClient
      .from('payments')
      .update({
        status: 'pending',
        asaas_payment_id: null,
        asaas_invoice_url: null,
        asaas_due_date: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId)

    if (resetError) {
      console.error('❌ Erro ao resetar pagamento:', resetError)
      throw resetError
    }

    console.log('✅ Pagamento resetado para pending, pronto para nova geração')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Pagamento resetado com sucesso. Você pode gerar um novo boleto agora.',
        paymentId 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('💥 Erro ao regenerar pagamento:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao regenerar pagamento' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
