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
      notes,
      attachment_url 
    } = await req.json();

    console.log('📦 [Quick Response] Dados recebidos:', { 
      token, 
      supplier_name, 
      supplier_email,
      total_amount,
      notes,
      attachment_url 
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

    console.log('🔍 [Quick Response] Buscando token:', token);

    // Buscar token válido (usando short_code)
    const { data: tokenData, error: tokenError } = await supabase
      .from('quote_tokens')
      .select('quote_id, expires_at, client_id')
      .eq('short_code', token)
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
      // Criar novo fornecedor
      const { data: newSupplier, error: supplierError } = await supabase
        .from('suppliers')
        .insert({
          name: supplier_name,
          email: supplier_email,
          status: 'active',
          type: 'local',
          client_id: tokenData.client_id,
          cnpj: '00000000000000' // CNPJ temporário para fornecedores quick response
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

    // Criar resposta da cotação
    console.log('💾 [Quick Response] Criando resposta da cotação...');
    const { data: response, error: responseError } = await supabase
      .from('quote_responses')
      .insert({
        quote_id: tokenData.quote_id,
        supplier_id: supplierId,
        supplier_name: supplier_name,
        total_amount: total_amount,
        notes: notes,
        attachments: attachment_url ? [attachment_url] : null,
        status: 'submitted'
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

    console.log('✅ Resposta criada com sucesso:', response.id);

    // Notificar cliente sobre nova proposta
    console.log('📧 [Quick Response] Enviando notificação ao cliente...');
    try {
      await supabase.functions.invoke('create-notification', {
        body: {
          client_id: tokenData.client_id,
          title: 'Nova Proposta Recebida',
          message: `${supplier_name} enviou uma proposta de R$ ${total_amount.toFixed(2)} para a cotação #${tokenData.quote_id}`,
          type: 'proposal',
          priority: 'normal',
          metadata: {
            quote_id: tokenData.quote_id,
            supplier_name: supplier_name,
            amount: total_amount
          }
        }
      });
      console.log('✅ Notificação enviada');
    } catch (notifyError) {
      console.error('⚠️ Erro ao enviar notificação (não crítico):', notifyError);
    }

    console.log('🎉 [Quick Response] Processo concluído com sucesso!');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        response_id: response.id 
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
