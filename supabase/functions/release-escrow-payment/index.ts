import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')!
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { paymentId, deliveryConfirmed, notes } = await req.json()

    // Buscar dados do pagamento
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        suppliers!inner(id, name, asaas_wallet_id),
        clients!inner(id, name)
      `)
      .eq('id', paymentId)
      .eq('status', 'in_escrow')
      .single()

    if (paymentError || !payment) {
      return new Response(
        JSON.stringify({ error: 'Pagamento não encontrado ou não está em escrow' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar permissão
    const { data: profile } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', user.id)
      .single()

    if (profile?.client_id !== payment.client_id) {
      return new Response(
        JSON.stringify({ error: 'Sem permissão para liberar este pagamento' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Com Asaas, o split já foi feito automaticamente quando o cliente pagou
    // Aqui só atualizamos o status para indicar que está liberado para transferência
    await supabase
      .from('payments')
      .update({
        status: 'completed',
        transfer_status: 'completed', // No Asaas, transferência é automática
        transfer_date: new Date().toISOString(),
        release_reason: deliveryConfirmed ? 'client_confirmed' : 'admin_override',
        transfer_notes: notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId)

    // Log de auditoria
    await supabase
      .from('audit_logs')
      .insert({
        action: 'ESCROW_RELEASED',
        entity_type: 'payments',
        entity_id: paymentId,
        user_id: user.id,
        details: {
          amount: payment.amount,
          delivery_confirmed: deliveryConfirmed,
          release_reason: deliveryConfirmed ? 'client_confirmed' : 'admin_override',
          notes,
        },
      })

    // Notificar fornecedor
    await supabase.rpc('create_notification', {
      p_user_id: payment.supplier_id,
      p_title: 'Fundos Liberados!',
      p_message: `R$ ${payment.amount} foram liberados e já estão na sua conta Asaas.`,
      p_type: 'payment',
      p_priority: 'high',
      p_action_url: '/payments',
    })

    console.log(`Escrow liberado para pagamento ${paymentId}`)

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: paymentId,
        amount: payment.amount,
        message: 'Pagamento liberado com sucesso. Fundos transferidos automaticamente.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error releasing escrow payment:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
