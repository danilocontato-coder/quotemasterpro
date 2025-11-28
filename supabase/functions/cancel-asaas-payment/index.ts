import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AsaasConfig {
  apiKey: string;
  baseUrl: string;
}

async function getAsaasConfig(supabase: any, clientId: string): Promise<AsaasConfig | null> {
  try {
    // Tentar buscar chave do cliente
    const { data: clientData } = await supabase
      .from('clients')
      .select('settings')
      .eq('id', clientId)
      .single();

    if (clientData?.settings?.asaas_api_key) {
      return {
        apiKey: clientData.settings.asaas_api_key,
        baseUrl: clientData.settings.asaas_environment === 'production' 
          ? 'https://api.asaas.com/v3' 
          : 'https://sandbox.asaas.com/api/v3'
      };
    }

    // Fallback para variável de ambiente
    const apiKey = Deno.env.get('ASAAS_API_KEY');
    if (apiKey) {
      return {
        apiKey,
        baseUrl: Deno.env.get('ASAAS_ENVIRONMENT') === 'production'
          ? 'https://api.asaas.com/v3'
          : 'https://sandbox.asaas.com/api/v3'
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting Asaas config:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { quoteId, paymentId } = await req.json();

    if (!quoteId && !paymentId) {
      return new Response(
        JSON.stringify({ error: 'quoteId ou paymentId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔴 [CANCEL-ASAAS] Iniciando cancelamento:', { quoteId, paymentId });

    // Buscar o pagamento
    let paymentQuery = supabase
      .from('payments')
      .select('id, asaas_payment_id, status, quote_id, client_id, supplier_id, amount, friendly_id')
      .not('status', 'in', '("cancelled","completed","refunded")');

    if (paymentId) {
      paymentQuery = paymentQuery.eq('id', paymentId);
    } else if (quoteId) {
      paymentQuery = paymentQuery.eq('quote_id', quoteId);
    }

    const { data: payments, error: paymentError } = await paymentQuery;

    if (paymentError) {
      console.error('❌ [CANCEL-ASAAS] Erro ao buscar pagamento:', paymentError);
      throw paymentError;
    }

    if (!payments || payments.length === 0) {
      console.log('⚠️ [CANCEL-ASAAS] Nenhum pagamento encontrado para cancelar');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhum pagamento pendente encontrado para cancelar' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const payment of payments) {
      console.log('📝 [CANCEL-ASAAS] Processando pagamento:', {
        id: payment.id,
        friendly_id: payment.friendly_id,
        asaas_payment_id: payment.asaas_payment_id,
        status: payment.status
      });

      let asaasCancelled = false;
      let asaasError = null;

      // Se tem asaas_payment_id, tentar cancelar no Asaas
      if (payment.asaas_payment_id) {
        const asaasConfig = await getAsaasConfig(supabase, payment.client_id);

        if (asaasConfig) {
          try {
            // Primeiro verificar status atual no Asaas
            const statusResponse = await fetch(
              `${asaasConfig.baseUrl}/payments/${payment.asaas_payment_id}`,
              {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'access_token': asaasConfig.apiKey
                }
              }
            );

            const statusData = await statusResponse.json();
            console.log('📊 [CANCEL-ASAAS] Status atual no Asaas:', statusData.status);

            // Só tentar cancelar se estiver PENDING ou OVERDUE
            if (['PENDING', 'OVERDUE'].includes(statusData.status)) {
              const cancelResponse = await fetch(
                `${asaasConfig.baseUrl}/payments/${payment.asaas_payment_id}`,
                {
                  method: 'DELETE',
                  headers: {
                    'Content-Type': 'application/json',
                    'access_token': asaasConfig.apiKey
                  }
                }
              );

              if (cancelResponse.ok) {
                const cancelData = await cancelResponse.json();
                console.log('✅ [CANCEL-ASAAS] Pagamento cancelado no Asaas:', cancelData);
                asaasCancelled = true;
              } else {
                const errorData = await cancelResponse.json();
                console.error('❌ [CANCEL-ASAAS] Erro ao cancelar no Asaas:', errorData);
                asaasError = errorData.errors?.[0]?.description || 'Erro desconhecido';
                
                // Se já está cancelado no Asaas, considerar sucesso
                if (errorData.errors?.[0]?.code === 'invalid_action') {
                  asaasCancelled = true;
                }
              }
            } else if (['CANCELLED', 'DELETED', 'REFUNDED'].includes(statusData.status)) {
              console.log('✅ [CANCEL-ASAAS] Pagamento já cancelado no Asaas');
              asaasCancelled = true;
            } else {
              asaasError = `Pagamento com status ${statusData.status} não pode ser cancelado`;
              console.warn('⚠️ [CANCEL-ASAAS]', asaasError);
            }
          } catch (error) {
            console.error('❌ [CANCEL-ASAAS] Erro na API Asaas:', error);
            asaasError = error.message;
          }
        } else {
          console.warn('⚠️ [CANCEL-ASAAS] Config Asaas não encontrada');
        }
      }

      // Atualizar status do pagamento local
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id);

      if (updateError) {
        console.error('❌ [CANCEL-ASAAS] Erro ao atualizar pagamento local:', updateError);
      } else {
        console.log('✅ [CANCEL-ASAAS] Pagamento local atualizado para cancelled');
      }

      // Buscar quote para notificação
      const { data: quote } = await supabase
        .from('quotes')
        .select('local_code, supplier_id, client_id')
        .eq('id', payment.quote_id)
        .single();

      // Notificar fornecedor
      if (payment.supplier_id) {
        const { data: supplierProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('supplier_id', payment.supplier_id)
          .single();

        if (supplierProfile) {
          await supabase.from('notifications').insert({
            user_id: supplierProfile.id,
            supplier_id: payment.supplier_id,
            title: 'Cobrança Cancelada',
            message: `A cobrança ${payment.friendly_id || '#' + payment.id.substring(0, 8)} da cotação #${quote?.local_code || payment.quote_id.substring(0, 8)} foi cancelada pelo cliente.`,
            type: 'payment_cancelled',
            priority: 'high',
            metadata: {
              payment_id: payment.id,
              quote_id: payment.quote_id,
              amount: payment.amount,
              asaas_cancelled: asaasCancelled
            }
          });
          console.log('📨 [CANCEL-ASAAS] Notificação enviada ao fornecedor');
        }
      }

      // Registrar no audit_logs
      await supabase.from('audit_logs').insert({
        user_id: null, // Sistema
        action: 'PAYMENT_CANCELLED',
        entity_type: 'payments',
        entity_id: payment.id,
        panel_type: 'system',
        details: {
          quote_id: payment.quote_id,
          quote_code: quote?.local_code,
          amount: payment.amount,
          asaas_payment_id: payment.asaas_payment_id,
          asaas_cancelled: asaasCancelled,
          asaas_error: asaasError,
          reason: 'quote_cancelled'
        }
      });

      results.push({
        payment_id: payment.id,
        friendly_id: payment.friendly_id,
        asaas_cancelled: asaasCancelled,
        asaas_error: asaasError,
        local_cancelled: !updateError
      });
    }

    console.log('✅ [CANCEL-ASAAS] Processamento concluído:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${results.length} pagamento(s) processado(s)`,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [CANCEL-ASAAS] Erro geral:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
