import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { 
      token, 
      supplier_name, 
      supplier_email, 
      total_amount,
      delivery_days,
      shipping_cost,
      warranty_months,
      payment_terms,
      notes,
      attachment_url,
      items,
      visit_date,
      visit_notes
    } = await req.json();

    console.log('🔵 [SUBMIT-QUICK-RESPONSE] Iniciando processamento...');
    console.log('📦 [Quick Response] Dados recebidos:', { 
      token, 
      supplier_name, 
      supplier_email,
      total_amount,
      delivery_days,
      payment_terms,
      notes,
      itemsCount: items?.length || 0,
      has_visit_date: !!visit_date
    });

    // Validar campos obrigatórios
    if (!token || !supplier_name || !supplier_email || !total_amount) {
      console.error('❌ [Quick Response] Campos obrigatórios faltando:', {
        hasToken: !!token,
        hasSupplierName: !!supplier_name,
        hasSupplierEmail: !!supplier_email,
        hasTotalAmount: !!total_amount
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Campos obrigatórios faltando: ' + 
            (!token ? 'token ' : '') +
            (!supplier_name ? 'nome ' : '') +
            (!supplier_email ? 'e-mail ' : '') +
            (!total_amount ? 'valor total' : '')
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }, status: 400 }
      );
    }

    // Validar items
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error('❌ [Quick Response] Itens inválidos ou ausentes');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Nenhum item foi enviado na proposta'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }, status: 400 }
      );
    }

    console.log('🔍 [Quick Response] Buscando token:', token);

    // Buscar token válido (usando short_code) com local_code
    const { data: tokenData, error: tokenError } = await supabase
      .from('quote_tokens')
      .select('quote_id, expires_at, client_id, quotes(local_code)')
      .or(`short_code.eq.${token},full_token.eq.${token}`)
      .maybeSingle();

    if (tokenError) {
      console.error('❌ Erro ao buscar token:', tokenError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao validar token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }, status: 500 }
      );
    }

    if (!tokenData) {
      console.error('❌ Token não encontrado:', token);
      return new Response(
        JSON.stringify({ success: false, error: 'Token não encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }, status: 404 }
      );
    }

    console.log('✅ Token válido encontrado:', { quote_id: tokenData.quote_id, client_id: tokenData.client_id });

    // Validar expiração
    const expiresAt = new Date(tokenData.expires_at);
    if (expiresAt < new Date()) {
      console.error('❌ Token expirado:', { expiresAt, now: new Date() });
      return new Response(
        JSON.stringify({ success: false, error: 'Token expirado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }, status: 403 }
      );
    }

    // Buscar ou criar fornecedor
    console.log('🔍 [Quick Response] Buscando fornecedor:', supplier_email);
    let supplierId: string;
    
    const { data: existingSupplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('email', supplier_email)
      .maybeSingle();

    if (existingSupplier) {
      supplierId = existingSupplier.id;
      console.log('✅ Fornecedor existente encontrado:', supplierId);
    } else {
      console.log('➕ Criando novo fornecedor...');
      
      // Gerar CNPJ temporário único baseado em timestamp + random
      // Formato: QR + timestamp (últimos 10 dígitos) + random (2 dígitos)
      const timestamp = Date.now().toString().slice(-10);
      const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      const tempCnpj = `${timestamp}${random}`;
      
      console.log('🔢 CNPJ temporário gerado:', tempCnpj);
      
      // Criar novo fornecedor
      const { data: newSupplier, error: supplierError } = await supabase
        .from('suppliers')
        .insert({
          name: supplier_name,
          email: supplier_email,
          status: 'active',
          type: 'local',
          client_id: tokenData.client_id,
          cnpj: tempCnpj,
          document_type: 'cpf',
          document_number: tempCnpj
        })
        .select('id')
        .single();

      if (supplierError || !newSupplier) {
        console.error('❌ Erro ao criar fornecedor:', supplierError);
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao criar fornecedor: ' + supplierError?.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }, status: 500 }
        );
      }

      supplierId = newSupplier.id;
      console.log('✅ Novo fornecedor criado:', supplierId);
    }

    // Normalizar shipping_cost
    const shippingCostNum = typeof shipping_cost === 'number'
      ? shipping_cost
      : parseFloat(String(shipping_cost ?? '0').replace(',', '.')) || 0;
    
    console.log('🚚 [Quick Response] shipping_cost recebido:', shipping_cost, '-> normalizado:', shippingCostNum);
    
    // Criar ou atualizar resposta da cotação (UPSERT)
    console.log('💾 [Quick Response] Salvando resposta da cotação (UPSERT)...');
    console.log('📊 [Quick Response] Dados da proposta:', {
      quote_id: tokenData.quote_id,
      supplier_id: supplierId,
      supplier_name: supplier_name,
      total_amount: total_amount,
      delivery_time: delivery_days || 7,
      shipping_cost: shippingCostNum,
      payment_terms: payment_terms || '30 dias',
      items_count: items?.length || 0,
      has_notes: !!notes
    });
    
    console.log('🔄 [Quick Response] Usando UPSERT - irá atualizar se já existir proposta');
    
    const { data: response, error: responseError } = await supabase
      .from('quote_responses')
      .upsert({
        quote_id: tokenData.quote_id,
        supplier_id: supplierId,
        supplier_name: supplier_name,
        total_amount: total_amount,
        delivery_time: delivery_days || 7,
        shipping_cost: shippingCostNum,
        payment_terms: payment_terms || '30 dias',
        items: items || [],
        notes: notes,
        status: 'submitted'
      }, {
        onConflict: 'quote_id,supplier_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (responseError) {
      console.error('❌ Erro ao criar resposta:', responseError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao salvar resposta: ' + responseError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }, status: 500 }
      );
    }

    // Verificar se foi UPDATE ou INSERT
    const wasUpdate = response.created_at !== response.updated_at;
    if (wasUpdate) {
      console.log('🔄 [Quick Response] Proposta ATUALIZADA (já existia)');
    } else {
      console.log('✨ [Quick Response] Nova proposta CRIADA');
    }
    console.log('✅ Resposta salva com sucesso:', response.id);
    
    // NOTA: O trigger trg_sync_supplier_on_response irá automaticamente:
    // 1. Adicionar supplier_id ao selected_supplier_ids da cotação
    // 2. Incrementar suppliers_sent_count
    // 3. Disparar trg_auto_associate_quote_suppliers para criar client_suppliers
    console.log('🔄 Triggers automáticos de sincronização serão disparados pelo banco');

    // Agendar visita técnica se fornecida
    if (visit_date) {
      console.log('📅 [Quick Response] Agendando visita técnica...');
      
      const { error: visitError } = await supabase
        .from('quote_visits')
        .insert({
          quote_id: tokenData.quote_id,
          supplier_id: supplierId,
          client_id: tokenData.client_id,
          scheduled_date: visit_date,
          requested_date: new Date().toISOString(),
          status: 'scheduled',
          notes: visit_notes || null
        });
      
      if (visitError) {
        console.error('⚠️ Erro ao agendar visita (não crítico):', visitError);
      } else {
        console.log('✅ Visita técnica agendada com sucesso');
      }
    }

    // Notificar cliente (mensagem diferente para UPDATE vs INSERT)
    console.log('📧 [Quick Response] Enviando notificação ao cliente...');
    try {
      const amountNum = typeof total_amount === 'number' ? total_amount : parseFloat(String(total_amount).replace(',', '.'));
      
      // Mensagem diferente para atualização vs nova proposta
      const notificationTitle = wasUpdate 
        ? (visit_date ? 'Proposta Atualizada com Visita' : 'Proposta Atualizada')
        : (visit_date ? 'Nova Proposta com Visita Agendada' : 'Nova Proposta Recebida');
      
      let message = wasUpdate
        ? `${supplier_name} ATUALIZOU sua proposta para R$ ${isNaN(amountNum) ? total_amount : amountNum.toFixed(2)} na cotação #${tokenData.quotes?.local_code || tokenData.quote_id}`
        : `${supplier_name} enviou uma proposta de R$ ${isNaN(amountNum) ? total_amount : amountNum.toFixed(2)} para a cotação #${tokenData.quotes?.local_code || tokenData.quote_id}`;
      
      // Adicionar info de visita se agendada
      if (visit_date) {
        const visitDateFormatted = new Date(visit_date).toLocaleDateString('pt-BR');
        message += `. Visita técnica agendada para ${visitDateFormatted}.`;
      }
      
      await supabase.functions.invoke('create-notification', {
        body: {
          client_id: tokenData.client_id,
          title: notificationTitle,
          message: message,
          type: 'proposal',
          priority: 'normal',
          metadata: {
            quote_id: tokenData.quote_id,
            supplier_name: supplier_name,
            amount: total_amount,
            visit_date: visit_date || null,
            is_update: wasUpdate
          }
        }
      });
      console.log('✅ Notificação enviada');
    } catch (notifyError) {
      console.error('⚠️ Erro ao enviar notificação (não crítico):', notifyError);
    }

    console.log('🎉 [Quick Response] Processo concluído com sucesso!');
    console.log('✅ [SUBMIT-QUICK-RESPONSE] Proposta salva:', {
      response_id: response.id,
      quote_id: tokenData.quote_id,
      supplier_id: supplierId,
      supplier_name: supplier_name,
      total_amount: total_amount,
      shipping_cost: shippingCostNum,
      has_visit: !!visit_date
    });
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        response_id: response.id,
        message: 'Proposta enviada com sucesso!'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } }
    );

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});