import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    
    console.log('🚀 [CONFIRM-DELIVERY] Início da requisição', {
      timestamp: new Date().toISOString(),
      hasAuthHeader: !!authHeader,
      method: req.method
    });
    
    if (!authHeader) {
      console.error('❌ [CONFIRM-DELIVERY] Authorization header ausente');
      return new Response(
        JSON.stringify({ error: 'Authorization header is required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { confirmation_code } = await req.json();
    
    console.log('🔍 [CONFIRM-DELIVERY] Dados recebidos', {
      confirmation_code,
      hasConfirmationCode: !!confirmation_code
    });

    if (!confirmation_code) {
      console.error('❌ [CONFIRM-DELIVERY] Código de confirmação ausente');
      return new Response(
        JSON.stringify({ error: 'Código de confirmação é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from JWT
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      console.error('❌ [CONFIRM-DELIVERY] Token inválido', {
        error: userError?.message
      });
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔐 [CONFIRM-DELIVERY] Usuário autenticado', {
      user_id: user.id,
      user_email: user.email
    });

    // Buscar código de confirmação válido
    console.log('🔍 [CONFIRM-DELIVERY] Buscando código de confirmação', {
      confirmation_code,
      current_time: new Date().toISOString()
    });
    
    const { data: confirmationData, error: confirmationError } = await supabase
      .from('delivery_confirmations')
      .select(`
        *,
        deliveries!inner(
          id,
          client_id,
          supplier_id,
          status,
          quote_id
        )
      `)
      .eq('confirmation_code', confirmation_code)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (confirmationError || !confirmationData) {
      // Verificar se o código existe mas já foi usado ou expirou
      const { data: usedCode } = await supabase
        .from('delivery_confirmations')
        .select('*, deliveries(*)')
        .eq('confirmation_code', confirmation_code)
        .maybeSingle();

      if (usedCode) {
        if (usedCode.is_used) {
          console.error('❌ [CONFIRM-DELIVERY] Código já utilizado', {
            confirmation_code,
            confirmed_at: usedCode.confirmed_at,
            confirmed_by: usedCode.confirmed_by
          });
          
          return new Response(
            JSON.stringify({ 
              error: 'Este código já foi utilizado anteriormente',
              code: 'CODE_ALREADY_USED',
              confirmed_at: usedCode.confirmed_at
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (new Date(usedCode.expires_at) < new Date()) {
          console.error('❌ [CONFIRM-DELIVERY] Código expirado', {
            confirmation_code,
            expires_at: usedCode.expires_at
          });
          
          return new Response(
            JSON.stringify({ 
              error: 'Este código expirou',
              code: 'CODE_EXPIRED',
              expired_at: usedCode.expires_at
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      
      // Código não encontrado
      console.error('❌ [CONFIRM-DELIVERY] Código não encontrado', {
        confirmation_code,
        timestamp: new Date().toISOString()
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Código de confirmação não encontrado',
          code: 'CODE_NOT_FOUND'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ [CONFIRM-DELIVERY] Código encontrado', {
      delivery_id: confirmationData.delivery_id,
      is_used: confirmationData.is_used,
      expires_at: confirmationData.expires_at,
      delivery_status: confirmationData.deliveries.status,
      client_id: confirmationData.deliveries.client_id
    });

    // Verificar se usuário tem permissão (cliente da entrega)
    console.log('🔐 [CONFIRM-DELIVERY] Verificando permissões', {
      user_id: user.id
    });
    
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', user.id)
      .single();

    console.log('🔐 [CONFIRM-DELIVERY] Permissões obtidas', {
      user_client_id: userProfile?.client_id,
      delivery_client_id: confirmationData.deliveries.client_id,
      has_permission: userProfile?.client_id === confirmationData.deliveries.client_id
    });

    if (!userProfile || userProfile.client_id !== confirmationData.deliveries.client_id) {
      console.error('❌ [CONFIRM-DELIVERY] Permissão negada', {
        user_id: user.id,
        user_client_id: userProfile?.client_id,
        delivery_client_id: confirmationData.deliveries.client_id
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Você não tem permissão para confirmar esta entrega',
          code: 'PERMISSION_DENIED'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Atualizar código como usado
    console.log('📝 [CONFIRM-DELIVERY] Marcando código como usado', {
      confirmation_id: confirmationData.id,
      confirmed_at: new Date().toISOString(),
      confirmed_by: user.id
    });
    
    const { error: updateCodeError } = await supabase
      .from('delivery_confirmations')
      .update({
        is_used: true,
        confirmed_at: new Date().toISOString(),
        confirmed_by: user.id
      })
      .eq('id', confirmationData.id);

    if (updateCodeError) {
      console.error('❌ [CONFIRM-DELIVERY] Erro ao marcar código', updateCodeError);
      throw updateCodeError;
    }

    console.log('✅ [CONFIRM-DELIVERY] Código marcado como usado');

    // Atualizar status da entrega para delivered
    console.log('📦 [CONFIRM-DELIVERY] Atualizando status da entrega', {
      delivery_id: confirmationData.delivery_id,
      old_status: confirmationData.deliveries.status,
      new_status: 'delivered',
      actual_delivery_date: new Date().toISOString()
    });
    
    const { error: updateDeliveryError } = await supabase
      .from('deliveries')
      .update({
        status: 'delivered',
        actual_delivery_date: new Date().toISOString()
      })
      .eq('id', confirmationData.delivery_id);

    if (updateDeliveryError) {
      console.error('❌ [CONFIRM-DELIVERY] Erro ao atualizar entrega', updateDeliveryError);
      throw updateDeliveryError;
    }

    console.log('✅ [CONFIRM-DELIVERY] Entrega atualizada para delivered');

    // Liberar pagamento (mover de escrow para completed)
    console.log('💰 [CONFIRM-DELIVERY] Liberando pagamento', {
      quote_id: confirmationData.deliveries.quote_id,
      old_status: 'in_escrow',
      new_status: 'completed',
      completed_at: new Date().toISOString()
    });
    
    const { error: updatePaymentError } = await supabase
      .from('payments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('quote_id', confirmationData.deliveries.quote_id)
      .eq('status', 'in_escrow');

    if (updatePaymentError) {
      console.error('❌ [CONFIRM-DELIVERY] Erro ao atualizar pagamento:', updatePaymentError);
    } else {
      console.log('✅ [CONFIRM-DELIVERY] Pagamento liberado');
    }

    // Verificar se todas as atualizações foram bem-sucedidas
    if (updateDeliveryError || updatePaymentError) {
      console.error('⚠️ [CONFIRM-DELIVERY] Falha parcial detectada - revertendo código', {
        delivery_error: updateDeliveryError?.message,
        payment_error: updatePaymentError?.message
      });
      
      // Reverter marcação do código
      await supabase
        .from('delivery_confirmations')
        .update({
          is_used: false,
          confirmed_at: null,
          confirmed_by: null
        })
        .eq('id', confirmationData.id);
      
      throw new Error('Falha ao atualizar entrega ou pagamento');
    }

    // Notificar fornecedor sobre entrega confirmada
    console.log('📧 [CONFIRM-DELIVERY] Enviando notificação ao fornecedor', {
      supplier_id: confirmationData.deliveries.supplier_id,
      delivery_id: confirmationData.delivery_id
    });
    
    const { error: notificationError } = await supabase.functions.invoke('create-notification', {
      body: {
        user_id: confirmationData.deliveries.supplier_id,
        title: 'Entrega Confirmada',
        message: `O cliente confirmou o recebimento da entrega. Pagamento liberado!`,
        type: 'delivery_confirmed',
        priority: 'high',
        metadata: {
          delivery_id: confirmationData.delivery_id,
          quote_id: confirmationData.deliveries.quote_id,
          payment_amount: confirmationData.deliveries.payments?.amount
        }
      }
    });

    if (notificationError) {
      console.error('⚠️ [CONFIRM-DELIVERY] Erro ao enviar notificação (não crítico)', notificationError);
    } else {
      console.log('✅ [CONFIRM-DELIVERY] Notificação enviada');
    }

    // Log de auditoria
    console.log('📝 [CONFIRM-DELIVERY] Criando log de auditoria');
    
    await supabase
      .from('audit_logs')
      .insert({
        action: 'DELIVERY_CONFIRMED',
        entity_type: 'deliveries',
        entity_id: confirmationData.delivery_id,
        user_id: user.id,
        panel_type: 'client',
        details: {
          confirmation_code,
          quote_id: confirmationData.deliveries.quote_id,
          payment_released: true
        }
      });

    console.log('✅ [CONFIRM-DELIVERY] Confirmação concluída com sucesso', {
      delivery_id: confirmationData.delivery_id,
      payment_released: true,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Entrega confirmada com sucesso! Pagamento liberado para o fornecedor.',
        delivery_id: confirmationData.delivery_id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ [CONFIRM-DELIVERY] Erro na confirmação', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});