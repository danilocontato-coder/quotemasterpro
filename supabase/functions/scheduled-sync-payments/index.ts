import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔄 Iniciando sincronização automática de pagamentos...');

    // Buscar pagamentos pendentes ou vencidos que tenham asaas_payment_id
    const { data: paymentsToSync, error } = await supabaseClient
      .from('payments')
      .select('id, asaas_payment_id, status')
      .in('status', ['pending', 'overdue', 'waiting_confirmation'])
      .not('asaas_payment_id', 'is', null)
      .limit(50); // Limitar a 50 por execução

    if (error) {
      console.error('❌ Erro ao buscar pagamentos:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!paymentsToSync || paymentsToSync.length === 0) {
      console.log('✅ Nenhum pagamento para sincronizar');
      return new Response(JSON.stringify({ 
        message: 'Nenhum pagamento para sincronizar',
        synced: 0,
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`📦 ${paymentsToSync.length} pagamentos para sincronizar`);

    // Sincronizar cada pagamento chamando a função existente
    const results = await Promise.allSettled(
      paymentsToSync.map(async (payment) => {
        try {
          const response = await supabaseClient.functions.invoke('sync-asaas-payment-status', {
            body: { payment_id: payment.id }
          });

          if (response.error) {
            console.error(`❌ Erro ao sincronizar ${payment.id}:`, response.error);
            return { success: false, payment_id: payment.id, error: response.error };
          }

          console.log(`✅ Sincronizado: ${payment.id}`);
          return { success: true, payment_id: payment.id, data: response.data };
        } catch (err) {
          console.error(`❌ Exceção ao sincronizar ${payment.id}:`, err);
          return { success: false, payment_id: payment.id, error: String(err) };
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
    const failed = results.length - successful;

    console.log(`📊 Sincronização concluída: ${successful} sucesso, ${failed} falhas`);

    // Registrar log de sincronização
    await supabaseClient.from('audit_logs').insert({
      action: 'SCHEDULED_SYNC_COMPLETED',
      entity_type: 'payments',
      entity_id: 'scheduled-sync',
      panel_type: 'admin',
      details: {
        total: paymentsToSync.length,
        successful,
        failed,
        timestamp: new Date().toISOString()
      }
    });

    return new Response(JSON.stringify({
      message: 'Sincronização automática concluída',
      total: paymentsToSync.length,
      successful,
      failed,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro na sincronização automática:', error);
    return new Response(JSON.stringify({ 
      error: String(error),
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
